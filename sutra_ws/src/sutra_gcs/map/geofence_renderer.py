"""
SUTRA GCS — Geofence Overlay Map Renderer
"""

from typing import Dict, Any


class GeofenceMapRenderer:
    """Renders 500m circular inclusion boundaries and danger polygons on Leaflet."""

    @staticmethod
    def get_circle_render(center_lat: float, center_lon: float, radius_m: float = 500.0) -> Dict[str, Any]:
        return {
            "center": [center_lat, center_lon],
            "radius_m": radius_m,
            "color": "#ef4444",
            "fill_opacity": 0.08,
            "weight": 2,
            "dash_array": "5, 5"
        }


geofence_map_renderer = GeofenceMapRenderer()
