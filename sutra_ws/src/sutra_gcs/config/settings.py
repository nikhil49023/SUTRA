"""
SUTRA GCS — Central Configuration & Runtime Settings
"""

import os
from dataclasses import dataclass, field
from typing import List, Dict, Any


@dataclass
class NetworkConfig:
    http_host: str = "0.0.0.0"
    http_port: int = 5000
    websocket_port: int = 8080
    mavlink_udp_port: int = 14540
    ardupilot_udp_port: int = 14550


@dataclass
class GeodeticOrigin:
    lat: float = 37.774929
    lon: float = -122.419416
    alt_msl: float = 45.0  # Base GCS Ground Elevation


@dataclass
class FailsafeConfig:
    max_geofence_radius_m: float = 500.0
    min_altitude_agl_m: float = 2.0
    max_altitude_agl_m: float = 120.0
    critical_battery_pct: float = 20.0
    min_rtl_battery_reserve_pct: float = 25.0
    comms_loss_timeout_sec: float = 3.0
    orca_safety_clearance_m: float = 3.0  # Gate G5 threshold: > 2.8m


@dataclass
class Settings:
    app_name: str = "SUTRA Tactical Ground Control Station"
    version: str = "2.1.0-PYTHON"
    debug: bool = False
    network: NetworkConfig = field(default_factory=NetworkConfig)
    origin: GeodeticOrigin = field(default_factory=GeodeticOrigin)
    failsafe: FailsafeConfig = field(default_factory=FailsafeConfig)


# Global settings singleton
settings = Settings()
