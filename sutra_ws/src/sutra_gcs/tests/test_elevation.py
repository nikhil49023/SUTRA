"""
Smart Horizon GCS — Digital Elevation Model & Topography Unit Tests
Subsystem: Test Suite (Phase 7)
"""

import pytest
from gis.elevation_profile import ElevationProfileGenerator
from gis.elevation_service import ElevationService
from gis.gis_cache import GISCache
from mission.waypoint import Waypoint


def test_elevation_service_and_cache():
    """Verify DEM elevation sampling and TTL cache hit."""
    cache = GISCache()
    service = ElevationService(source="DEM_SYNTHETIC")

    # Sample elevation
    elev1 = service.get_elevation(37.774929, -122.419416)
    assert elev1 > 0.0

    # Cache population
    cache.set_elevation(37.774929, -122.419416, elev1)
    cached = cache.get_elevation(37.774929, -122.419416)
    assert cached == elev1


def test_elevation_profile_generation():
    """Verify straight-line elevation cross-section extraction."""
    gen = ElevationProfileGenerator()
    start_p = (37.774929, -122.419416)
    end_p = (37.784929, -122.409416)

    report = gen.generate_profile(start_p[0], start_p[1], end_p[0], end_p[1], num_samples=30)
    assert len(report.samples) == 30
    assert report.total_distance_m > 1000.0
    assert report.min_elevation_m > 0.0
    assert report.max_elevation_m >= report.min_elevation_m
    assert report.highest_point is not None
    assert report.highest_point.elevation_m == report.max_elevation_m


def test_mission_elevation_profile():
    """Verify route cross-section across mission waypoints."""
    gen = ElevationProfileGenerator()
    wps = [
        Waypoint(index=1, latitude=37.7760, longitude=-122.4180, altitude=25.0),
        Waypoint(index=2, latitude=37.7780, longitude=-122.4150, altitude=30.0),
    ]

    report = gen.generate_mission_profile(wps, home_lat=37.7749, home_lon=-122.4194)
    assert len(report.samples) > 20
    assert report.total_distance_m > 0.0
    assert report.max_elevation_m > 0.0
