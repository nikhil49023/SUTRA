"""
SUTRA GCS — Route & Breadcrumb Trail Renderer
"""

from typing import List, Dict, Any


class RouteMapRenderer:
    """Renders mission polylines and real-time breadcrumb tracks."""

    @staticmethod
    def format_polyline(waypoints: List[Dict[str, Any]]) -> List[List[float]]:
        return [[wp["lat"], wp["lon"]] for wp in waypoints]


route_map_renderer = RouteMapRenderer()
