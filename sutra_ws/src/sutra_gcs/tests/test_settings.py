"""
Smart Horizon GCS — Configuration Settings Unit Tests
Subsystem: Test Suite (Phase 1)
"""

import os
from pathlib import Path
from config.settings import Settings


def test_default_settings():
    """Verify standard default configuration values."""
    s = Settings()
    assert s.APP_NAME == "Smart Horizon GCS"
    assert s.APP_VERSION == "1.0.0"
    assert s.DEBUG is False
    assert s.SIMULATION_MODE is True
    assert s.DEFAULT_MAP_LAT == 37.774929
    assert s.DEFAULT_MAP_LNG == -122.419416
    assert s.LOG_LEVEL == "INFO"
    assert s.TELEMETRY_RATE == 10.0


def test_environment_overrides(monkeypatch):
    """Verify that environment variables cleanly override defaults."""
    monkeypatch.setenv("GCS_APP_NAME", "Custom SUTRA Station")
    monkeypatch.setenv("GCS_DEBUG", "true")
    monkeypatch.setenv("GCS_SIMULATION_MODE", "false")
    monkeypatch.setenv("GCS_DEFAULT_MAP_LAT", "40.7128")
    monkeypatch.setenv("GCS_DEFAULT_MAP_LNG", "-74.0060")
    monkeypatch.setenv("GCS_LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("GCS_TELEMETRY_RATE", "20.0")

    s = Settings.from_env()

    assert s.APP_NAME == "Custom SUTRA Station"
    assert s.DEBUG is True
    assert s.SIMULATION_MODE is False
    assert s.DEFAULT_MAP_LAT == 40.7128
    assert s.DEFAULT_MAP_LNG == -74.0060
    assert s.LOG_LEVEL == "DEBUG"
    assert s.TELEMETRY_RATE == 20.0
