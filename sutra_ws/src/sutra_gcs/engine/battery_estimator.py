"""
Smart Horizon GCS — UAV LiPo Energy Consumption & RTH Reserve Estimator
Subsystem: Mission Engine (Phase 5)
"""

import math
from typing import List, Optional

from config.settings import get_settings
from mission.models import Mission
from mission.route_calculator import RouteCalculator
from .models import BatteryAnalysis


class BatteryEstimator:
    """
    Mathematical electric propulsion energy estimator based on battery capacity,
    aerodynamic drag, hover power consumption, and return-to-home (RTH) safety margin.
    """

    # Configurable Battery Threshold Constants
    CRITICAL_THRESHOLD_PCT: float = 10.0
    WARNING_THRESHOLD_PCT: float = 20.0
    SAFE_THRESHOLD_PCT: float = 30.0
    RTH_SAFETY_BUFFER_PCT: float = 15.0

    @classmethod
    def estimate_mission_energy(
        cls,
        mission: Mission,
        initial_battery_pct: float = 100.0,
        battery_capacity_mah: float = 5000.0,
        nominal_voltage: float = 22.2,  # 6S LiPo
        nominal_hover_current_a: float = 12.0,
        cruise_speed_mps: float = 8.0,
        wind_speed_mps: float = 0.0,
        payload_weight_kg: float = 0.0,
    ) -> BatteryAnalysis:
        """
        Calculates total flight energy, flight duration, completion battery %, and RTH reserve.
        """
        wps = mission.waypoints
        if not wps:
            return BatteryAnalysis(
                estimated_energy_wh=0.0,
                estimated_flight_time_sec=0.0,
                battery_at_completion_pct=initial_battery_pct,
                battery_reserve_pct=initial_battery_pct,
                rth_reserve_pct=cls.RTH_SAFETY_BUFFER_PCT,
                rth_safe=True,
                status="SAFE",
            )

        total_dist_m = RouteCalculator.calculate_total_distance(
            wps, mission.home_latitude, mission.home_longitude
        )

        # 1. Flight Time Breakdown
        eff_speed = max(1.0, cruise_speed_mps - (wind_speed_mps * 0.5))
        travel_time_sec = total_dist_m / eff_speed
        hover_hold_sec = sum(wp.hold_time for wp in wps)
        total_time_sec = travel_time_sec + hover_hold_sec

        # 2. Power Consumption
        # Base power = V * I + payload factor
        payload_factor = 1.0 + (payload_weight_kg * 0.15)
        hover_power_w = nominal_voltage * nominal_hover_current_a * payload_factor
        cruise_power_w = hover_power_w * 1.15  # Forward flight aerodynamic drag

        energy_travel_wh = (cruise_power_w * (travel_time_sec / 3600.0))
        energy_hover_wh = (hover_power_w * (hover_hold_sec / 3600.0))
        total_energy_wh = energy_travel_wh + energy_hover_wh

        # Total Pack Energy
        pack_energy_wh = (battery_capacity_mah / 1000.0) * nominal_voltage
        consumed_pct = (total_energy_wh / pack_energy_wh) * 100.0 if pack_energy_wh > 0 else 0.0

        battery_at_completion = max(0.0, initial_battery_pct - consumed_pct)

        # 3. RTH Reserve Calculation
        # Distance from furthest waypoint back to home
        furthest_dist_m = 0.0
        for wp in wps:
            d = RouteCalculator.calculate_distance(
                mission.home_latitude, mission.home_longitude, wp.latitude, wp.longitude
            )
            furthest_dist_m = max(furthest_dist_m, d)

        rth_flight_time_sec = furthest_dist_m / eff_speed
        rth_energy_wh = cruise_power_w * (rth_flight_time_sec / 3600.0)
        rth_pct = (rth_energy_wh / pack_energy_wh) * 100.0 if pack_energy_wh > 0 else 5.0
        total_rth_needed_pct = rth_pct + cls.RTH_SAFETY_BUFFER_PCT

        rth_safe = battery_at_completion >= total_rth_needed_pct

        # Determine Status
        if battery_at_completion < cls.CRITICAL_THRESHOLD_PCT or not rth_safe:
            status = "CRITICAL"
        elif battery_at_completion < cls.WARNING_THRESHOLD_PCT:
            status = "WARNING"
        else:
            status = "SAFE"

        return BatteryAnalysis(
            estimated_energy_wh=total_energy_wh,
            estimated_flight_time_sec=total_time_sec,
            battery_at_completion_pct=battery_at_completion,
            battery_reserve_pct=battery_at_completion,
            rth_reserve_pct=total_rth_needed_pct,
            rth_safe=rth_safe,
            status=status,
        )
