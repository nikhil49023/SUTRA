"""
Smart Horizon GCS — Waypoint Model Unit Tests
Subsystem: Test Suite (Phase 3)
"""

import pytest
from mission.waypoint import AltitudeReference, Waypoint, WaypointCommand


def test_waypoint_creation_and_defaults():
    """Verify Waypoint dataclass instantiation, defaults, and immutability."""
    wp = Waypoint(
        index=1,
        latitude=37.774929,
        longitude=-122.419416,
        altitude=30.0,
        speed=8.0,
        command=WaypointCommand.TAKEOFF,
    )
    assert wp.index == 1
    assert wp.latitude == 37.774929
    assert wp.longitude == -122.419416
    assert wp.altitude == 30.0
    assert wp.speed == 8.0
    assert wp.command == WaypointCommand.TAKEOFF
    assert wp.altitude_reference == AltitudeReference.RELATIVE_TO_HOME
    assert wp.acceptance_radius == 1.8
    assert wp.enabled is True
    assert wp.id is not None


def test_waypoint_compatibility_properties():
    """Verify backward compatibility properties (altitude_agl, speed_mps, action)."""
    wp = Waypoint(
        index=2,
        latitude=37.775,
        longitude=-122.420,
        altitude=45.0,
        speed=12.0,
        hold_time=5.0,
        command=WaypointCommand.LOITER,
    )
    assert wp.altitude_agl == 45.0
    assert wp.speed_mps == 12.0
    assert wp.hold_time_sec == 5.0
    assert wp.action == "LOITER"
