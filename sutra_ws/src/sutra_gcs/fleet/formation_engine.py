"""
Smart Horizon GCS — Swarm Formation Management & Target Trajectory Engine
Subsystem: Swarm Fleet Management (Phase 12 Hardening)
"""

import logging
import math
from dataclasses import replace
from typing import Any, Dict, List, Optional

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
    validation, and state store synchronization for swarm operations.
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

        targets = FormationCalculator.calculate_targets(
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

        return targets

    def apply_formation(
        self,
        formation_type: str,
        spacing_m: Optional[float] = None,
        follow_leader_heading: bool = True,
    ) -> bool:
        """
        Applies a new formation geometry to the fleet and recalculates target setpoints for EVERY drone.
        """
        fleet = self.state_store.get_state().fleet_state
        drone_count = len(fleet.drones)
        self.logger.info(
            f"🎯 FORMATION SELECTED formation={formation_type} drone_count={drone_count} spacing={spacing_m or fleet.spacing}m"
        )

        # 1. Update FleetState parameters
        self.state_store.update_state(
            lambda s: replace(
                s,
                fleet_state=s.fleet_state.set_formation(formation_type)
                .set_follow_leader_heading(follow_leader_heading)
                .set_spacing(spacing_m if spacing_m is not None else s.fleet_state.spacing),
            )
        )

        # 2. Recalculate target positions for ALL drones
        targets = self.calculate_targets()

        # Log every assignment
        for d_id, target in targets.items():
            drone = fleet.drones.get(d_id)
            role = "LEADER" if drone and drone.is_leader else (drone.role if drone else "WINGMAN")
            self.logger.info(
                f"   ASSIGNMENT: id={d_id} role={role} offset=({target.offset_x:.1f}m, {target.offset_y:.1f}m) target=({target.latitude:.6f}, {target.longitude:.6f})"
            )

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

    def recalculate_followers(self) -> Dict[str, TargetPosition]:
        """Recomputes all follower target positions based on updated leader position."""
        targets = self.calculate_targets()
        self._apply_targets_to_state(targets)
        return targets

    def validate_formation_targets(self) -> Dict[str, Any]:
        """
        Diagnostic function to validate that 100% of active drones have valid, unique formation targets.
        """
        fleet = self.state_store.get_state().fleet_state
        targets = self.calculate_targets()
        drone_ids = list(fleet.drones.keys())
        
        missing_targets = [d_id for d_id in drone_ids if d_id not in targets]
        assigned_count = len(targets)
        
        # Check duplicate target coordinates
        coords_seen = set()
        duplicate_count = 0
        for target in targets.values():
            coord_key = (round(target.latitude, 6), round(target.longitude, 6))
            if coord_key in coords_seen:
                duplicate_count += 1
            coords_seen.add(coord_key)

        is_valid = len(missing_targets) == 0 and duplicate_count == 0 and assigned_count == len(drone_ids)

        return {
            "formation": fleet.formation,
            "drone_count": len(drone_ids),
            "assigned_count": assigned_count,
            "missing_targets": missing_targets,
            "duplicate_targets": duplicate_count,
            "status": "VALID" if is_valid else "INVALID",
        }

    def calculate_formation_integrity(self) -> Dict[str, Any]:
        """
        Calculates distance from each drone's current position to its formation target position,
        and derives an overall swarm formation integrity percentage.
        """
        from mission.route_calculator import RouteCalculator
        fleet = self.state_store.get_state().fleet_state
        deviations = {}
        total_dev = 0.0

        for d_id, drone in fleet.drones.items():
            if drone.target_latitude and drone.target_longitude:
                dist = RouteCalculator.calculate_distance(
                    drone.latitude, drone.longitude, drone.target_latitude, drone.target_longitude
                )
                deviations[d_id] = dist
                total_dev += dist
            else:
                deviations[d_id] = 0.0

        avg_dev = total_dev / max(1, len(fleet.drones))
        # Integrity: 100% when within 1m, decays linearly with deviation
        integrity_pct = max(0.0, min(100.0, 100.0 - (avg_dev * 5.0)))

        return {
            "deviations_m": deviations,
            "average_deviation_m": avg_dev,
            "integrity_percent": round(integrity_pct, 1),
        }

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


# Global singleton
_global_formation_engine: Optional[FormationEngine] = None


def get_formation_engine() -> FormationEngine:
    """Returns global FormationEngine singleton."""
    global _global_formation_engine
    if _global_formation_engine is None:
        _global_formation_engine = FormationEngine()
    return _global_formation_engine
