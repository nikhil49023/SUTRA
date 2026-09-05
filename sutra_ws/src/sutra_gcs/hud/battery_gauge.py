"""
SUTRA GCS — Battery Gauge & Power Diagnostics Calculation
"""

from typing import Dict, Any


class BatteryGauge:
    """Calculates battery level color and cell voltage estimates."""

    @staticmethod
    def get_gauge_status(battery_pct: float, voltage: float) -> Dict[str, Any]:
        color = "#10b981"
        if battery_pct < 25.0:
            color = "#ef4444"
        elif battery_pct < 45.0:
            color = "#f59e0b"

        cell_v = voltage / 6.0  # 6S LiPo
        return {
            "percentage": battery_pct,
            "voltage_v": voltage,
            "cell_voltage_v": round(cell_v, 2),
            "color_hex": color,
            "is_critical": battery_pct < 20.0
        }


battery_gauge = BatteryGauge()
