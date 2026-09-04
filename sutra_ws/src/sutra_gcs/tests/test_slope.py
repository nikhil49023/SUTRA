"""
Smart Horizon GCS — Terrain Slope & Ground Clearance Unit Tests
Subsystem: Test Suite (Phase 7)
"""

import pytest
from gis.ground_clearance import GroundClearanceAnalyzer
from gis.models import ClearanceStatus, ElevationPoint, ElevationProfileReport, SlopeCategory
from gis.slope_analyzer import SlopeAnalyzer


def test_slope_analyzer_categories():
    """Verify terrain gradient categorization from elevation samples."""
    # Flat profile (0 deg slope)
    flat_samples = [
        ElevationPoint(37.77, -122.41, 50.0, 0.0),
        ElevationPoint(37.77, -122.41, 50.0, 100.0),
        ElevationPoint(37.77, -122.41, 50.0, 200.0),
    ]
    rep_flat = ElevationProfileReport(
        start_point=(37.77, -122.41),
        end_point=(37.77, -122.41),
        total_distance_m=200.0,
        min_elevation_m=50.0,
        max_elevation_m=50.0,
        avg_elevation_m=50.0,
        highest_point=flat_samples[0],
        lowest_point=flat_samples[0],
        samples=flat_samples,
    )

    slope_flat = SlopeAnalyzer.analyze_profile_slope(rep_flat)
    assert slope_flat.avg_slope_deg == 0.0
    assert slope_flat.category == SlopeCategory.LOW

    # Steep cliff profile (45 deg slope: 100m rise over 100m run)
    steep_samples = [
        ElevationPoint(37.77, -122.41, 50.0, 0.0),
        ElevationPoint(37.77, -122.41, 150.0, 100.0),
    ]
    rep_steep = ElevationProfileReport(
        start_point=(37.77, -122.41),
        end_point=(37.77, -122.41),
        total_distance_m=100.0,
        min_elevation_m=50.0,
        max_elevation_m=150.0,
        avg_elevation_m=100.0,
        highest_point=steep_samples[1],
        lowest_point=steep_samples[0],
        samples=steep_samples,
    )

    slope_steep = SlopeAnalyzer.analyze_profile_slope(rep_steep)
    assert slope_steep.max_slope_deg == 45.0
    assert slope_steep.category == SlopeCategory.VERY_HIGH


def test_ground_clearance_safety_thresholds():
    """Verify ground buffer threshold evaluation."""
    analyzer = GroundClearanceAnalyzer()

    # 1. Nominal high altitude (>30m) -> SAFE
    rep_safe = analyzer.check_position_clearance("drone_alpha", 37.7749, -122.4194, alt_agl=50.0)
    assert rep_safe.status == ClearanceStatus.SAFE

    # 2. Medium altitude (20m) -> WARNING
    rep_warn = analyzer.check_position_clearance("drone_bravo", 37.7749, -122.4194, alt_agl=20.0)
    assert rep_warn.status == ClearanceStatus.WARNING

    # 3. Dangerously low altitude (5m) -> CRITICAL
    rep_crit = analyzer.check_position_clearance("drone_charlie", 37.7749, -122.4194, alt_agl=5.0)
    assert rep_crit.status == ClearanceStatus.CRITICAL
