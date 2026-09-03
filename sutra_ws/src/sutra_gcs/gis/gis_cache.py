"""
Smart Horizon GCS — In-Memory & TTL Spatial Cache for GIS Analytics
Subsystem: GIS Subsystem (Phase 7)
"""

import time
from typing import Any, Dict, Optional, Tuple


class GISCache:
    """
    Time-bounded cache for spatial queries, elevation tiles, weather forecasts,
    and ray-traced Line-of-Sight results.
    """

    def __init__(self, default_ttl_sec: float = 300.0, max_entries: int = 2000) -> None:
        self.default_ttl_sec = default_ttl_sec
        self.max_entries = max_entries
        self._elevation_cache: Dict[Tuple[float, float], Tuple[float, float]] = {}  # (lat, lon) -> (elev, timestamp)
        self._weather_cache: Dict[Tuple[float, float], Tuple[Any, float]] = {}
        self._generic_cache: Dict[str, Tuple[Any, float]] = {}

    def get_elevation(self, lat: float, lon: float) -> Optional[float]:
        key = (round(lat, 5), round(lon, 5))
        if key in self._elevation_cache:
            elev, t = self._elevation_cache[key]
            if time.time() - t < self.default_ttl_sec:
                return elev
            del self._elevation_cache[key]
        return None

    def set_elevation(self, lat: float, lon: float, elevation_m: float) -> None:
        if len(self._elevation_cache) >= self.max_entries:
            # Pop oldest
            oldest_key = next(iter(self._elevation_cache.keys()))
            del self._elevation_cache[oldest_key]
        key = (round(lat, 5), round(lon, 5))
        self._elevation_cache[key] = (elevation_m, time.time())

    def get_weather(self, lat: float, lon: float) -> Optional[Any]:
        key = (round(lat, 2), round(lon, 2))
        if key in self._weather_cache:
            data, t = self._weather_cache[key]
            if time.time() - t < 600.0:  # 10 min TTL for weather
                return data
            del self._weather_cache[key]
        return None

    def set_weather(self, lat: float, lon: float, data: Any) -> None:
        key = (round(lat, 2), round(lon, 2))
        self._weather_cache[key] = (data, time.time())

    def clear(self) -> None:
        self._elevation_cache.clear()
        self._weather_cache.clear()
        self._generic_cache.clear()


# Global GIS Cache Singleton
gis_cache = GISCache()
