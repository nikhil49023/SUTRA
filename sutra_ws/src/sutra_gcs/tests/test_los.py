"""
Smart Horizon GCS — Line-of-Sight (LOS) Ray-Tracing Unit Tests
Subsystem: Test Suite (Phase 7)
"""

import pytest
from gis.line_of_sight import LineOfSightAnalyzer


def test_los_unobstructed_path():
    """Verify clear Line of Sight over flat or low terrain."""
    analyzer = LineOfSightAnalyzer()

    # Observer at 100m MSL, Target at 100m MSL, distance ~1km
    res = analyzer.analyze_los(
        obs_lat=37.7749,
        obs_lon=-122.4194,
        obs_alt_msl=120.0,
        target_lat=37.7849,
        target_lon=-122.4194,
        target_alt_msl=120.0,
    )

    assert res.visible is True
    assert res.blocked is False
    assert res.distance_m > 500.0
    assert res.min_clearance_m > 0.0


def test_los_backward_compatibility():
    """Verify check_los helper function behavior."""
    profile = [
        {"elevation_m": 20.0},
        {"elevation_m": 25.0},
        {"elevation_m": 22.0},
    ]

    res = LineOfSightAnalyzer.check_los(profile, gcs_alt_msl=50.0, drone_alt_msl=50.0)
    assert res["clear"] is True
    assert res["min_clearance_m"] == 25.0
