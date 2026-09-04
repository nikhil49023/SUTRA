"""
SUTRA GCS — Battery Consumption Estimator
"""

from typing import Dict, Any


class BatteryEstimator:
    """Estimates energy consumption based on aerodynamic flight legs."""

    @staticmethod
    def estimate_flight_endurance(battery_pct: float, distance_m: float, avg_speed_mps: float = 5.0) -> Dict[str, Any]:
        time_sec = distance_m / avg_speed_mps if avg_speed_mps > 0 else 0
        burn_pct = distance_m * 0.04
        remaining_pct = max(0.0, battery_pct - burn_pct)
        is_safe = remaining_pct >= 25.0

        return {
            "flight_duration_sec": round(time_sec, 1),
            "consumed_pct": round(burn_pct, 1),
            "remaining_pct": round(remaining_pct, 1),
            "is_safe_reserve": is_safe
        }


battery_estimator = BatteryEstimator()
