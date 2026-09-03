"""
SUTRA GCS — Atmospheric Weather & Wind Simulator
"""

import time
import math
from typing import Dict, Any


class WeatherEngine:
    """Provides atmospheric environmental readings and wind vector models."""

    @staticmethod
    def get_conditions() -> Dict[str, Any]:
        t = time.time() * 0.05
        wind_spd = 3.5 + math.sin(t) * 1.2
        wind_dir = (240 + int(math.cos(t * 0.5) * 15)) % 360

        return {
            "temperature_c": 19.5,
            "humidity_pct": 62,
            "pressure_hpa": 1013.25,
            "visibility_km": 15.0,
            "wind_speed_mps": round(wind_spd, 1),
            "wind_direction_deg": wind_dir,
            "wind_gust_mps": round(wind_spd * 1.6, 1),
            "flyability_index": "OPTIMAL (GREEN)" if wind_spd < 8.0 else "CAUTION (YELLOW)"
        }


weather_engine = WeatherEngine()
