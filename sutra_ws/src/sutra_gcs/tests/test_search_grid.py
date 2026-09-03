"""
Smart Horizon GCS — SAR Search Grid Generation Unit Tests
Subsystem: Test Suite (Phase 7)
"""

import pytest
from gis.models import SearchGridConfig, SearchPattern
from gis.search_grid import SearchGridGenerator


def test_lawnmower_search_grid():
    """Verify SAR parallel transect coordinate generation."""
    bounds = [
        (37.7700, -122.4200),
        (37.7720, -122.4200),
        (37.7720, -122.4180),
        (37.7700, -122.4180),
    ]

    cfg = SearchGridConfig(
        bounds_coordinates=bounds,
        spacing_m=25.0,
        pattern=SearchPattern.LAWN_MOWER,
        altitude_m=40.0,
        speed_mps=10.0,
    )

    path = SearchGridGenerator.generate_search_path(cfg)
    assert len(path) >= 4

    wps = SearchGridGenerator.generate_mission_waypoints(cfg)
    assert len(wps) == len(path)
    assert all(wp.altitude == 40.0 for wp in wps)
    assert all(wp.speed == 10.0 for wp in wps)


def test_perimeter_search_grid():
    """Verify perimeter closed loop generation."""
    bounds = [
        (37.7700, -122.4200),
        (37.7720, -122.4200),
        (37.7720, -122.4180),
        (37.7700, -122.4180),
    ]

    cfg = SearchGridConfig(
        bounds_coordinates=bounds,
        pattern=SearchPattern.PERIMETER,
    )

    path = SearchGridGenerator.generate_search_path(cfg)
    assert len(path) == 5
    # First point equals last point
    assert path[0] == path[-1]
