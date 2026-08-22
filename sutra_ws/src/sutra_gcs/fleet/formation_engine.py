"""
Smart Horizon GCS — Swarm Formation Management & Target Trajectory Engine
Subsystem: Swarm Fleet Management (Phase 6)
"""

import logging
from dataclasses import replace
from typing import Dict, List, Optional

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.application_state import ApplicationState, StateStore, get_state_store
from state.fleet_state import DroneState, FleetState

from .formation_calculator import FormationCalculator
from .models import TargetPosition

logger = logging.getLogger("sutra_gcs.formation_engine")


class FormationEngine:
    """
    Coordinates multi-UAV formation geometry, target setpoint recalculation,
    and state store synchronization for swarm operations.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.logger = get_logger("formation_engine")

    def calculate_targets(self) -> Dict[str, TargetPosition]:
        """
        Calculates geodetic target setpoints for every drone based on active leader and formation.
        """
        fleet = self.state_store.get_state().fleet_state
        leader = fleet.get_leader()
        if not leader:
            return {}

        all_drone_ids = list(fleet.drones.keys())
        formation_heading = (
            None if fleet.follow_leader_heading else fleet.formation_heading
        )

        return FormationCalculator.calculate_targets(
            leader_id=leader.drone_id,
            leader_lat=leader.latitude,
            leader_lon=leader.longitude,
            leader_alt=leader.altitude,
            leader_heading=leader.heading,
            drone_ids=all_drone_ids,
            formation_type=fleet.formation,
            spacing_m=fleet.spacing,
            formation_heading=formation_heading,
        )

    def apply_formation(
        self,
        formation_type: str,
        spacing_m: Optional[float] = None,
        follow_leader_heading: bool = True,
    ) -> bool:
        """
        Applies a new formation geometry to the fleet and recalculates target setpoints.
        """
        self.logger.info(f"Applying Formation: {formation_type} (Spacing: {spacing_m}m)")

        # 1. Update FleetState parameters
        self.state_store.update_state(
            lambda s: replace(
                s,
                fleet_state=s.fleet_state.set_formation(formation_type)
                .set_follow_leader_heading(follow_leader_heading)
                .set_spacing(spacing_m if spacing_m is not None else s.fleet_state.spacing),
            )
        )

        # 2. Recalculate target positions
        targets = self.calculate_targets()

        # 3. Update target lat/lon/alt and offsets in StateStore
        self._apply_targets_to_state(targets)

        # 4. Emit Events
        self.event_bus.emit(
            "fleet.formation_changed",
            payload={
                "formation": formation_type,
                "spacing": spacing_m or self.state_store.get_state().fleet_state.spacing,
                "target_count": len(targets),
            },
            source="formation_engine",
        )
        return True

    def change_spacing(self, spacing_m: float) -> None:
        """Updates inter-UAV formation spacing in meters."""
        self.state_store.update_state(
            lambda s: replace(s, fleet_state=s.fleet_state.set_spacing(spacing_m))
        )
        targets = self.calculate_targets()
        self._apply_targets_to_state(targets)
        self.event_bus.emit(
            "fleet.spacing_changed",
            payload={"spacing": spacing_m},
            source="formation_engine",
        )

    def change_leader(self, leader_id: str) -> None:
        """Promotes a drone to leader and re-anchors the formation origin."""
        self.state_store.update_state(
            lambda s: replace(s, fleet_state=s.fleet_state.set_leader(leader_id))
        )
        targets = self.calculate_targets()
        self._apply_targets_to_state(targets)
        self.event_bus.emit(
            "fleet.leader_changed",
            payload={"leader_id": leader_id},
            source="formation_engine",
        )

    def recalculate_followers(self) -> None:
        """Recomputes all follower target positions based on updated leader position."""
        targets = self.calculate_targets()
        self._apply_targets_to_state(targets)

    def _apply_targets_to_state(self, targets: Dict[str, TargetPosition]) -> None:
        """Updates target_latitude, target_longitude, offset_x, offset_y for each drone."""
        def updater(s: ApplicationState) -> ApplicationState:
            fleet = s.fleet_state
            new_drones = dict(fleet.drones)
            for d_id, target in targets.items():
                if d_id in new_drones:
                    new_drones[d_id] = replace(
                        new_drones[d_id],
                        target_latitude=target.latitude,
                        target_longitude=target.longitude,
                        target_altitude=target.altitude,
                        target_heading=target.heading,
                        formation_index=target.formation_index,
                        offset_x=target.offset_x,
                        offset_y=target.offset_y,
                    )
            return replace(s, fleet_state=replace(fleet, drones=new_drones))

        self.state_store.update_state(updater)
        self.event_bus.emit(
            "fleet.formation_targets_updated",
            payload={"targets": len(targets)},
            source="formation_engine",
        )


# Global singleton
_global_formation_engine: Optional[FormationEngine] = None


def get_formation_engine() -> FormationEngine:
    """Returns global FormationEngine singleton."""
    global _global_formation_engine
    if _global_formation_engine is None:
        _global_formation_engine = FormationEngine()
    return _global_formation_engine
