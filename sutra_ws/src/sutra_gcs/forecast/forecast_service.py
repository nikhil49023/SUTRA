"""
Smart Horizon GCS — Master Forecast Service Orchestrator
Subsystem: Forecast Ingestion & Multi-Provider Health Management
"""

import threading
import time
from typing import Any, Dict, List, Optional

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from .base_provider import ForecastProvider
from .models import FeedStatus, ForecastHorizon, ForecastObservation, ProviderHealth, WarningLevel
from .providers.imd_provider import IMDProvider
from .providers.simulation_provider import SimulationForecastProvider
from .providers.weather_api_provider import WeatherAPIProvider

logger = get_logger("forecast_service")


class ForecastService:
    """
    Central forecast coordinator managing provider selection, automatic failover,
    periodic refresh cycles, and event broadcasting.
    """

    def __init__(self, default_provider_type: str = "SIMULATION"):
        self.event_bus: EventBus = get_event_bus()
        self.providers: Dict[str, ForecastProvider] = {
            "SIMULATION": SimulationForecastProvider(),
            "IMD": IMDProvider(),
            "WEATHER_API": WeatherAPIProvider(),
        }
        self.active_provider_name: str = default_provider_type
        self.default_lat: float = 37.774929
        self.default_lon: float = -122.419416
        self.horizon_hours: int = 4
        self.refresh_interval_s: float = 120.0

        self._current_horizon: Optional[ForecastHorizon] = None
        self._lock = threading.Lock()
        self._running = False
        self._thread: Optional[threading.Thread] = None

        self.offline_mesh_mode: bool = False

        # Eagerly initialize first forecast
        self.refresh_forecast()

    @property
    def active_provider(self) -> ForecastProvider:
        return self.providers.get(self.active_provider_name, self.providers["SIMULATION"])

    def set_offline_disaster_mode(self, enabled: bool) -> None:
        """Enables resilient offline disaster mode using cached alerts and local 802.11s mesh."""
        self.offline_mesh_mode = enabled
        if self._current_horizon:
            self._current_horizon.offline_mesh_mode = enabled
        logger.info(f"[ForecastService] Offline Disaster Mesh Mode set to {enabled}")
        self.refresh_forecast(force_refresh=True)

    def set_active_provider(self, provider_name: str) -> bool:
        normalized = provider_name.upper()
        if normalized in self.providers:
            self.active_provider_name = normalized
            logger.info(f"[ForecastService] Switched active provider to {normalized}")
            self.refresh_forecast(force_refresh=True)
            return True
        logger.warning(f"[ForecastService] Unknown provider {provider_name}")
        return False

    def set_default_coordinates(self, latitude: float, longitude: float) -> None:
        """Sets the geographical coordinates of the operational theater and refetches forecast."""
        self.default_lat = latitude
        self.default_lon = longitude
        self.get_forecast_horizon(force_refresh=True)
        logger.info(f"Updated operational forecast coordinates to [{latitude:.6f}, {longitude:.6f}]")

    def get_forecast_horizon(
        self,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        force_refresh: bool = False,
    ) -> ForecastHorizon:
        lat = latitude if latitude is not None else self.default_lat
        lon = longitude if longitude is not None else self.default_lon

        with self._lock:
            if not force_refresh and self._current_horizon and not self._current_horizon.observations[0].is_stale:
                return self._current_horizon

        # Fetch from active provider with fallback to SIMULATION
        horizon = self.active_provider.get_forecast(
            lat, lon, self.horizon_hours, force_refresh=force_refresh
        )

        if horizon.provider_health in (ProviderHealth.OFFLINE, ProviderHealth.DEGRADED) and self.active_provider_name != "SIMULATION":
            logger.warning(f"[ForecastService] Provider {self.active_provider_name} degraded. Falling back to SIMULATION.")
            sim_horizon = self.providers["SIMULATION"].get_forecast(lat, lon, self.horizon_hours)
            horizon = sim_horizon

        if self.offline_mesh_mode:
            horizon.offline_mesh_mode = True
            horizon.feed_status = FeedStatus.OFFLINE_MESH_CACHE

        with self._lock:
            self._current_horizon = horizon

        return horizon

    def refresh_forecast(self, force_refresh: bool = False) -> ForecastHorizon:
        horizon = self.get_forecast_horizon(force_refresh=force_refresh)
        self.event_bus.emit(
            "forecast.updated",
            payload=horizon.to_dict(),
            source="forecast_service",
        )
        return horizon

    def inject_disaster_event(
        self,
        event_type: str = "CLOUD_BURST",
        severity: str = "CRITICAL",
        message: str = "Severe flash flood warning",
        rainfall_boost: float = 35.0,
    ) -> Dict:
        """Injects dynamic storm escalation during live simulation."""
        sim = self.providers.get("SIMULATION")
        if isinstance(sim, SimulationForecastProvider):
            sim.inject_event(event_type, severity, message, rainfall_boost)
            self.active_provider_name = "SIMULATION"
            horizon = self.refresh_forecast(force_refresh=True)
            logger.warning(f"[ForecastService] Injected disaster event: {event_type} (+{rainfall_boost}mm/h)")
            return {
                "injected": True,
                "event_type": event_type,
                "current_rate": horizon.observations[0].rainfall_rate_mm_h,
                "warning_level": horizon.observations[0].warning_level.value,
            }
        return {"injected": False, "error": "Simulation provider unavailable"}

    def get_health_status(self) -> Dict[str, Any]:
        return {
            "active_provider": self.active_provider_name,
            "overall_health": self.active_provider.health.value,
            "providers": {
                name: {
                    "health": p.health.value,
                    "last_fetch_age_s": time.time() - p._last_successful_fetch if p._last_successful_fetch > 0 else -1,
                    "consecutive_failures": p._consecutive_failures,
                }
                for name, p in self.providers.items()
            },
        }

    def start_background_sync(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._sync_loop, daemon=True, name="ForecastSyncThread")
        self._thread.start()
        logger.info("[ForecastService] Background forecast sync started.")

    def stop_background_sync(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)
        logger.info("[ForecastService] Background forecast sync stopped.")

    def _sync_loop(self):
        while self._running:
            time.sleep(self.refresh_interval_s)
            if self._running:
                try:
                    self.refresh_forecast()
                except Exception as e:
                    logger.error(f"[ForecastService] Sync cycle failed: {e}")


# Singleton access
_global_forecast_service: Optional[ForecastService] = None


def get_forecast_service() -> ForecastService:
    global _global_forecast_service
    if _global_forecast_service is None:
        _global_forecast_service = ForecastService()
    return _global_forecast_service
