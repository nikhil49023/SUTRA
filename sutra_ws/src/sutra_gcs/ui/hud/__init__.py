"""
Smart Horizon GCS — Primary Flight Display & HUD UI Package
"""

from hud.horizon import ArtificialHorizon, ArtificialHorizonWidget
from hud.heading_tape import HeadingTape
from hud.battery_indicator import BatteryIndicator
from hud.alert_overlay import AlertOverlay
from .primary_flight_display import PrimaryFlightDisplay
from .tactical_hud import TacticalHUD
from .camera_hud_overlay import CameraHUDOverlay

# Backward compatibility aliases for legacy test fixtures
from .compass import compass_tape, CompassTape
from .battery_gauge import battery_gauge, BatteryGauge
from .warning_strip import warning_strip, WarningStrip
artificial_horizon = ArtificialHorizon()

__all__ = [
    "ArtificialHorizon",
    "ArtificialHorizonWidget",
    "HeadingTape",
    "BatteryIndicator",
    "AlertOverlay",
    "PrimaryFlightDisplay",
    "TacticalHUD",
    "CameraHUDOverlay",
    "artificial_horizon",
    "compass_tape",
    "CompassTape",
    "battery_gauge",
    "BatteryGauge",
    "warning_strip",
    "WarningStrip",
]
