"""
Smart Horizon GCS — RF Propagation & Free Space Path Loss Unit Tests
Subsystem: Test Suite (Phase 7)
"""

import pytest
from gis.rf_coverage import RFCoverageAnalyzer


def test_fspl_and_fresnel_calculations():
    """Verify standard Free Space Path Loss and 1st Fresnel zone formulas."""
    # 1 km distance at 2.4 GHz
    fspl = RFCoverageAnalyzer.calculate_fspl_db(1000.0, freq_mhz=2400.0)
    # FSPL(1km, 2400MHz) = 20*log10(1) + 20*log10(2400) + 32.44 = 0 + 67.60 + 32.44 = 100.04 dB
    assert 99.0 < fspl < 101.0

    # 1st Fresnel radius at midpoint of 1000m link (d1=500, d2=500) at 2.4 GHz
    r = RFCoverageAnalyzer.calculate_fresnel_radius(500.0, 500.0, freq_ghz=2.4)
    assert r > 0.0



def test_link_budget_analysis():
    """Verify RF link budget margin and quality categorization."""
    # Short link (100m) -> High link margin -> EXCELLENT
    res_short = RFCoverageAnalyzer.analyze_link(100.0, freq_mhz=2400.0)
    assert res_short.link_quality in ("EXCELLENT", "GOOD")
    assert res_short.link_margin_db > 20.0

    # Long link (20km) -> Low link margin -> DEGRADED / CRITICAL / LOST
    res_long = RFCoverageAnalyzer.analyze_link(20000.0, freq_mhz=2400.0)
    assert res_long.link_margin_db < res_short.link_margin_db


def test_rf_coverage_grid_generation():
    """Verify 2D spatial heatmap node generation."""
    analyzer = RFCoverageAnalyzer()
    grid = analyzer.generate_coverage_grid(37.7749, -122.4194, radius_m=1000.0, grid_dim=10)
    assert len(grid) > 0
    assert all(pt.distance_m <= 1000.0 for pt in grid)
