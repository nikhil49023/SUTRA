"""
Smart Horizon GCS — Geodetic Route & Distance Calculator
Subsystem: Mission Engine (Phase 3)
"""

import math
from typing import List, Optional, Tuple, Union

from .waypoint import Waypoint


class RouteCalculator:
    """
    High-precision geodesic route distance and bearing calculation engine.
    Uses Haversine and spherical trigonometry.
    """

    EARTH_RADIUS_M: float = 6371000.0

    @classmethod
    def calculate_distance(
        cls,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:
        """
        Computes great-circle distance in meters between two geodetic coordinates using Haversine formula.
        """
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return cls.EARTH_RADIUS_M * c

    @classmethod
    def calculate_bearing(
        cls,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:
        """
        Computes forward azimuth/bearing in degrees (0° - 360°) from point 1 to point 2.
        """
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_lambda = math.radians(lon2 - lon1)

        y = math.sin(delta_lambda) * math.cos(phi2)
        x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)

        bearing_rad = math.atan2(y, x)
        bearing_deg = (math.degrees(bearing_rad) + 360.0) % 360.0
        return bearing_deg

    @classmethod
    def calculate_total_distance(
        cls,
        waypoints: List[Waypoint],
        home_lat: Optional[float] = None,
        home_lon: Optional[float] = None,
    ) -> float:
        """
        Calculates cumulative path distance in meters through all waypoints,
        optionally starting from home position.
        """
        if not waypoints:
            return 0.0

        total_m = 0.0
        points: List[Tuple[float, float]] = []

        if home_lat is not None and home_lon is not None:
            points.append((home_lat, home_lon))

        for wp in waypoints:
            points.append((wp.latitude, wp.longitude))

        for i in range(len(points) - 1):
            total_m += cls.calculate_distance(
                points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]
            )

        return total_m

    @classmethod
    def calculate_segment_distances(
        cls,
        waypoints: List[Waypoint],
        home_lat: Optional[float] = None,
        home_lon: Optional[float] = None,
    ) -> List[float]:
        """
        Returns list of segment distances in meters between consecutive waypoints.
        """
        if not waypoints:
            return []

        segments: List[float] = []
        prev_lat = home_lat if home_lat is not None else waypoints[0].latitude
        prev_lon = home_lon if home_lon is not None else waypoints[0].longitude

        for wp in waypoints:
            dist = cls.calculate_distance(prev_lat, prev_lon, wp.latitude, wp.longitude)
            segments.append(dist)
            prev_lat = wp.latitude
            prev_lon = wp.longitude

        return segments

    @classmethod
    def calculate_distance_remaining(
        cls,
        current_lat: float,
        current_lon: float,
        active_index: int,
        waypoints: List[Waypoint],
    ) -> float:
        """
        Computes remaining flight distance in meters from current position to the active waypoint,
        plus all subsequent waypoints.
        """
        if not waypoints:
            return 0.0

        active_idx = max(0, min(active_index - 1, len(waypoints) - 1))
        target_wp = waypoints[active_idx]

        # Distance to current target waypoint
        dist_m = cls.calculate_distance(
            current_lat, current_lon, target_wp.latitude, target_wp.longitude
        )

        # Plus remaining legs
        for i in range(active_idx, len(waypoints) - 1):
            dist_m += cls.calculate_distance(
                waypoints[i].latitude,
                waypoints[i].longitude,
                waypoints[i + 1].latitude,
                waypoints[i + 1].longitude,
            )

        return dist_m
