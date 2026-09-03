"""
Smart Horizon GCS — Real-Time Live Weather API / Global NWP Provider
Subsystem: Live Meteorological Ingestion (Open-Meteo / ECMWF / GFS)
"""

import json
import time
import urllib.request
import urllib.parse
from typing import Optional

from ..base_provider import ForecastProvider
from ..models import ForecastHorizon, ForecastObservation, ProviderHealth, WarningLevel


class WeatherAPIProvider(ForecastProvider):
    """
    Live real-time meteorological forecast provider fetching global NWP hourly observations
    directly from Open-Meteo (ECMWF 9km / GFS 13km / ICON ensemble).
    """

    def __init__(self, base_url: str = "https://api.open-meteo.com/v1/forecast"):
        super().__init__(name="OPEN_METEO_LIVE_NWP", timeout_s=3.0, cache_ttl_s=300.0)
        self.base_url = base_url

    def _do_fetch(
        self, latitude: float, longitude: float, horizon_hours: int
    ) -> Optional[ForecastHorizon]:
        now = time.time()
        
        # Build query params for real live weather fetch
        params = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "hourly": "precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,relative_humidity_2m,surface_pressure",
            "forecast_days": 1,
            "wind_speed_unit": "ms",
        }
        url = f"{self.base_url}?{urllib.parse.urlencode(params)}"
        
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "SUTRA-GCS-Disaster-Swarm/1.0 (Research Prototype)"}
        )
        
        with urllib.request.urlopen(req, timeout=self.timeout_s) as response:
            if response.status != 200:
                raise ValueError(f"HTTP {response.status}: {response.reason}")
            data = json.loads(response.read().decode("utf-8"))

        hourly = data.get("hourly", {})
        precips = hourly.get("precipitation", [])
        probs = hourly.get("precipitation_probability", [])
        winds = hourly.get("wind_speed_10m", [])
        gusts = hourly.get("wind_gusts_10m", [])
        dirs = hourly.get("wind_direction_10m", [])
        temps = hourly.get("temperature_2m", [])
        humids = hourly.get("relative_humidity_2m", [])
        pressures = hourly.get("surface_pressure", [])

        observations = []
        total_accum = 0.0

        for h in range(horizon_hours + 1):
            valid_t = now + (h * 3600.0)
            
            rain_rate = float(precips[h]) if h < len(precips) and precips[h] is not None else 0.0
            prob = float(probs[h]) / 100.0 if h < len(probs) and probs[h] is not None else 0.2
            wind = float(winds[h]) if h < len(winds) and winds[h] is not None else 3.5
            gust = float(gusts[h]) if h < len(gusts) and gusts[h] is not None else wind * 1.3
            wdir = float(dirs[h]) if h < len(dirs) and dirs[h] is not None else 240.0
            temp = float(temps[h]) if h < len(temps) and temps[h] is not None else 24.0
            humid = float(humids[h]) if h < len(humids) and humids[h] is not None else 65.0
            press = float(pressures[h]) if h < len(pressures) and pressures[h] is not None else 1013.2

            total_accum += rain_rate

            # Warning classification based on live readings
            if rain_rate >= 65.0 or wind >= 15.0:
                wl = WarningLevel.RED
                headline = "LIVE ALERT: Torrential Precipitation & High Wind Gale"
            elif rain_rate >= 35.0 or wind >= 12.0:
                wl = WarningLevel.ORANGE
                headline = "LIVE WARNING: Heavy Rainfall & Gusty Conditions"
            elif rain_rate >= 15.0:
                wl = WarningLevel.YELLOW
                headline = "LIVE ADVISORY: Moderate Continuous Rainfall"
            else:
                wl = WarningLevel.GREEN
                headline = "LIVE NWP: Nominal Weather Conditions"

            observations.append(
                ForecastObservation(
                    timestamp=now,
                    valid_from=valid_t,
                    valid_until=valid_t + 3600.0,
                    latitude=latitude,
                    longitude=longitude,
                    rainfall_mm=round(total_accum, 2),
                    rainfall_rate_mm_h=round(rain_rate, 2),
                    precipitation_probability=round(prob, 2),
                    wind_speed_mps=round(wind, 2),
                    wind_gusts_mps=round(gust, 2),
                    wind_direction_deg=round(wdir, 1),
                    temperature_c=round(temp, 1),
                    humidity_pct=round(humid, 1),
                    pressure_hpa=round(press, 1),
                    warning_level=wl,
                    warning_headline=headline,
                    source="OPEN_METEO_LIVE_NWP",
                    source_timestamp=now,
                    confidence=0.92,
                    freshness_s=0.0,
                    is_stale=False,
                )
            )

        return ForecastHorizon(
            reference_time=now,
            horizon_hours=horizon_hours,
            observations=observations,
            provider_name="OPEN_METEO_LIVE",
            provider_health=ProviderHealth.HEALTHY,
        )
