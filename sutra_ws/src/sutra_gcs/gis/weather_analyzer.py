"""
Smart Horizon GCS — Atmospheric Flight Envelope Risk Analyzer
Subsystem: GIS Subsystem (Phase 7)
"""

from typing import List
from .models import WeatherData, WeatherRiskReport


class WeatherAnalyzer:
    """
    Assesses operational weather conditions against UAV airframe limits.
    """

    MAX_SAFE_WIND_MPS: float = 8.0
    MAX_WARNING_WIND_MPS: float = 12.0
    MIN_SAFE_VISIBILITY_KM: float = 5.0
    MIN_WARNING_VISIBILITY_KM: float = 3.0
    MAX_SAFE_PRECIP_MM: float = 0.5
    MAX_WARNING_PRECIP_MM: float = 2.0

    @classmethod
    def evaluate_weather(cls, weather: WeatherData) -> WeatherRiskReport:
        if not weather.available:
            return WeatherRiskReport(
                risk_level="WARNING",
                wind_status="UNAVAILABLE",
                visibility_status="UNAVAILABLE",
                precipitation_status="UNAVAILABLE",
                reasons=["Live meteorological station data unavailable. Exercise caution."],
            )

        reasons: List[str] = []

        # 1. Wind Analysis
        if weather.wind_speed_mps > cls.MAX_WARNING_WIND_MPS:
            wind_stat = "CRITICAL"
            reasons.append(f"High wind velocity ({weather.wind_speed_mps:.1f} m/s) exceeds airframe limits.")
        elif weather.wind_speed_mps > cls.MAX_SAFE_WIND_MPS:
            wind_stat = "WARNING"
            reasons.append(f"Moderate wind gusts ({weather.wind_gusts_mps:.1f} m/s).")
        else:
            wind_stat = "SAFE"

        # 2. Visibility Analysis
        if weather.visibility_km < cls.MIN_WARNING_VISIBILITY_KM:
            vis_stat = "CRITICAL"
            reasons.append(f"Low visibility ({weather.visibility_km:.1f} km) violates VFR flight envelope.")
        elif weather.visibility_km < cls.MIN_SAFE_VISIBILITY_KM:
            vis_stat = "WARNING"
            reasons.append(f"Marginal visibility ({weather.visibility_km:.1f} km).")
        else:
            vis_stat = "SAFE"

        # 3. Precipitation Analysis
        if weather.precipitation_mm > cls.MAX_WARNING_PRECIP_MM:
            precip_stat = "CRITICAL"
            reasons.append(f"Heavy rain precipitation ({weather.precipitation_mm:.1f} mm/h).")
        elif weather.precipitation_mm > cls.MAX_SAFE_PRECIP_MM:
            precip_stat = "WARNING"
            reasons.append(f"Light rain precipitation ({weather.precipitation_mm:.1f} mm/h).")
        else:
            precip_stat = "SAFE"

        # Aggregate Risk Level
        if "CRITICAL" in {wind_stat, vis_stat, precip_stat}:
            overall = "CRITICAL"
        elif "WARNING" in {wind_stat, vis_stat, precip_stat}:
            overall = "WARNING"
        else:
            overall = "SAFE"

        return WeatherRiskReport(
            risk_level=overall,
            wind_status=wind_stat,
            visibility_status=vis_stat,
            precipitation_status=precip_stat,
            reasons=reasons or ["Meteorological conditions nominal. All parameters within safe limits."],
        )


# Global singleton
weather_analyzer = WeatherAnalyzer()
