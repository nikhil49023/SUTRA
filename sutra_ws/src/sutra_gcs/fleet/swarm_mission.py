"""
Smart Horizon GCS — Multi-Drone Swarm Mission Synchronizer
Subsystem: Swarm Fleet Management (Phase 6)
"""

from typing import Optional

from services.event_bus import EventBus, get_event_bus
from state.application_state import StateStore, get_state_store

from .formation_engine import FormationEngine, get_formation_engine


class SwarmMissionCoordinator:
    """
    Coordinates simultaneous multi-drone autonomous mission execution,
    guaranteeing that follower aircraft maintain tight tactical formation offsets
    around the lead drone along the mission trajectory.
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

        # Listen for mission flight ticks and dynamic route changes
        self.event_bus.subscribe("mission.execution_updated", self._on_mission_tick)
        self.event_bus.subscribe("mission.waypoint_reached", self._on_waypoint_reached)

    def _on_mission_tick(self, event) -> None:
        self.formation_engine.recalculate_followers()

    def _on_waypoint_reached(self, event) -> None:
        self.formation_engine.recalculate_followers()


# Global singleton
_global_swarm_mission: Optional[SwarmMissionCoordinator] = None


def get_swarm_mission_coordinator() -> SwarmMissionCoordinator:
    global _global_swarm_mission
    if _global_swarm_mission is None:
        _global_swarm_mission = SwarmMissionCoordinator()
    return _global_swarm_mission
