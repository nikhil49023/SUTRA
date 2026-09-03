"""
Smart Horizon GCS — Primary Flight Display & Tactical HUD Normalized Data Model
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class UnitSystem(str, Enum):
    METRIC = "METRIC"
    IMPERIAL = "IMPERIAL"


class GPSFixType(str, Enum):
    NO_FIX = "NO FIX"
    FIX_2D = "2D FIX"
    FIX_3D = "3D FIX"
    RTK_FLOAT = "RTK FLOAT"
    RTK_FIXED = "RTK FIXED"
    UNKNOWN = "UNKNOWN"


class GeofenceHUDStatus(str, Enum):
    CLEAR = "CLEAR"
    WARNING = "WARNING"
    BREACH = "BREACH"


@dataclass(frozen=True)
class HUDModel:
    """
    Strongly-typed, single-source-of-truth normalized presentation model for HUD instruments.
    """

    drone_id: str = "drone_alpha"
    callsign: str = "ALPHA-1 (LEADER)"
    latitude: float = 37.774929
    longitude: float = -122.419416
    altitude_msl: float = 65.0
    altitude_agl: float = 25.0
    ground_speed: float = 12.5
    air_speed: Optional[float] = 13.0
    vertical_speed: float = 0.0
    heading: float = 90.0
    pitch: float = 0.0
    roll: float = 0.0
    battery_percent: float = 85.0
    battery_voltage: float = 15.6
    rth_reserve_percent: float = 25.0
    gps_fix: GPSFixType = GPSFixType.FIX_3D
    satellites: int = 18
    hdop: float = 0.8
    link_quality: str = "EXCELLENT"
    latency_ms: float = 24.0
    ws_state: str = "READY"
    mavlink_state: str = "CONNECTED"
    heartbeat_ok: bool = True
    flight_mode: str = "AUTO"
    mission_name: str = "SURVEY_ALPHA"
    mission_state: str = "ACTIVE"
    current_waypoint: int = 2
    total_waypoints: int = 6
    distance_to_waypoint: float = 340.0
    distance_remaining: float = 1850.0
    mission_progress: float = 33.3
    eta_seconds: float = 148.0
    geofence_status: GeofenceHUDStatus = GeofenceHUDStatus.CLEAR
    formation: str = "V_FORMATION"
    formation_role: str = "LEADER"
    swarm_count: int = 4
    risk_level: str = "LOW"
    is_stale: bool = False
    is_link_lost: bool = False
    data_age_sec: float = 0.0
    timestamp: float = field(default_factory=time.time)
