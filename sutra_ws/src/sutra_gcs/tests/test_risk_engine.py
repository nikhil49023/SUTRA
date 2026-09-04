"""
Smart Horizon GCS — Multivariable Risk Engine Unit Tests
Subsystem: Test Suite (Phase 5)
"""

import pytest
from engine.models import RiskLevel
from engine.risk_engine import RiskEngine
from geofence.models import Geofence, GeometryType, ZoneType
from mission.models import Mission
from mission.waypoint import Waypoint


def test_risk_evaluation_nominal():
    """Verify LOW risk score for clear airspace and nominal telemetry."""
    wps = [
        Waypoint(index=1, latitude=37.775, longitude=-122.419, altitude=25.0),
        Waypoint(index=2, latitude=37.776, longitude=-122.418, altitude=30.0),
    ]
    mission = Mission(waypoints=wps, home_latitude=37.774929, home_longitude=-122.419416)

    report = RiskEngine.evaluate_mission_risk(
        mission=mission,
        geofences=[],
        battery_pct=100.0,
        gps_satellites=16,
        rssi_pct=98.0,
    )

    assert report.risk_level == RiskLevel.LOW
    assert report.risk_score < 25.0
    assert len(report.recommendations) >= 1


def test_risk_evaluation_critical_airspace_breach():
    """Verify CRITICAL risk score when route breaches No-Fly Zone."""
    coords = [
        (37.7740, -122.4200),
        (37.7760, -122.4200),
        (37.7760, -122.4180),
        (37.7740, -122.4180),
    ]
    nfz = Geofence(name="Restricted Prison Zone", zone_type=ZoneType.NO_FLY, coordinates=coords)

    # WP1 is placed inside NFZ
    wps = [Waypoint(index=1, latitude=37.7750, longitude=-122.4190, altitude=30.0)]
    mission = Mission(waypoints=wps, home_latitude=37.774929, home_longitude=-122.419416)

    report = RiskEngine.evaluate_mission_risk(
        mission=mission,
        geofences=[nfz],
        battery_pct=100.0,
    )

    assert report.risk_level == RiskLevel.CRITICAL
    assert any("No-Fly" in f.description for f in report.factors)
