"""
SUTRA GCS — Map and GIS View State
"""

from typing import Dict, Any, List


class MapState:
    """Tracks map zoom, center, active layer, and overlay visibility."""

    def __init__(self):
        self.center_lat: float = 37.774929
        self.center_lon: float = -122.419416
        self.zoom: int = 17
        self.active_layer: str = "dark"
        self.show_breadcrumbs: bool = True
        self.show_sar_targets: bool = True
        self.show_geofence: bool = True
        self.show_fresnel_cone: bool = True


map_state = MapState()
