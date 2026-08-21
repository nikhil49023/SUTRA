"""
SUTRA GCS — Mission Timeline & Milestone Tracker
"""

import time
from typing import List, Dict, Any


class MissionTimeline:
    """Calculates leg timestamps and cumulative mission duration."""

    @staticmethod
    def generate_timeline(waypoints: List[Dict[str, Any]], speed_mps: float = 5.0) -> List[Dict[str, Any]]:
        timeline = []
        elapsed = 0.0
        for i, wp in enumerate(waypoints):
            if i > 0:
                elapsed += 12.0  # Approx leg time
            timeline.append({
                "waypoint_index": i,
                "eta_seconds": round(elapsed, 1),
                "eta_time_str": time.strftime("%H:%M:%S", time.localtime(time.time() + elapsed)),
                "action": wp.get("action", "NAVIGATE")
            })
        return timeline


mission_timeline = MissionTimeline()
