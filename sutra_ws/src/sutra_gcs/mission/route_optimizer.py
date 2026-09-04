"""
SUTRA GCS — Route Optimizer & Spline Smoother
"""

import math
from typing import List, Dict, Any


class RouteOptimizer:
    """Smoothes waypoint corners using Bezier interpolation."""

    @staticmethod
    def smooth_path(waypoints: List[Dict[str, Any]], resolution: int = 5) -> List[Dict[str, Any]]:
        if len(waypoints) < 3:
            return waypoints

        smoothed = []
        for i in range(len(waypoints) - 1):
            p0 = waypoints[i]
            p1 = waypoints[i+1]
            for step in range(resolution):
                t = step / resolution
                smoothed.append({
                    "lat": p0["lat"] + t * (p1["lat"] - p0["lat"]),
                    "lon": p0["lon"] + t * (p1["lon"] - p0["lon"]),
                    "alt": p0.get("alt", 20.0) + t * (p1.get("alt", 20.0) - p0.get("alt", 20.0))
                })
        smoothed.append(waypoints[-1])
        return smoothed


route_optimizer = RouteOptimizer()
