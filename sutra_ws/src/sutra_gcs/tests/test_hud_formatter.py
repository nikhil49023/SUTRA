"""
Smart Horizon GCS — HUD Formatter & Avionics Unit Conversion Unit Tests
Subsystem: Test Suite (Phase 9)
"""

import pytest
from hud.hud_formatter import HUDFormatter
from hud.models import UnitSystem


def test_heading_formatting_and_normalization():
    """Verify 3-digit zero-padded heading and wrap-around normalization."""
    assert HUDFormatter.format_heading(0.0) == "000°"
    assert HUDFormatter.format_heading(45.2) == "045°"
    assert HUDFormatter.format_heading(359.9) == "360°"
    assert HUDFormatter.format_heading(360.0) == "000°"
    assert HUDFormatter.format_heading(450.0) == "090°"
    assert HUDFormatter.format_heading(-45.0) == "315°"


def test_altitude_and_speed_formatting_metric_and_imperial():
    """Verify MSL/AGL altitude and ground/air speed conversions."""
    # Altitude Metric
    assert HUDFormatter.format_altitude(120.4, is_agl=False, unit=UnitSystem.METRIC) == "ALT 120 m"
    assert HUDFormatter.format_altitude(35.0, is_agl=True, unit=UnitSystem.METRIC) == "AGL 35 m"
    assert HUDFormatter.format_altitude(None, is_agl=True) == "AGL ---"

    # Altitude Imperial (100m ~ 328ft)
    assert HUDFormatter.format_altitude(100.0, is_agl=False, unit=UnitSystem.IMPERIAL) == "ALT 328 ft"

    # Speed Metric
    assert HUDFormatter.format_speed(15.2, is_air=False, unit=UnitSystem.METRIC) == "GS 15.2 m/s"
    assert HUDFormatter.format_speed(18.0, is_air=True, unit=UnitSystem.METRIC) == "AIR 18.0 m/s"
    assert HUDFormatter.format_speed(None, is_air=True) == "AIR ---"

    # Speed Imperial (10 m/s ~ 22.4 mph)
    assert HUDFormatter.format_speed(10.0, is_air=False, unit=UnitSystem.IMPERIAL) == "GS 22.4 mph"


def test_vertical_speed_and_eta_formatting():
    """Verify variometer climb/descent rate signs and ETA minutes:seconds formatting."""
    assert "↑ +2.5 m/s" in HUDFormatter.format_vertical_speed(2.5, unit=UnitSystem.METRIC)
    assert "↓ -1.8 m/s" in HUDFormatter.format_vertical_speed(-1.8, unit=UnitSystem.METRIC)
    assert "●" in HUDFormatter.format_vertical_speed(0.0, unit=UnitSystem.METRIC)

    assert HUDFormatter.format_eta(272.0) == "04:32"
    assert HUDFormatter.format_eta(0.0) == "--:--"
