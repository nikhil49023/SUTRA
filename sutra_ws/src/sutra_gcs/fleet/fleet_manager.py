"""
Smart Horizon GCS — Swarm Fleet Management & Lifecycle Registry
Subsystem: Swarm Fleet Management (Phase 6)
"""

import logging
from dataclasses import replace
from typing import Dict, List, Optional

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.application_state import ApplicationState, StateStore, get_state_store
from state.fleet_state import DroneRole, DroneState, FleetState

from .formation_engine import FormationEngine, get_formation_engine

logger = logging.getLogger("sutra_gcs.fleet_manager")


class FleetManager:
    """
    Centralized controller for multi-UAV swarm registry, drone addition/removal,
    leader designation, and formation state lifecycle.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
        formation_engine: Optional[FormationEngine] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.formation_engine = formation_engine or get_formation_engine()
        self.logger = get_logger("fleet_manager")

        # Initialize default 4-drone fleet if empty
        if not self.state_store.get_state().fleet_state.drones:
            self.seed_default_fleet()

    def register_drone(
        self,
        drone_id: str,
        callsign: str,
        role: str = "WINGMAN",
        latitude: float = 37.774929,
        longitude: float = -122.419416,
        altitude: float = 25.0,
        heading: float = 0.0,
        battery: float = 100.0,
        is_leader: bool = False,
    ) -> DroneState:
        """Adds a new drone to the swarm fleet and recalculates active formation."""
        drone = DroneState(
            drone_id=drone_id,
            callsign=callsign,
            role=role,
            latitude=latitude,
            longitude=longitude,
            altitude=altitude,
            heading=heading,
            battery=battery,
            is_leader=is_leader,
        )

        self.state_store.update_state(
            lambda s: replace(s, fleet_state=s.fleet_state.add_drone(drone))
        )

        self.formation_engine.recalculate_followers()

        self.event_bus.emit(
            "fleet.drone_added",
            payload={"drone_id": drone_id, "callsign": callsign, "role": role},
            source="fleet_manager",
        )
        return drone

    def remove_drone(self, drone_id: str) -> bool:
        """Removes a drone from the swarm fleet."""
        fleet = self.state_store.get_state().fleet_state
        if drone_id not in fleet.drones:
            return False

        drone = fleet.drones[drone_id]
        self.state_store.update_state(
            lambda s: replace(s, fleet_state=s.fleet_state.remove_drone(drone_id))
        )

        self.formation_engine.recalculate_followers()

        self.event_bus.emit(
            "fleet.drone_removed",
            payload={"drone_id": drone_id, "callsign": drone.callsign},
            source="fleet_manager",
        )
        return True

    def set_leader(self, drone_id: str) -> bool:
        """Promotes a drone to swarm leader."""
        fleet = self.state_store.get_state().fleet_state
        if drone_id not in fleet.drones:
            return False

        self.formation_engine.change_leader(drone_id)
        return True

    def get_drone(self, drone_id: str) -> Optional[DroneState]:
        """Returns the drone state for the specified ID."""
        return self.state_store.get_state().fleet_state.get_drone(drone_id)

    def get_all_drones(self) -> List[DroneState]:
        """Returns all drones in the swarm."""
        return self.state_store.get_state().fleet_state.get_all_drones()

    def get_leader(self) -> Optional[DroneState]:
        """Returns current swarm leader drone."""
        return self.state_store.get_state().fleet_state.get_leader()

    def get_followers(self) -> List[DroneState]:
        """Returns all follower drones."""
        return self.state_store.get_state().fleet_state.get_followers()

    def seed_default_fleet(
        self, origin_lat: float = 37.774929, origin_lon: float = -122.419416, origin_alt: float = 25.0
    ) -> None:
        """Populates initial tactical 4-drone swarm (Alpha, Bravo, Charlie, Delta)."""
        drones = {
            "drone_alpha": DroneState(
                drone_id="drone_alpha",
                callsign="ALPHA (LEADER)",
                role="LEADER",
                latitude=origin_lat,
                longitude=origin_lon,
                altitude=origin_alt,
                heading=0.0,
                battery=100.0,
                is_leader=True,
                formation_index=0,
            ),
            "drone_bravo": DroneState(
                drone_id="drone_bravo",
                callsign="BRAVO (WINGMAN)",
                role="WINGMAN",
                latitude=origin_lat,
                longitude=origin_lon,
                altitude=origin_alt,
                heading=0.0,
                battery=96.0,
                is_leader=False,
                formation_index=1,
            ),
            "drone_charlie": DroneState(
                drone_id="drone_charlie",
                callsign="CHARLIE (SCOUT)",
                role="SCOUT",
                latitude=origin_lat,
                longitude=origin_lon,
                altitude=origin_alt,
                heading=0.0,
                battery=94.0,
                is_leader=False,
                formation_index=2,
            ),
            "drone_delta": DroneState(
                drone_id="drone_delta",
                callsign="DELTA (SUPPORT)",
                role="SUPPORT",
                latitude=origin_lat,
                longitude=origin_lon,
                altitude=origin_alt,
                heading=0.0,
                battery=91.0,
                is_leader=False,
                formation_index=3,
            ),
        }

        self.state_store.update_state(
            lambda s: replace(
                s,
                fleet_state=replace(
                    s.fleet_state,
                    drones=drones,
                    leader_id="drone_alpha",
                    formation="V_FORMATION",
                    spacing=25.0,
                ),
            )
        )

        self.formation_engine.apply_formation("V_FORMATION", 25.0)


# Global singleton
_global_fleet_manager: Optional[FleetManager] = None


def get_fleet_manager() -> FleetManager:
    """Returns global FleetManager singleton."""
    global _global_fleet_manager
    if _global_fleet_manager is None:
        _global_fleet_manager = FleetManager()
    return _global_fleet_manager


# Backward compatibility singleton
fleet_manager = get_fleet_manager()
