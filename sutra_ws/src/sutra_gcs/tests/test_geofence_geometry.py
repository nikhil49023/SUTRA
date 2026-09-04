"""
Smart Horizon GCS — Geofence Computational Geometry Unit Tests
Subsystem: Test Suite (Phase 4)
"""

import pytest
from geofence.geometry import GeofenceGeometry


def test_polygon_creation_and_properties():
    """Verify polygon creation, area in m², and perimeter in meters."""
    # 100m x 100m square in San Francisco (~0.0009 deg lat, ~0.00114 deg lon)
    coords = [
        (37.774929, -122.419416),
        (37.775829, -122.419416),
        (37.775829, -122.418276),
        (37.774929, -122.418276),
    ]
    poly = GeofenceGeometry.create_polygon(coords)
    assert poly is not None
    assert poly.is_valid

    area_m2 = GeofenceGeometry.calculate_area(coords)
    # Expected ~10,000 m² (1 hectare)
    assert 9000.0 < area_m2 < 11000.0

    perim_m = GeofenceGeometry.calculate_perimeter(coords)
    # Expected ~400 meters
    assert 380.0 < perim_m < 420.0


def test_circle_creation_and_area():
    """Verify geodesic circle generation and area."""
    center_lat, center_lon = 37.774929, -122.419416
    radius_m = 100.0

    poly = GeofenceGeometry.create_circle(center_lat, center_lon, radius_m)
    assert poly is not None
    assert poly.is_valid

    # Area = pi * r^2 ~ 31,415.9 m²
    area_m2 = GeofenceGeometry.calculate_area(poly)
    assert 30000.0 < area_m2 < 33000.0


def test_corridor_creation():
    """Verify buffered corridor generation."""
    path = [
        (37.774929, -122.419416),
        (37.779929, -122.419416),
    ]
    poly = GeofenceGeometry.create_corridor(path, corridor_width_m=50.0)
    assert poly is not None
    assert poly.is_valid
    assert poly.area > 0


def test_point_containment():
    """Verify inside vs outside point containment."""
    coords = [
        (37.7740, -122.4200),
        (37.7760, -122.4200),
        (37.7760, -122.4180),
        (37.7740, -122.4180),
    ]
    # Inside center point
    assert GeofenceGeometry.contains_point(coords, 37.7750, -122.4190) is True

    # Far outside point
    assert GeofenceGeometry.contains_point(coords, 37.7800, -122.4300) is False


def test_line_intersection():
    """Verify flight route segment intersection detection."""
    coords = [
        (37.7740, -122.4200),
        (37.7760, -122.4200),
        (37.7760, -122.4180),
        (37.7740, -122.4180),
    ]
    # Line passing through the box: (37.775, -122.425) -> (37.775, -122.415)
    assert GeofenceGeometry.intersects_line(coords, 37.775, -122.425, 37.775, -122.415) is True

    # Line clearly missing the box: (37.780, -122.425) -> (37.780, -122.415)
    assert GeofenceGeometry.intersects_line(coords, 37.780, -122.425, 37.780, -122.415) is False
