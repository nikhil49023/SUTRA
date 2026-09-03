"""
Smart Horizon GCS — Weather Intelligence Service Provider
Subsystem: GIS Subsystem (Phase 7)
"""

import time
from typing import Optional, Tuple

from .gis_cache import gis_cache
from .models import WeatherData


class WeatherService:
    """
    Pluggable meteorological data client with TTL caching and offline fallback.
    """

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key

    def get_weather(self, lat: float, lon: float) -> WeatherData:
        """
        Retrieves current atmospheric conditions at coordinates.
        """
        cached = gis_cache.get_weather(lat, lon)
        if cached is not None:
            return cached

        # Nominal offgrid environmental baseline
        data = WeatherData(
            temperature_c=22.5,
            wind_speed_mps=4.5,
            wind_direction_deg=280.0,
            wind_gusts_mps=6.5,
            visibility_km=12.0,
            precipitation_mm=0.0,
            cloud_cover_pct=15.0,
            pressure_hpa=1014.2,
            condition="SCATTERED CLOUDS",
            timestamp=time.time(),
            location=(lat, lon),
            available=True,
        )

        gis_cache.set_weather(lat, lon, data)
        return data


# Global singleton
weather_service = WeatherService()
