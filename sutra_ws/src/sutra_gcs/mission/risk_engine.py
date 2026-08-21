"""
SUTRA GCS — Mission Risk Engine
"""

from typing import Dict, Any


class RiskEngine:
    """Computes mission risk assessment based on wind, battery, and obstacle proximity."""

    @staticmethod
    def evaluate_risk(wind_speed_mps: float, remaining_battery_pct: float, min_terrain_clearance_m: float) -> Dict[str, Any]:
        score = 0.0

        # Wind factor
        if wind_speed_mps > 10.0:
            score += 40.0
        elif wind_speed_mps > 6.0:
            score += 20.0

        # Battery factor
        if remaining_battery_pct < 25.0:
            score += 50.0
        elif remaining_battery_pct < 35.0:
            score += 20.0

        # Terrain factor
        if min_terrain_clearance_m < 5.0:
            score += 40.0
        elif min_terrain_clearance_m < 15.0:
            score += 15.0

        level = "LOW (NOMINAL)"
        if score > 60.0:
            level = "CRITICAL (ABORT RECOMMENDED)"
        elif score > 30.0:
            level = "ELEVATED (MONITOR CAREFULLY)"

        return {
            "risk_score": min(100.0, score),
            "risk_level": level,
            "can_proceed": score < 60.0
        }


risk_engine = RiskEngine()
