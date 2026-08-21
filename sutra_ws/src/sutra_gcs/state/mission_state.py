"""
Smart Horizon GCS — Mission State & Lifecycle Model
Subsystem: State Management
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class MissionStateEnum(str, Enum):
    """
    Standard lifecycle states for autonomous mission execution.
    """

    IDLE = "IDLE"
    PLANNING = "PLANNING"
    VALIDATING = "VALIDATING"
    READY = "READY"
    UPLOADING = "UPLOADING"
    ARMING = "ARMING"
    TAKEOFF = "TAKEOFF"
    MISSION = "MISSION"
    HOLD = "HOLD"
    RTL = "RTL"
    LANDING = "LANDING"
    COMPLETE = "COMPLETE"
    ABORTED = "ABORTED"
    EMERGENCY = "EMERGENCY"


@dataclass(frozen=True)
class Waypoint:
    """
    3D Spatial waypoint setpoint.
    """

    index: int
    latitude: float
    longitude: float
    altitude_agl: float = 20.0
    speed_mps: float = 5.0
    hold_time_sec: float = 0.0
    action: str = "WAYPOINT"


@dataclass(frozen=True)
class MissionState:
    """
    Type-safe immutable representation of current mission configuration and flight progress.
    """

    mission_id: str = ""
    mission_name: str = "Default Mission"
    state: MissionStateEnum = MissionStateEnum.IDLE
    waypoints: List[Waypoint] = field(default_factory=list)
    active_waypoint_index: int = 0
    mission_progress: float = 0.0
    distance_remaining: float = 0.0
    estimated_time_remaining: float = 0.0
    estimated_battery_required: float = 0.0
    risk_level: str = "LOW"
    validation_status: str = "UNVALIDATED"
    mission_started_at: Optional[float] = None
    mission_completed_at: Optional[float] = None
