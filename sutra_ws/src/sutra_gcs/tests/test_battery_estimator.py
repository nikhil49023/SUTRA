"""
Smart Horizon GCS — Battery Estimator Unit Tests
Subsystem: Test Suite (Phase 5)
"""

import pytest
from engine.battery_estimator import BatteryEstimator
from mission.models import Mission
from mission.waypoint import Waypoint


def test_battery_estimation_nominal_mission():
    """Verify energy calculation and RTH safety buffer on nominal flight path."""
    wps = [
        Waypoint(index=1, latitude=37.775, longitude=-122.419, altitude=25.0, hold_time=5.0),
        Waypoint(index=2, latitude=37.776, longitude=-122.418, altitude=30.0, hold_time=10.0),
    ]
    mission = Mission(waypoints=wps, home_latitude=37.774929, home_longitude=-122.419416)

    analysis = BatteryEstimator.estimate_mission_energy(
        mission=mission,
        initial_battery_pct=100.0,
        battery_capacity_mah=5000.0,
        nominal_voltage=22.2,
        cruise_speed_mps=8.0,
    )

    assert analysis.estimated_energy_wh > 0.0
    assert analysis.estimated_flight_time_sec > 15.0  # Travel + 15s hold
    assert analysis.battery_at_completion_pct > 80.0
    assert analysis.rth_safe is True
    assert analysis.status == "SAFE"


def test_battery_estimation_insufficient_reserve():
    """Verify that starting with low initial battery flags RTH safety violation."""
    wps = [
        Waypoint(index=1, latitude=37.785, longitude=-122.419, altitude=25.0),  # ~1.1km away
        Waypoint(index=2, latitude=37.795, longitude=-122.419, altitude=25.0),  # ~2.2km away
    ]
    mission = Mission(waypoints=wps, home_latitude=37.774929, home_longitude=-122.419416)

    # Initial battery is already low (15%)
    analysis = BatteryEstimator.estimate_mission_energy(
        mission=mission,
        initial_battery_pct=15.0,
        battery_capacity_mah=5000.0,
    )

    assert analysis.battery_at_completion_pct < 15.0
    assert analysis.status in {"CRITICAL", "WARNING"}
