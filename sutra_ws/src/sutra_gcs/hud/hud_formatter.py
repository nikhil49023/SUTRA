"""
Smart Horizon GCS — Centralized Avionics Unit Formatter & Conversion Engine
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

import math
from typing import Optional
from .models import UnitSystem


class HUDFormatter:
    """
    Standardizes telemetry unit conversions (Metric/Imperial) and decimal precision formatting.
    """

    @classmethod
    def format_altitude(
        cls, alt_m: Optional[float], is_agl: bool = False, unit: UnitSystem = UnitSystem.METRIC
    ) -> str:
        if alt_m is None or alt_m < -500.0:
            return "AGL ---" if is_agl else "ALT ---"

        if unit == UnitSystem.IMPERIAL:
            alt_ft = alt_m * 3.28084
            prefix = "AGL " if is_agl else "ALT "
            return f"{prefix}{alt_ft:.0f} ft"
        else:
            prefix = "AGL " if is_agl else "ALT "
            return f"{prefix}{alt_m:.0f} m"

    @classmethod
    def format_speed(
        cls, spd_mps: Optional[float], is_air: bool = False, unit: UnitSystem = UnitSystem.METRIC
    ) -> str:
        if spd_mps is None or spd_mps < 0.0:
            return "AIR ---" if is_air else "GS ---"

        prefix = "AIR " if is_air else "GS "
        if unit == UnitSystem.IMPERIAL:
            spd_mph = spd_mps * 2.23694
            return f"{prefix}{spd_mph:.1f} mph"
        else:
            return f"{prefix}{spd_mps:.1f} m/s"

    @classmethod
    def format_heading(cls, deg: float) -> str:
        """Normalizes and formats compass bearing (e.g. 045°)."""
        normalized = deg % 360.0
        if normalized < 0:
            normalized += 360.0
        return f"{normalized:03.0f}°"

    @classmethod
    def format_distance(cls, dist_m: float, unit: UnitSystem = UnitSystem.METRIC) -> str:
        if unit == UnitSystem.IMPERIAL:
            dist_ft = dist_m * 3.28084
            if dist_ft >= 5280.0:
                return f"{dist_ft / 5280.0:.2f} mi"
            return f"{dist_ft:.0f} ft"
        else:
            if dist_m >= 1000.0:
                return f"{dist_m / 1000.0:.2f} km"
            return f"{dist_m:.0f} m"

    @classmethod
    def format_vertical_speed(cls, vs_mps: float, unit: UnitSystem = UnitSystem.METRIC) -> str:
        arrow = "↑" if vs_mps > 0.05 else ("↓" if vs_mps < -0.05 else "●")
        sign = "+" if vs_mps > 0 else ""
        if unit == UnitSystem.IMPERIAL:
            vs_fpm = vs_mps * 196.85
            return f"{arrow} {sign}{vs_fpm:.0f} fpm"
        else:
            return f"{arrow} {sign}{vs_mps:.1f} m/s"

    @classmethod
    def format_battery(cls, pct: float, voltage: float = 0.0) -> str:
        if voltage > 0.0:
            return f"{pct:.0f}% ({voltage:.1f}V)"
        return f"{pct:.0f}%"

    @classmethod
    def format_voltage(cls, volt: float) -> str:
        return f"{volt:.1f}V"

    @classmethod
    def format_eta(cls, seconds: float) -> str:
        if seconds <= 0 or math.isinf(seconds) or math.isnan(seconds):
            return "--:--"
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{mins:02d}:{secs:02d}"

    @classmethod
    def format_latency(cls, ms: float) -> str:
        if ms <= 0.0:
            return "OK"
        return f"{ms:.0f} ms"
