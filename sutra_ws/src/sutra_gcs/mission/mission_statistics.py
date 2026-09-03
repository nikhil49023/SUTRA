"""
Smart Horizon GCS — Mission Flight Statistics Calculator
Subsystem: Mission Engine (Phase 3)
"""

from dataclasses import dataclass
from typing import List, Optional

from .models import Mission
from .route_calculator import RouteCalculator
from .waypoint import Waypoint


@dataclass(frozen=True)
class MissionStatistics:
    """
    Computed summary metrics for a planned mission corridor.
    """

    total_distance_m: float = 0.0
    waypoint_count: int = 0
    max_altitude_m: float = 0.0
    min_altitude_m: float = 0.0
    average_speed_mps: float = 0.0
    estimated_flight_time_sec: float = 0.0
    estimated_battery_drain_pct: float = 0.0

    @classmethod
    def calculate(cls, mission: Mission) -> "MissionStatistics":
        """
        Computes flight statistics from mission waypoints and speeds.
        """
        wps = mission.waypoints
        if not wps:
            return cls()

        total_dist = RouteCalculator.calculate_total_distance(
            wps, mission.home_latitude, mission.home_longitude
        )
        wp_count = len(wps)
        altitudes = [wp.altitude for wp in wps]
        speeds = [wp.speed for wp in wps]
        hold_times = [wp.hold_time for wp in wps]

        max_alt = max(altitudes) if altitudes else 0.0
        min_alt = min(altitudes) if altitudes else 0.0
        avg_speed = sum(speeds) / len(speeds) if speeds else 5.0

        # Travel time + hold times
        travel_time_sec = (total_dist / avg_speed) if avg_speed > 0 else 0.0
        total_flight_time_sec = travel_time_sec + sum(hold_times)

        # Approximate 6S LiPo power consumption: ~1.2% battery per 100m + ~0.05% per sec hover
        est_battery_pct = min(100.0, (total_dist / 100.0) * 1.2 + (total_flight_time_sec * 0.04))

        return cls(
            total_distance_m=total_dist,
            waypoint_count=wp_count,
            max_altitude_m=max_alt,
            min_altitude_m=min_alt,
            average_speed_mps=avg_speed,
            estimated_flight_time_sec=total_flight_time_sec,
            estimated_battery_drain_pct=est_battery_pct,
        )
