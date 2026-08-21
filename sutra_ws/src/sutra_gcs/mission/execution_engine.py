"""
SUTRA GCS — Mission Execution Engine
Step-by-step waypoint progression controller.
"""

from typing import List, Dict, Any, Optional
from ..services.event_bus import event_bus


class MissionExecutionEngine:
    """Controls waypoint sequencing and triggers target advancement on 1.8m arrival."""

    def __init__(self, acceptance_radius_m: float = 1.8):
        self.acceptance_radius_m = acceptance_radius_m
        self.waypoints: List[Dict[str, Any]] = []
        self.current_idx: int = 0
        self.is_active: bool = False

    def load_mission(self, waypoints: List[Dict[str, Any]]) -> None:
        self.waypoints = waypoints
        self.current_idx = 0
        self.is_active = True

    def get_current_target(self) -> Optional[Dict[str, Any]]:
        if self.is_active and self.current_idx < len(self.waypoints):
            return self.waypoints[self.current_idx]
        return None

    def advance(self) -> bool:
        if self.current_idx < len(self.waypoints) - 1:
            self.current_idx += 1
            event_bus.publish("WAYPOINT_ADVANCED", {"index": self.current_idx})
            return True
        else:
            self.is_active = False
            event_bus.publish("MISSION_COMPLETED", {})
            return False


execution_engine = MissionExecutionEngine()
