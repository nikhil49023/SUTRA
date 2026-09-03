"""
Smart Horizon GCS — Geodetic Route Calculator Unit Tests
Subsystem: Test Suite (Phase 3)
"""

import math
import pytest
from mission.route_calculator import RouteCalculator
from mission.waypoint import Waypoint


def test_geodesic_distance_calculation():
    """Verify high-precision Haversine great-circle calculation between known locations."""
    # San Francisco (37.774929, -122.419416) to Los Angeles (34.052235, -118.243683) ~559 km
    dist_m = RouteCalculator.calculate_distance(37.774929, -122.419416, 34.052235, -118.243683)
    assert 550000.0 < dist_m < 570000.0

    # Short distance: 0.001 deg Lat ~ 111.13 meters
    short_dist = RouteCalculator.calculate_distance(37.774929, -122.419416, 37.775929, -122.419416)
    assert abs(short_dist - 111.13) < 2.0


def test_bearing_calculation():
    """Verify forward azimuth bearing calculation."""
    # Directly North
    b_north = RouteCalculator.calculate_bearing(37.774929, -122.419416, 37.784929, -122.419416)
    assert abs(b_north - 0.0) < 1.0 or abs(b_north - 360.0) < 1.0

    # Directly East
    b_east = RouteCalculator.calculate_bearing(37.774929, -122.419416, 37.774929, -122.409416)
    assert abs(b_east - 90.0) < 1.0

    # Directly South
    b_south = RouteCalculator.calculate_bearing(37.774929, -122.419416, 37.764929, -122.419416)
    assert abs(b_south - 180.0) < 1.0


def test_total_and_segment_distances():
    """Verify cumulative path distance and segment breakdown across multiple waypoints."""
    home_lat, home_lon = 37.774929, -122.419416
    wps = [
        Waypoint(index=1, latitude=37.775929, longitude=-122.419416),  # ~111m North of home
        Waypoint(index=2, latitude=37.775929, longitude=-122.418416),  # ~88m East
        Waypoint(index=3, latitude=37.774929, longitude=-122.418416),  # ~111m South
    ]

    total_dist = RouteCalculator.calculate_total_distance(wps, home_lat, home_lon)
    assert 300.0 < total_dist < 320.0

    segments = RouteCalculator.calculate_segment_distances(wps, home_lat, home_lon)
    assert len(segments) == 3
    assert abs(sum(segments) - total_dist) < 1e-4
