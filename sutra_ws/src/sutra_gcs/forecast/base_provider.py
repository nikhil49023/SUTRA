"""
Smart Horizon GCS — Abstract Forecast Provider Base Class
Subsystem: Forecast Ingestion Layer (Resilient, Fault-Tolerant, Cached)
"""

import abc
import logging
import time
from typing import Any, Dict, Optional, Tuple

from services.logging_service import get_logger
from .models import ForecastHorizon, ForecastObservation, ProviderHealth, WarningLevel

logger = get_logger("forecast_provider")


class ForecastProvider(abc.ABC):
    """
    Abstract interface for all meteorological and hazard forecast providers.
    Enforces caching, exponential backoff retries, timeout management, and stale data fallbacks.
    """

    def __init__(
        self,
        name: str,
        timeout_s: float = 4.0,
        cache_ttl_s: float = 300.0,
        max_retries: int = 3,
        stale_threshold_s: float = 1800.0,
    ):
        self.name = name
        self.timeout_s = timeout_s
        self.cache_ttl_s = cache_ttl_s
        self.max_retries = max_retries
        self.stale_threshold_s = stale_threshold_s

        self._cache: Dict[Tuple[float, float, int], Tuple[float, ForecastHorizon]] = {}
        self._last_successful_fetch: float = 0.0
        self._consecutive_failures: int = 0
        self._health: ProviderHealth = ProviderHealth.HEALTHY
        self._last_error_reason: Optional[str] = None

    @property
    def health(self) -> ProviderHealth:
        if self._health == ProviderHealth.OFFLINE:
            return ProviderHealth.OFFLINE
        if self._last_successful_fetch > 0 and (time.time() - self._last_successful_fetch) > self.stale_threshold_s:
            return ProviderHealth.STALE
        if self._consecutive_failures > 0:
            return ProviderHealth.DEGRADED
        return self._health

    def get_forecast(
        self,
        latitude: float,
        longitude: float,
        horizon_hours: int = 4,
        force_refresh: bool = False,
    ) -> ForecastHorizon:
        """
        Retrieves a normalized temporal forecast horizon with caching and resilience fallbacks.
        """
        cache_key = (round(latitude, 4), round(longitude, 4), horizon_hours)
        now = time.time()

        # 1. Check in-memory cache if not forced
        if not force_refresh and cache_key in self._cache:
            cached_time, cached_horizon = self._cache[cache_key]
            age = now - cached_time
            if age < self.cache_ttl_s:
                # Update freshness on return
                updated_obs = [
                    self._update_observation_freshness(o, now) for o in cached_horizon.observations
                ]
                return ForecastHorizon(
                    reference_time=now,
                    horizon_hours=horizon_hours,
                    observations=updated_obs,
                    provider_name=self.name,
                    provider_health=self.health,
                    stale_warning=None,
                )

        # 2. Attempt fetch with retries
        horizon = self._fetch_with_retries(latitude, longitude, horizon_hours)
        if horizon:
            self._cache[cache_key] = (now, horizon)
            self._last_successful_fetch = now
            self._consecutive_failures = 0
            self._health = ProviderHealth.HEALTHY
            self._last_error_reason = None
            return horizon

        # 3. Fallback to Stale Cache if available
        if cache_key in self._cache:
            _, stale_horizon = self._cache[cache_key]
            stale_age = now - self._last_successful_fetch
            logger.warning(
                f"[{self.name}] Fetch failed; serving stale cached forecast (age: {stale_age:.0f}s)"
            )
            updated_obs = [
                self._update_observation_freshness(o, now, is_stale=True)
                for o in stale_horizon.observations
            ]
            return ForecastHorizon(
                reference_time=now,
                horizon_hours=horizon_hours,
                observations=updated_obs,
                provider_name=self.name,
                provider_health=ProviderHealth.STALE,
                stale_warning=f"Forecast is stale ({stale_age:.0f}s old). Provider fetch failed: {self._last_error_reason}",
            )

        # 4. Emergency Conservative Fallback
        logger.error(f"[{self.name}] No cache available; generating conservative safe fallback.")
        return self._generate_conservative_fallback(latitude, longitude, horizon_hours, now)

    def _fetch_with_retries(
        self, latitude: float, longitude: float, horizon_hours: int
    ) -> Optional[ForecastHorizon]:
        backoff = 0.5
        for attempt in range(1, self.max_retries + 1):
            try:
                horizon = self._do_fetch(latitude, longitude, horizon_hours)
                if horizon and self._validate_horizon(horizon):
                    return horizon
            except Exception as e:
                self._last_error_reason = str(e)
                logger.warning(
                    f"[{self.name}] Fetch attempt {attempt}/{self.max_retries} failed: {e}"
                )
                time.sleep(backoff)
                backoff *= 2.0

        self._consecutive_failures += 1
        if self._consecutive_failures >= self.max_retries * 2:
            self._health = ProviderHealth.OFFLINE
        else:
            self._health = ProviderHealth.DEGRADED
        return None

    @abc.abstractmethod
    def _do_fetch(
        self, latitude: float, longitude: float, horizon_hours: int
    ) -> Optional[ForecastHorizon]:
        """Specific provider implementation to fetch and parse external or simulated data."""
        pass

    def _validate_horizon(self, horizon: ForecastHorizon) -> bool:
        """Validates that observations conform to physical meteorological bounds."""
        if not horizon.observations:
            return False
        for obs in horizon.observations:
            if not (-90.0 <= obs.latitude <= 90.0 and -180.0 <= obs.longitude <= 180.0):
                return False
            if obs.rainfall_rate_mm_h < 0.0 or obs.rainfall_rate_mm_h > 500.0:
                return False
            if obs.wind_speed_mps < 0.0 or obs.wind_speed_mps > 100.0:
                return False
            if obs.confidence < 0.0 or obs.confidence > 1.0:
                return False
        return True

    def _update_observation_freshness(
        self, obs: ForecastObservation, current_time: float, is_stale: bool = False
    ) -> ForecastObservation:
        age = max(0.0, current_time - obs.source_timestamp)
        return ForecastObservation(
            timestamp=current_time,
            valid_from=obs.valid_from,
            valid_until=obs.valid_until,
            latitude=obs.latitude,
            longitude=obs.longitude,
            rainfall_mm=obs.rainfall_mm,
            rainfall_rate_mm_h=obs.rainfall_rate_mm_h,
            precipitation_probability=obs.precipitation_probability,
            wind_speed_mps=obs.wind_speed_mps,
            wind_gusts_mps=obs.wind_gusts_mps,
            wind_direction_deg=obs.wind_direction_deg,
            temperature_c=obs.temperature_c,
            humidity_pct=obs.humidity_pct,
            pressure_hpa=obs.pressure_hpa,
            warning_level=obs.warning_level,
            warning_headline=obs.warning_headline,
            source=obs.source,
            source_timestamp=obs.source_timestamp,
            confidence=max(0.2, obs.confidence * (0.95 if is_stale else 1.0)),
            freshness_s=age,
            is_stale=is_stale or (age > self.stale_threshold_s),
        )

    def _generate_conservative_fallback(
        self, latitude: float, longitude: float, horizon_hours: int, now: float
    ) -> ForecastHorizon:
        """Constructs a high-uncertainty conservative fallback when all data streams fail."""
        observations = []
        for h in range(horizon_hours + 1):
            valid_t = now + (h * 3600.0)
            observations.append(
                ForecastObservation(
                    timestamp=now,
                    valid_from=valid_t,
                    valid_until=valid_t + 3600.0,
                    latitude=latitude,
                    longitude=longitude,
                    rainfall_mm=10.0 * h,
                    rainfall_rate_mm_h=10.0,
                    precipitation_probability=0.5,
                    wind_speed_mps=6.0,
                    wind_gusts_mps=9.0,
                    wind_direction_deg=270.0,
                    temperature_c=22.0,
                    warning_level=WarningLevel.YELLOW,
                    warning_headline="CAUTION: Offline Conservative Fallback Active",
                    source=f"{self.name}_FALLBACK",
                    source_timestamp=now,
                    confidence=0.40,
                    freshness_s=0.0,
                    is_stale=True,
                )
            )
        return ForecastHorizon(
            reference_time=now,
            horizon_hours=horizon_hours,
            observations=observations,
            provider_name=self.name,
            provider_health=ProviderHealth.OFFLINE,
            stale_warning=f"Critical: External provider {self.name} unavailable. Operating on conservative safety model.",
        )
