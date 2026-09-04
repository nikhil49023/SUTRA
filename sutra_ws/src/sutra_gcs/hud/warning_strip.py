"""
SUTRA GCS — Master Warning & Caution Strip Calculation
"""

from typing import List, Dict, Any


class WarningStrip:
    """Computes master caution/warning flash states."""

    @staticmethod
    def evaluate_warnings(battery_pct: float, alt_agl: float, geofence_breached: bool, los_blocked: bool) -> List[Dict[str, str]]:
        warnings = []
        if geofence_breached:
            warnings.append({"type": "WARNING", "text": "GEOFENCE BREACH — RTL ENGAGED", "color": "#ef4444"})
        if battery_pct < 20.0:
            warnings.append({"type": "WARNING", "text": "CRITICAL LOW BATTERY — LAND NOW", "color": "#ef4444"})
        elif battery_pct < 30.0:
            warnings.append({"type": "CAUTION", "text": "LOW BATTERY RESERVE", "color": "#f59e0b"})
        if alt_agl > 120.0:
            warnings.append({"type": "CAUTION", "text": "MAX ALTITUDE CEILING EXCEEDED", "color": "#f59e0b"})
        if los_blocked:
            warnings.append({"type": "CAUTION", "text": "RF LINE-OF-SIGHT OBSTRUCTED", "color": "#f59e0b"})

        return warnings


warning_strip = WarningStrip()
