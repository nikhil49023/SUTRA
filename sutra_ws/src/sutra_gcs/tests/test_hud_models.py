"""
Smart Horizon GCS — HUD Domain Models & Theme Unit Tests
Subsystem: Test Suite (Phase 9)
"""

import pytest
from hud.models import HUDModel, UnitSystem, GPSFixType, GeofenceHUDStatus
from hud.hud_theme import HUDTheme


def test_hud_model_defaults_and_immutability():
    """Verify default initialization and frozen dataclass immutability."""
    model = HUDModel()
    assert model.drone_id == "drone_alpha"
    assert model.gps_fix == GPSFixType.FIX_3D
    assert model.geofence_status == GeofenceHUDStatus.CLEAR

    with pytest.raises(Exception):
        model.heading = 180.0  # Frozen


def test_hud_theme_palette():
    """Verify tactical HUD theme colors and fonts."""
    assert HUDTheme.COLOR_SKY.isValid()
    assert HUDTheme.COLOR_GROUND.isValid()
    assert HUDTheme.COLOR_RETICLE.isValid()
    assert HUDTheme.font_instrument_value(10).bold() is True
