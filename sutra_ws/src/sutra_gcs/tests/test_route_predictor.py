"""
Smart Horizon GCS — AI Route Risk Predictor Unit Tests
Subsystem: Test Suite (Phase 10)
"""

import pytest
from ai.route_predictor import RoutePredictor
from mission.waypoint import Waypoint


def test_route_risk_nominal():
    """Verify nominal flight path yields LOW risk."""
    wps = [
        Waypoint(index=1, latitude=37.77, longitude=-122.41, altitude=50.0, speed=10.0),
        Waypoint(index=2, latitude=37.78, longitude=-122.41, altitude=50.0, speed=10.0),
    ]
    report = RoutePredictor.analyze_route("Nominal Test", wps)
    assert report.risk_level == "LOW"
    assert report.hazard_count == 0


def test_route_risk_sharp_turn_and_steep_climb():
    """Verify sharp hairpin turn and steep gradient raise hazard flags."""
    wps = [
        Waypoint(index=1, latitude=37.77, longitude=-122.41, altitude=20.0, speed=10.0),
        Waypoint(index=2, latitude=37.78, longitude=-122.41, altitude=90.0, speed=10.0),  # Steep climb
        Waypoint(index=3, latitude=37.77, longitude=-122.41, altitude=90.0, speed=10.0),  # 180 hairpin
    ]
    report = RoutePredictor.analyze_route("Hazard Test", wps)
    assert report.hazard_count >= 1
