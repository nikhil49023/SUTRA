"""
Smart Horizon GCS — MissionValidator Unit Tests
Subsystem: Test Suite (Phase 3)
"""

import pytest
from mission.mission_validator import MissionValidator
from mission.models import Mission
from mission.waypoint import Waypoint


def test_validator_empty_mission():
    """Verify that an empty mission fails validation."""
    m = Mission(waypoints=[])
    report = MissionValidator.validate(m)
    assert report.valid is False
    assert any("zero waypoints" in err for err in report.errors)


def test_validator_valid_mission():
    """Verify that a compliant mission passes validation with zero errors."""
    wps = [
        Waypoint(index=1, latitude=37.775, longitude=-122.419, altitude=25.0, speed=5.0),
        Waypoint(index=2, latitude=37.776, longitude=-122.418, altitude=30.0, speed=6.0),
    ]
    m = Mission(waypoints=wps, home_latitude=37.774929, home_longitude=-122.419416)
    report = MissionValidator.validate(m)
    assert report.valid is True
    assert len(report.errors) == 0


def test_validator_altitude_and_speed_violations():
    """Verify that altitude exceeding ceiling or speed exceeding airframe limit produces errors."""
    wps = [
        Waypoint(index=1, latitude=37.775, longitude=-122.419, altitude=150.0, speed=5.0),  # > 120m ceiling
        Waypoint(index=2, latitude=37.776, longitude=-122.418, altitude=25.0, speed=35.0),   # > 25m/s
    ]
    m = Mission(waypoints=wps)
    report = MissionValidator.validate(m)
    assert report.valid is False
    assert any("exceeds legal ceiling" in err for err in report.errors)
    assert any("exceeds max airframe velocity" in err for err in report.errors)
