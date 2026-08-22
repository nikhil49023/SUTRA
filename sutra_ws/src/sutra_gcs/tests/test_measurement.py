"""
Smart Horizon GCS — Tactical Measurement Tool Unit Tests
Subsystem: Test Suite (Phase 7)
"""

import pytest
from gis.measurement import MeasurementTool


def test_line_measurement():
    """Verify distance, true azimuth, and elevation delta calculation."""
    tool = MeasurementTool()
    p1 = (37.774929, -122.419416)
    p2 = (37.784929, -122.419416) # Due North

    res = tool.measure_line(p1, p2)
    assert 1100.0 < res.distance_m < 1120.0
    assert abs(res.bearing_deg - 0.0) < 1.0 or abs(res.bearing_deg - 360.0) < 1.0


def test_polygon_measurement():
    """Verify geodesic surface area and perimeter measurement."""
    tool = MeasurementTool()
    # ~100m x 100m box
    coords = [
        (37.7740, -122.4190),
        (37.7750, -122.4190),
        (37.7750, -122.4180),
        (37.7740, -122.4180),
    ]

    res = tool.measure_polygon(coords)
    assert res.area_m2 > 5000.0
    assert res.perimeter_m > 200.0
