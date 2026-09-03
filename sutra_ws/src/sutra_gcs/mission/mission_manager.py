"""
Smart Horizon GCS — Centralized Mission Manager & Command Orchestrator
Subsystem: Mission Engine (Phase 3)
"""

import copy
import logging
import time
import uuid
from dataclasses import replace
from pathlib import Path
from typing import Callable, List, Optional, Tuple, Union

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.application_state import ApplicationState, StateStore, get_state_store
from state.mission_state import MissionState as AppMissionState, MissionStateEnum
from .mission_events import MissionEventNames
from .mission_serializer import MissionSerializer
from .mission_statistics import MissionStatistics
from .mission_validator import MissionValidator, ValidationReport
from .models import Mission, MissionStatus
from .route_calculator import RouteCalculator
from .waypoint import AltitudeReference, Waypoint, WaypointCommand

logger = logging.getLogger("sutra_gcs.mission_manager")


class MissionManager:
    """
    Centralized Single-Source-of-Truth Mission Manager.
    Manages waypoint authoring, reordering, validation, undo/redo history, and state store synchronization.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.logger = get_logger("mission_manager")

        # In-memory mission domain aggregate
        self._mission = Mission()
        self._selected_waypoint_id: Optional[str] = None

        # Undo / Redo Command History
        self._history: List[Mission] = []
        self._redo_stack: List[Mission] = []
        self._max_history = 50

        # Sync initial state
        self._sync_to_app_state()

    # ── 1. Mission Lifecycle Operations ──────────────────────────────────────
    def create_mission(
        self,
        name: str = "New Tactical Mission",
        home_lat: float = 37.774929,
        home_lon: float = -122.419416,
    ) -> Mission:
        """Initializes a new empty mission corridor."""
        self._push_history()
        self._mission = Mission(
            mission_id=str(uuid.uuid4()),
            name=name,
            home_latitude=home_lat,
            home_longitude=home_lon,
            waypoints=[],
            status=MissionStatus.EMPTY,
            created_at=time.time(),
            updated_at=time.time(),
        )
        self._selected_waypoint_id = None
        self._sync_to_app_state()

        self.event_bus.emit(
            MissionEventNames.MISSION_CREATED,
            payload={"mission_id": self._mission.mission_id, "name": self._mission.name},
            source="mission_manager",
        )
        return self._mission

    def rename_mission(self, name: str) -> None:
        """Updates the mission name."""
        self._push_history()
        self._mission = replace(self._mission, name=name, updated_at=time.time())
        self._sync_to_app_state()
        self.event_bus.emit(
            MissionEventNames.MISSION_UPDATED,
            payload={"mission_id": self._mission.mission_id, "name": name},
            source="mission_manager",
        )

    def set_home(self, lat: float, lon: float) -> None:
        """Sets the mission home/launch position."""
        self._push_history()
        self._mission = replace(
            self._mission, home_latitude=lat, home_longitude=lon, updated_at=time.time()
        )
        self._sync_to_app_state()
        self.event_bus.emit(
            MissionEventNames.MISSION_UPDATED,
            payload={"home_lat": lat, "home_lon": lon},
            source="mission_manager",
        )

    # ── 2. Waypoint Authoring & Manipulation ────────────────────────────────
    def add_waypoint(
        self,
        latitude: float,
        longitude: float,
        altitude: float = 25.0,
        speed: float = 5.0,
        command: WaypointCommand = WaypointCommand.WAYPOINT,
        hold_time: float = 0.0,
        acceptance_radius: float = 1.8,
    ) -> Waypoint:
        """Appends a new waypoint to the mission."""
        self._push_history()

        new_index = len(self._mission.waypoints) + 1
        wp = Waypoint(
            id=str(uuid.uuid4()),
            index=new_index,
            latitude=latitude,
            longitude=longitude,
            altitude=altitude,
            speed=speed,
            command=command,
            hold_time=hold_time,
            acceptance_radius=acceptance_radius,
        )

        new_wps = list(self._mission.waypoints) + [wp]
        self._mission = replace(
            self._mission,
            waypoints=new_wps,
            status=MissionStatus.PLANNING,
            updated_at=time.time(),
        )
        self._selected_waypoint_id = wp.id
        self._sync_to_app_state()

        self.event_bus.emit(
            MissionEventNames.MISSION_WAYPOINT_ADDED,
            payload={"waypoint_id": wp.id, "index": wp.index, "lat": latitude, "lon": longitude},
            source="mission_manager",
        )
        return wp

    def insert_waypoint(self, index: int, wp: Waypoint) -> None:
        """Inserts a waypoint at a specific 1-indexed position."""
        self._push_history()

        wps = list(self._mission.waypoints)
        insert_pos = max(0, min(index - 1, len(wps)))
        wps.insert(insert_pos, wp)

        # Re-index
        reindexed_wps = [replace(w, index=i + 1) for i, w in enumerate(wps)]
        self._mission = replace(
            self._mission, waypoints=reindexed_wps, updated_at=time.time()
        )
        self._selected_waypoint_id = wp.id
        self._sync_to_app_state()

        self.event_bus.emit(
            MissionEventNames.MISSION_WAYPOINT_ADDED,
            payload={"waypoint_id": wp.id, "index": index},
            source="mission_manager",
        )

    def move_waypoint(self, wp_id_or_index: Union[str, int], latitude: float, longitude: float) -> Optional[Waypoint]:
        """Updates the geodetic coordinates of a waypoint."""
        wp = self._find_waypoint(wp_id_or_index)
        if not wp:
            return None

        self._push_history()

        new_wps = [
            replace(w, latitude=latitude, longitude=longitude) if w.id == wp.id else w
            for w in self._mission.waypoints
        ]
        self._mission = replace(self._mission, waypoints=new_wps, updated_at=time.time())
        self._sync_to_app_state()

        self.event_bus.emit(
            MissionEventNames.MISSION_WAYPOINT_MOVED,
            payload={"waypoint_id": wp.id, "index": wp.index, "lat": latitude, "lon": longitude},
            source="mission_manager",
        )
        return self._find_waypoint(wp.id)

    def update_waypoint(self, wp_id_or_index: Union[str, int], **kwargs) -> Optional[Waypoint]:
        """Modifies attributes of an existing waypoint."""
        wp = self._find_waypoint(wp_id_or_index)
        if not wp:
            return None

        self._push_history()

        new_wps = [
            replace(w, **kwargs) if w.id == wp.id else w
            for w in self._mission.waypoints
        ]
        self._mission = replace(self._mission, waypoints=new_wps, updated_at=time.time())
        self._sync_to_app_state()

        self.event_bus.emit(
            MissionEventNames.MISSION_WAYPOINT_UPDATED,
            payload={"waypoint_id": wp.id, "index": wp.index, "updates": kwargs},
            source="mission_manager",
        )
        return self._find_waypoint(wp.id)

    def delete_waypoint(self, wp_id_or_index: Union[str, int]) -> bool:
        """Deletes a waypoint and automatically re-indexes remaining waypoints."""
        wp = self._find_waypoint(wp_id_or_index)
        if not wp:
            return False

        self._push_history()

        remaining_wps = [w for w in self._mission.waypoints if w.id != wp.id]
        reindexed_wps = [replace(w, index=i + 1) for i, w in enumerate(remaining_wps)]

        new_status = MissionStatus.EMPTY if not reindexed_wps else MissionStatus.PLANNING
        self._mission = replace(
            self._mission, waypoints=reindexed_wps, status=new_status, updated_at=time.time()
        )

        if self._selected_waypoint_id == wp.id:
            self._selected_waypoint_id = reindexed_wps[0].id if reindexed_wps else None

        self._sync_to_app_state()

        self.event_bus.emit(
            MissionEventNames.MISSION_WAYPOINT_DELETED,
            payload={"waypoint_id": wp.id, "index": wp.index},
            source="mission_manager",
        )
        return True

    def reorder_waypoint(self, from_index: int, to_index: int) -> bool:
        """Moves a waypoint from one position index to another."""
        wps = list(self._mission.waypoints)
        if not (1 <= from_index <= len(wps) and 1 <= to_index <= len(wps)):
            return False

        self._push_history()

        item = wps.pop(from_index - 1)
        wps.insert(to_index - 1, item)

        reindexed_wps = [replace(w, index=i + 1) for i, w in enumerate(wps)]
        self._mission = replace(
            self._mission, waypoints=reindexed_wps, updated_at=time.time()
        )
        self._sync_to_app_state()

        self.event_bus.emit(
            MissionEventNames.MISSION_WAYPOINT_REORDERED,
            payload={"from_index": from_index, "to_index": to_index},
            source="mission_manager",
        )
        return True

    def clear_waypoints(self) -> None:
        """Clears all waypoints from the active mission."""
        self._push_history()
        self._mission = replace(
            self._mission,
            waypoints=[],
            status=MissionStatus.EMPTY,
            updated_at=time.time(),
        )
        self._selected_waypoint_id = None
        self._sync_to_app_state()

        self.event_bus.emit(
            MissionEventNames.MISSION_CLEARED,
            payload={"mission_id": self._mission.mission_id},
            source="mission_manager",
        )

    # ── 3. Selection & Inspection ───────────────────────────────────────────
    def select_waypoint(self, wp_id_or_index: Optional[Union[str, int]]) -> Optional[Waypoint]:
        """Selects an active waypoint for editing and inspection."""
        if wp_id_or_index is None:
            self._selected_waypoint_id = None
            self._sync_to_app_state()
            return None

        wp = self._find_waypoint(wp_id_or_index)
        if wp:
            self._selected_waypoint_id = wp.id
            self._sync_to_app_state()
            self.event_bus.emit(
                MissionEventNames.MISSION_WAYPOINT_SELECTED,
                payload={"waypoint_id": wp.id, "index": wp.index},
                source="mission_manager",
            )
            return wp
        return None

    def get_selected_waypoint(self) -> Optional[Waypoint]:
        """Returns the currently selected waypoint, if any."""
        if not self._selected_waypoint_id:
            return None
        return self._find_waypoint(self._selected_waypoint_id)

    # ── 4. Queries & Validation ─────────────────────────────────────────────
    def get_mission(self) -> Mission:
        """Returns the active Mission domain model."""
        return self._mission

    def get_waypoints(self) -> List[Waypoint]:
        """Returns the list of waypoints."""
        return list(self._mission.waypoints)

    def validate_mission(self) -> ValidationReport:
        """Executes pre-flight rules and updates validation status."""
        self.event_bus.emit(MissionEventNames.MISSION_VALIDATION_STARTED, source="mission_manager")
        report = MissionValidator.validate(self._mission)

        new_status = MissionStatus.READY if report.valid else MissionStatus.INVALID
        self._mission = replace(self._mission, status=new_status, updated_at=time.time())
        self._sync_to_app_state()

        self.event_bus.emit(
            MissionEventNames.MISSION_VALIDATION_COMPLETED,
            payload={"valid": report.valid, "errors": report.errors, "warnings": report.warnings},
            source="mission_manager",
        )
        return report

    def get_statistics(self) -> MissionStatistics:
        """Calculates real-time flight metrics for the mission."""
        return MissionStatistics.calculate(self._mission)

    # ── 5. Undo / Redo System ───────────────────────────────────────────────
    def _push_history(self) -> None:
        self._history.append(copy.deepcopy(self._mission))
        if len(self._history) > self._max_history:
            self._history.pop(0)
        self._redo_stack.clear()

    def undo(self) -> bool:
        """Reverts the last mission edit."""
        if not self._history:
            return False

        self._redo_stack.append(copy.deepcopy(self._mission))
        self._mission = self._history.pop()
        self._sync_to_app_state()

        self.event_bus.emit(MissionEventNames.MISSION_UPDATED, source="mission_manager_undo")
        return True

    def redo(self) -> bool:
        """Restores a previously undone mission edit."""
        if not self._redo_stack:
            return False

        self._history.append(copy.deepcopy(self._mission))
        self._mission = self._redo_stack.pop()
        self._sync_to_app_state()

        self.event_bus.emit(MissionEventNames.MISSION_UPDATED, source="mission_manager_redo")
        return True

    # ── 6. Persistence & State Sync ─────────────────────────────────────────
    def save_mission(self, filepath: Optional[Path] = None) -> Path:
        """Saves active mission to disk."""
        saved_path = MissionSerializer.save_to_file(self._mission, filepath)
        self.event_bus.emit(
            MissionEventNames.MISSION_SAVED,
            payload={"filepath": str(saved_path)},
            source="mission_manager",
        )
        return saved_path

    def load_mission(self, filepath: Path) -> Mission:
        """Loads mission from disk and synchronizes state."""
        self._push_history()
        self._mission = MissionSerializer.load_from_file(filepath)
        self._selected_waypoint_id = (
            self._mission.waypoints[0].id if self._mission.waypoints else None
        )
        self._sync_to_app_state()

        self.event_bus.emit(
            MissionEventNames.MISSION_LOADED,
            payload={"mission_id": self._mission.mission_id, "name": self._mission.name},
            source="mission_manager",
        )
        return self._mission

    def clear_mission(self) -> None:
        """Resets the mission planner."""
        self.create_mission()

    def _find_waypoint(self, wp_id_or_index: Union[str, int]) -> Optional[Waypoint]:
        if isinstance(wp_id_or_index, int):
            for wp in self._mission.waypoints:
                if wp.index == wp_id_or_index:
                    return wp
            return None
        for wp in self._mission.waypoints:
            if wp.id == str(wp_id_or_index):
                return wp
        return None

    def start_mission(self) -> None:
        """Transitions mission status to RUNNING."""
        self._mission = replace(self._mission, status=MissionStatus.RUNNING, active_waypoint=1, updated_at=time.time())
        self._sync_to_app_state()

    def pause_mission(self) -> None:
        """Transitions mission status to HOLD."""
        self._mission = replace(self._mission, status=MissionStatus.HOLD, updated_at=time.time())
        self._sync_to_app_state()

    def resume_mission(self) -> None:
        """Resumes mission execution in status RUNNING."""
        self._mission = replace(self._mission, status=MissionStatus.RUNNING, updated_at=time.time())
        self._sync_to_app_state()

    def abort_mission(self) -> None:
        """Aborts mission with RTL."""
        self._mission = replace(self._mission, status=MissionStatus.RTL, updated_at=time.time())
        self._sync_to_app_state()

    def complete_mission(self) -> None:
        """Marks mission as COMPLETED."""
        self._mission = replace(self._mission, status=MissionStatus.COMPLETED, updated_at=time.time())
        self._sync_to_app_state()

    def set_active_waypoint(self, index: int) -> None:
        """Updates the active target waypoint index."""
        self._mission = replace(self._mission, active_waypoint=index, updated_at=time.time())
        self._sync_to_app_state()

    def _sync_to_app_state(self) -> None:
        """Pushes current mission model to the centralized StateStore."""
        stats = self.get_statistics()
        status_map = {
            MissionStatus.RUNNING: MissionStateEnum.MISSION,
            MissionStatus.HOLD: MissionStateEnum.HOLD,
            MissionStatus.RTL: MissionStateEnum.RTL,
            MissionStatus.COMPLETED: MissionStateEnum.COMPLETE,
            MissionStatus.READY: MissionStateEnum.READY,
            MissionStatus.PLANNING: MissionStateEnum.PLANNING,
            MissionStatus.EMPTY: MissionStateEnum.IDLE,
            MissionStatus.INVALID: MissionStateEnum.PLANNING,
            MissionStatus.VALIDATING: MissionStateEnum.VALIDATING,
            MissionStatus.ABORTED: MissionStateEnum.ABORTED,
        }
        state_enum = status_map.get(self._mission.status, MissionStateEnum.PLANNING if self._mission.waypoints else MissionStateEnum.IDLE)

        # Read current progress from state store if active
        cur_progress = 0.0
        cur_dist_rem = stats.total_distance_m
        cur_eta = stats.estimated_flight_time_sec
        try:
            existing_state = self.state_store.get_state().mission_state
            if existing_state and existing_state.state in (MissionStateEnum.MISSION, MissionStateEnum.HOLD, MissionStateEnum.RTL):
                cur_progress = existing_state.mission_progress
                cur_dist_rem = existing_state.distance_remaining
                cur_eta = existing_state.estimated_time_remaining
        except Exception:
            pass

        self.state_store.update_state(
            lambda app_state: replace(
                app_state,
                mission_state=AppMissionState(
                    mission_id=self._mission.mission_id,
                    mission_name=self._mission.name,
                    state=state_enum,
                    waypoints=self._mission.waypoints,
                    home_latitude=self._mission.home_latitude,
                    home_longitude=self._mission.home_longitude,
                    selected_waypoint_id=self._selected_waypoint_id,
                    active_waypoint_index=self._mission.active_waypoint,
                    mission_progress=cur_progress,
                    distance_remaining=cur_dist_rem,
                    estimated_time_remaining=cur_eta,
                    estimated_battery_required=stats.estimated_battery_drain_pct,
                    risk_level="LOW" if stats.total_distance_m < 5000 else "MEDIUM",
                    validation_status=self._mission.status.value,
                ),
            )
        )


# Global singleton
_global_mission_manager: Optional[MissionManager] = None


def get_mission_manager() -> MissionManager:
    """Returns global MissionManager singleton."""
    global _global_mission_manager
    if _global_mission_manager is None:
        _global_mission_manager = MissionManager()
    return _global_mission_manager
