"""
Unit & Integration Tests — Forecast Ingestion & Multi-Provider Health
Subsystem: Predictive Disaster Risk Engine (Production-Grade Testing)
"""

import time
import pytest
from forecast.base_provider import ForecastProvider
from forecast.models import ForecastHorizon, ForecastObservation, ProviderHealth, WarningLevel
from forecast.providers.imd_provider import IMDProvider
from forecast.providers.simulation_provider import SimulationForecastProvider
from forecast.providers.weather_api_provider import WeatherAPIProvider
from forecast.forecast_service import ForecastService


class FaultyProvider(ForecastProvider):
    """Simulates network timeout / external API outage."""
    def __init__(self):
        super().__init__(name="FAULTY_MOCK_API", timeout_s=0.1, max_retries=1)

    def _do_fetch(self, latitude: float, longitude: float, horizon_hours: int):
        raise ConnectionResetError("Remote meteorological API connection refused.")


def test_forecast_observation_schema():
    obs = ForecastObservation(
        latitude=37.7749,
        longitude=-122.4194,
        rainfall_rate_mm_h=35.5,
        wind_speed_mps=8.2,
        warning_level=WarningLevel.ORANGE,
    )
    d = obs.to_dict()
    assert d["rainfall_rate_mm_h"] == 35.5
    assert d["wind_speed_mps"] == 8.2
    assert d["warning_level"] == "ORANGE"
    assert d["is_stale"] is False


def test_simulation_provider_deterministic_curve():
    sim = SimulationForecastProvider(
        scenario_name="KEDARNATH_FLASH_FLOOD",
        base_rainfall_rate=20.0,
        peak_rainfall_rate=80.0,
        peak_hour=2.0,
    )
    horizon = sim.get_forecast(37.7749, -122.4194, horizon_hours=4)
    assert horizon.provider_name == "SIMULATION"
    assert horizon.provider_health == ProviderHealth.HEALTHY
    assert len(horizon.observations) == 5

    # Peak should occur at +2h
    obs_0 = horizon.get_observation_at(0.0)
    obs_2 = horizon.get_observation_at(2.0)
    obs_4 = horizon.get_observation_at(4.0)

    assert obs_2.rainfall_rate_mm_h > obs_0.rainfall_rate_mm_h
    assert obs_2.rainfall_rate_mm_h >= 75.0
    assert obs_2.warning_level in (WarningLevel.ORANGE, WarningLevel.RED)


def test_imd_and_weather_api_providers():
    imd = IMDProvider()
    h_imd = imd.get_forecast(37.7749, -122.4194, horizon_hours=3)
    assert h_imd.provider_name == "IMD"
    assert len(h_imd.observations) == 4

    wapi = WeatherAPIProvider()
    h_wapi = wapi.get_forecast(37.7749, -122.4194, horizon_hours=3)
    assert h_wapi.provider_name == "WEATHER_API"
    assert len(h_wapi.observations) == 4


def test_fault_tolerance_and_conservative_fallback():
    faulty = FaultyProvider()
    horizon = faulty.get_forecast(37.7749, -122.4194, horizon_hours=3)
    assert horizon.provider_health == ProviderHealth.OFFLINE
    assert horizon.stale_warning is not None
    assert len(horizon.observations) == 4
    assert horizon.observations[0].is_stale is True


def test_forecast_service_failover_and_dynamic_injection():
    svc = ForecastService(default_provider_type="SIMULATION")
    h = svc.get_forecast_horizon()
    assert h.provider_name == "SIMULATION"

    # Inject dynamic cloudburst event
    res = svc.inject_disaster_event(
        event_type="CLOUD_BURST_EVENT",
        severity="CRITICAL",
        message="Simulated extreme flash flood escalation",
        rainfall_boost=40.0,
    )
    assert res["injected"] is True
    assert res["current_rate"] >= 50.0

    health = svc.get_health_status()
    assert health["overall_health"] == "HEALTHY"
