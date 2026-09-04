"""
Smart Horizon GCS — Swarm Leader-Follower Dynamic Tracking Controller
Subsystem: Swarm Fleet Management (Phase 6)
"""

from typing import Optional

from services.event_bus import EventBus, get_event_bus
from state.application_state import StateStore, get_state_store

from .formation_engine import FormationEngine, get_formation_engine


class LeaderFollowerController:
    """
    Monitors swarm leader kinematic movement and updates relative follower target coordinates in real time.
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

        # Listen for telemetry or state updates
        self.event_bus.subscribe("telemetry.updated", self._on_telemetry_updated)

    def _on_telemetry_updated(self, event) -> None:
        """When leader telemetry updates, refresh follower target coordinates."""
        fleet = self.state_store.get_state().fleet_state
        if len(fleet.drones) > 1:
            self.formation_engine.recalculate_followers()


# Global singleton
_global_leader_follower: Optional[LeaderFollowerController] = None


def get_leader_follower_controller() -> LeaderFollowerController:
    global _global_leader_follower
    if _global_leader_follower is None:
        _global_leader_follower = LeaderFollowerController()
    return _global_leader_follower
