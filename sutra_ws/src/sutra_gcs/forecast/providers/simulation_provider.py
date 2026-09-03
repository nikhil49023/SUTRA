"""
Smart Horizon GCS — Simulation Forecast Provider
Subsystem: Offline Disaster Scenarios & Dynamic Temporal Hazard Injection
"""

import math
import time
from typing import Dict, List, Optional

from ..base_provider import ForecastProvider
from ..models import ForecastHorizon, ForecastObservation, ProviderHealth, WarningLevel


class SimulationForecastProvider(ForecastProvider):
    """
    Deterministic, zero-network, offline disaster scenario forecast provider.
    Simulates approaching monsoon storms, flash floods, and cyclone rainfall ramps.
    """

    def __init__(
        self,
        scenario_name: str = "URBAN_FLASH_FLOOD_KEDARNATH",
        base_rainfall_rate: float = 25.0,
        peak_rainfall_rate: float = 85.0,
        peak_hour: float = 2.5,
    ):
        super().__init__(name="SIMULATION_FORECAST_ENGINE", cache_ttl_s=60.0)
        self.scenario_name = scenario_name
        self.base_rainfall_rate = base_rainfall_rate
        self.peak_rainfall_rate = peak_rainfall_rate
        self.peak_hour = peak_hour
        self._manual_override_events: List[Dict] = []

    def set_scenario(
        self, scenario_name: str, base_rate: float = 25.0, peak_rate: float = 85.0, peak_hour: float = 2.0
    ):
        self.scenario_name = scenario_name
        self.base_rainfall_rate = base_rate
        self.peak_rainfall_rate = peak_rate
        self.peak_hour = peak_hour
        self._cache.clear()

    def inject_event(self, event_type: str, severity: str, message: str, rainfall_boost: float = 20.0):
        """Allows live dynamic injection during hackathon / test demonstrations."""
        self._manual_override_events.append({
            "type": event_type,
            "severity": severity,
            "message": message,
            "boost": rainfall_boost,
            "timestamp": time.time(),
        })
        self._cache.clear()

    def _do_fetch(
        self, latitude: float, longitude: float, horizon_hours: int
    ) -> Optional[ForecastHorizon]:
        now = time.time()
        observations: List[ForecastObservation] = []

        total_accum = 0.0

        for h in range(horizon_hours + 1):
            valid_t = now + (h * 3600.0)
            # Bell-curve rainfall rate progression peaking around peak_hour
            diff = (h - self.peak_hour)
            curve = math.exp(-0.5 * (diff / 1.2) ** 2)
            rain_rate = self.base_rainfall_rate + (self.peak_rainfall_rate - self.base_rainfall_rate) * curve

            # Apply manual injection boosts if any
            for ev in self._manual_override_events:
                if (now - ev["timestamp"]) < 1800.0:  # Active for 30m
                    rain_rate += ev.get("boost", 15.0)

            total_accum += rain_rate * 1.0  # approximate hourly accumulation

            # Wind progression
            wind_speed = 4.0 + (rain_rate / 10.0) * 1.5
            wind_gusts = wind_speed * 1.45

            # Warning Level
            if rain_rate >= 65.0 or wind_gusts >= 15.0:
                wl = WarningLevel.RED
                headline = "EXTREME RED ALERT: Flash Flooding & Structural Inundation Expected"
            elif rain_rate >= 35.0:
                wl = WarningLevel.ORANGE
                headline = "ORANGE WARNING: Heavy Inundation & Rising River Swell"
            elif rain_rate >= 15.0:
                wl = WarningLevel.YELLOW
                headline = "YELLOW ADVISORY: Moderate Continuous Rainfall"
            else:
                wl = WarningLevel.GREEN
                headline = "GREEN: Light Precipitation"

            observations.append(
                ForecastObservation(
                    timestamp=now,
                    valid_from=valid_t,
                    valid_until=valid_t + 3600.0,
                    latitude=latitude,
                    longitude=longitude,
                    rainfall_mm=round(total_accum, 1),
                    rainfall_rate_mm_h=round(rain_rate, 1),
                    precipitation_probability=min(1.0, 0.4 + (rain_rate / 100.0)),
                    wind_speed_mps=round(wind_speed, 1),
                    wind_gusts_mps=round(wind_gusts, 1),
                    wind_direction_deg=225.0 + (h * 10.0) % 360.0,
                    temperature_c=23.0 - (h * 0.8),
                    humidity_pct=min(98.0, 70.0 + h * 6.0),
                    pressure_hpa=1012.0 - (h * 1.5),
                    warning_level=wl,
                    warning_headline=headline,
                    source=f"SIMULATION ({self.scenario_name})",
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
            provider_name="SIMULATION",
            provider_health=ProviderHealth.HEALTHY,
            stale_warning=None,
        )
