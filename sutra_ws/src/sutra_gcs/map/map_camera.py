"""
Smart Horizon GCS — Map Camera Model & Coordinate Transformations
Subsystem: Map Layer
"""

import math
from dataclasses import dataclass
from typing import Optional, Tuple


@dataclass
class MapCamera:
    """
    State of the tactical map viewport camera.
    """

    latitude: float = 37.774929
    longitude: float = -122.419416
    zoom: float = 16.0
    bearing: float = 0.0
    pitch: float = 0.0
    follow_drone: bool = False
    selected_drone_id: Optional[str] = None

    def geo_to_screen(
        self, lat: float, lon: float, width: int, height: int
    ) -> Tuple[float, float]:
        """
        Converts geodetic (lat, lon) coordinates to viewport pixel coordinates (x, y)
        relative to the camera center and zoom level.
        Uses planar Mercator approximation for fast high-rate rendering.
        """
        # Meters per degree
        lat_rad = math.radians(self.latitude)
        meters_per_deg_lat = 111132.954 - 559.822 * math.cos(2 * lat_rad)
        meters_per_deg_lon = 111412.84 * math.cos(lat_rad)

        # Distance in meters from camera center
        dx_m = (lon - self.longitude) * meters_per_deg_lon
        dy_m = (lat - self.latitude) * meters_per_deg_lat

        # Pixels per meter at current zoom (arbitrary base scale where zoom 16 ~ 2 pixels/meter)
        scale = 0.03 * (2.0 ** (self.zoom - 10.0))

        # Viewport coordinates (center is (width / 2, height / 2), y goes downward)
        center_x = width / 2.0
        center_y = height / 2.0

        screen_x = center_x + dx_m * scale
        screen_y = center_y - dy_m * scale

        return screen_x, screen_y

    def screen_to_geo(
        self, screen_x: float, screen_y: float, width: int, height: int
    ) -> Tuple[float, float]:
        """
        Converts screen pixel coordinates (x, y) back to geodetic (lat, lon).
        """
        center_x = width / 2.0
        center_y = height / 2.0

        scale = 0.03 * (2.0 ** (self.zoom - 10.0))
        if scale == 0:
            scale = 1.0

        dx_m = (screen_x - center_x) / scale
        dy_m = -(screen_y - center_y) / scale

        lat_rad = math.radians(self.latitude)
        meters_per_deg_lat = 111132.954 - 559.822 * math.cos(2 * lat_rad)
        meters_per_deg_lon = 111412.84 * math.cos(lat_rad)

        lon = self.longitude + (dx_m / meters_per_deg_lon)
        lat = self.latitude + (dy_m / meters_per_deg_lat)

        return lat, lon
