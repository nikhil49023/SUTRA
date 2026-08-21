"""
SUTRA GCS — Map Widget Controller
"""

from typing import Dict, Any, List


class MapWidget:
    """Manages GIS map configuration and viewport bounds."""

    def __init__(self, default_lat: float = 37.774929, default_lon: float = -122.419416, default_zoom: int = 17):
        self.default_lat = default_lat
        self.default_lon = default_lon
        self.default_zoom = default_zoom

    def get_config(self) -> Dict[str, Any]:
        return {
            "center": [self.default_lat, self.default_lon],
            "zoom": self.default_zoom,
            "min_zoom": 4,
            "max_zoom": 20
        }


map_widget = MapWidget()
