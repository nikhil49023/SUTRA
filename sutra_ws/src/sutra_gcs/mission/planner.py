"""
SUTRA GCS — Mission Planner
Generates survey grid corridors, loiter orbits, and multi-point paths.
"""

from typing import List, Dict, Any
from .models import Waypoint, MissionAction


class MissionPlanner:
    """Generates search corridors and lawmower grid patterns."""

    @staticmethod
    def generate_grid(center_lat: float, center_lon: float, width_m: float = 60.0, height_m: float = 60.0, lanes: int = 4) -> List[Dict[str, Any]]:
        wps = []
        dlat_deg = 1.0 / 111139.0
        dlon_deg = 1.0 / (111139.0 * 0.79)

        start_lat = center_lat - (height_m / 2.0) * dlat_deg
        start_lon = center_lon - (width_m / 2.0) * dlon_deg
        step_lat = (height_m / (lanes - 1)) * dlat_deg if lanes > 1 else 0

        idx = 0
        for i in range(lanes):
            cur_lat = start_lat + i * step_lat
            lon_a = start_lon if (i % 2 == 0) else start_lon + width_m * dlon_deg
            lon_b = start_lon + width_m * dlon_deg if (i % 2 == 0) else start_lon

            wps.append({"index": idx, "lat": cur_lat, "lon": lon_a, "alt": 25.0, "speed": 5.0})
            idx += 1
            wps.append({"index": idx, "lat": cur_lat, "lon": lon_b, "alt": 25.0, "speed": 5.0})
            idx += 1

        return wps


mission_planner = MissionPlanner()
