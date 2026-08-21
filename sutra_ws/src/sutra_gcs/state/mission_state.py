"""
SUTRA GCS — Mission State Store
"""

from typing import List, Dict, Any, Optional


class MissionState:
    """Tracks currently loaded mission, active waypoint index, and progress."""

    def __init__(self):
        self.active_waypoints: List[Dict[str, Any]] = []
        self.current_wp_index: int = 0
        self.is_running: bool = False
        self.progress_pct: float = 0.0
        self.total_distance_m: float = 0.0
        self.estimated_flight_time_sec: float = 0.0

    def set_waypoints(self, wps: List[Dict[str, Any]]) -> None:
        self.active_waypoints = wps
        self.current_wp_index = 0
        self.progress_pct = 0.0

    def clear(self) -> None:
        self.active_waypoints = []
        self.current_wp_index = 0
        self.is_running = False
        self.progress_pct = 0.0


mission_state = MissionState()
