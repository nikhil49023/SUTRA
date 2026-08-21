"""
SUTRA GCS — Waypoint Map Renderer
"""

from typing import List, Dict, Any


class WaypointMapRenderer:
    """Renders tactical numbered waypoint circles with altitude pills."""

    @staticmethod
    def format_markers(waypoints: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [
            {
                "index": i,
                "lat": wp["lat"],
                "lon": wp["lon"],
                "alt": wp.get("alt", 20.0),
                "label": f"WP{i+1}"
            }
            for i, wp in enumerate(waypoints)
        ]


waypoint_map_renderer = WaypointMapRenderer()
