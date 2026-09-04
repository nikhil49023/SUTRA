"""
Smart Horizon GCS — Centralized Application Settings & Configuration
Subsystem: Core Configuration
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass(frozen=True)
class Settings:
    """
    Type-safe, immutable application configuration with environment variable overrides.
    """

    APP_NAME: str = "Smart Horizon GCS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SIMULATION_MODE: bool = True
    WEBSOCKET_URL: str = "ws://127.0.0.1:8080/ws"
    MAVLINK_CONNECTION: str = "udpin:127.0.0.1:14540"
    DEFAULT_MAP_LAT: float = 37.774929
    DEFAULT_MAP_LNG: float = -122.419416
    DEFAULT_MAP_ZOOM: float = 16.0
    LOG_LEVEL: str = "INFO"
    DATA_DIRECTORY: Path = field(default_factory=lambda: Path("./data"))
    RECONNECT_INTERVAL: float = 2.0
    TELEMETRY_RATE: float = 10.0

    @classmethod
    def from_env(cls) -> "Settings":
        """
        Loads settings with environment variable overrides.
        """
        def _get_bool(key: str, default: bool) -> bool:
            val = os.getenv(key)
            if val is None:
                return default
            return val.lower() in ("true", "1", "yes", "on")

        def _get_float(key: str, default: float) -> float:
            val = os.getenv(key)
            if val is None:
                return default
            try:
                return float(val)
            except ValueError:
                return default

        return cls(
            APP_NAME=os.getenv("GCS_APP_NAME", "Smart Horizon GCS"),
            APP_VERSION=os.getenv("GCS_APP_VERSION", "1.0.0"),
            DEBUG=_get_bool("GCS_DEBUG", False),
            SIMULATION_MODE=_get_bool("GCS_SIMULATION_MODE", True),
            WEBSOCKET_URL=os.getenv("GCS_WEBSOCKET_URL", "ws://127.0.0.1:8080/ws"),
            MAVLINK_CONNECTION=os.getenv("GCS_MAVLINK_CONNECTION", "udpin:127.0.0.1:14540"),
            DEFAULT_MAP_LAT=_get_float("GCS_DEFAULT_MAP_LAT", 37.774929),
            DEFAULT_MAP_LNG=_get_float("GCS_DEFAULT_MAP_LNG", -122.419416),
            DEFAULT_MAP_ZOOM=_get_float("GCS_DEFAULT_MAP_ZOOM", 16.0),
            LOG_LEVEL=os.getenv("GCS_LOG_LEVEL", "INFO").upper(),
            DATA_DIRECTORY=Path(os.getenv("GCS_DATA_DIRECTORY", "./data")),
            RECONNECT_INTERVAL=_get_float("GCS_RECONNECT_INTERVAL", 2.0),
            TELEMETRY_RATE=_get_float("GCS_TELEMETRY_RATE", 10.0),
        )


_global_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Returns the global Settings instance, initializing from environment if necessary."""
    global _global_settings
    if _global_settings is None:
        _global_settings = Settings.from_env()
    return _global_settings


# Global settings singleton
settings = get_settings()
