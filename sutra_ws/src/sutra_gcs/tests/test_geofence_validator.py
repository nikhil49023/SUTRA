"""
Smart Horizon GCS — Geofence Airspace Safety Validator Unit Tests
Subsystem: Test Suite (Phase 4)
"""

import pytest
from geofence.models import Geofence, GeometryType, ZoneType
from geofence.validator import GeofenceValidator
from mission.models import Mission
from mission.waypoint import Waypoint


def test_waypoint_no_fly_breach():
    """Verify that a waypoint inside a No-Fly zone fails validation."""
    coords = [
        (37.7740, -122.4200),
        (37.7760, -122.4200),
        (37.7760, -122.4180),
        (37.7740, -122.4180),
    ]
    nfz = Geofence(
        name="High Security Facility",
        zone_type=ZoneType.NO_FLY,
        geometry_type=GeometryType.POLYGON,
        coordinates=coords,
        altitude_min=0.0,
        altitude_max=100.0,
    )

    # Waypoint WP1 placed squarely inside NFZ at 30m altitude
    wps = [Waypoint(index=1, latitude=37.7750, longitude=-122.4190, altitude=30.0)]
    m = Mission(waypoints=wps)

    res = GeofenceValidator.validate_mission_geofences(m, [nfz])
    assert res.valid is False
    assert any("violates NO-FLY ZONE" in err for err in res.errors)


def test_altitude_window_exemption():
    """Verify that a waypoint flying ABOVE the ceiling of a low-altitude NFZ is not breached."""
    coords = [
        (37.7740, -122.4200),
        (37.7760, -122.4200),
        (37.7760, -122.4180),
        (37.7740, -122.4180),
    ]
    low_nfz = Geofence(
        name="Ground Construction Zone",
        zone_type=ZoneType.NO_FLY,
        coordinates=coords,
        altitude_min=0.0,
        altitude_max=20.0,  # Max 20m AGL
    )

    # Waypoint at 50m AGL (above 20m)
    wps = [Waypoint(index=1, latitude=37.7750, longitude=-122.4190, altitude=50.0)]
    m = Mission(waypoints=wps)

    res = GeofenceValidator.validate_mission_geofences(m, [low_nfz])
    assert res.valid is True
    assert len(res.errors) == 0


def test_route_intersection_breach():
    """Verify that a route leg passing through a No-Fly zone is flagged even if waypoints are outside."""
    coords = [
        (37.7740, -122.4200),
        (37.7760, -122.4200),
        (37.7760, -122.4180),
        (37.7740, -122.4180),
    ]
    nfz = Geofence(
        name="Sensitive Corridor",
        zone_type=ZoneType.NO_FLY,
        coordinates=coords,
        altitude_min=0.0,
        altitude_max=120.0,
    )

    # WP1 is West of NFZ, WP2 is East of NFZ
    wps = [
        Waypoint(index=1, latitude=37.7750, longitude=-122.4250, altitude=30.0),
        Waypoint(index=2, latitude=37.7750, longitude=-122.4150, altitude=30.0),
    ]
    m = Mission(waypoints=wps, home_latitude=37.7750, home_longitude=-122.4250)

    res = GeofenceValidator.validate_mission_geofences(m, [nfz])
    assert res.valid is False
    assert any("intersects NO-FLY ZONE" in err for err in res.errors)
