"""
Smart Horizon GCS — Mission Aggregate Model & Status Enum
Subsystem: Mission Engine (Phase 3)
"""

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional

from .waypoint import Waypoint, WaypointCommand


class MissionStatus(str, Enum):
    """
    Planning and execution status of the mission flight plan.
    """

    EMPTY = "EMPTY"
    PLANNING = "PLANNING"
    VALIDATING = "VALIDATING"
    READY = "READY"
    RUNNING = "RUNNING"
    HOLD = "HOLD"
    RTL = "RTL"
    COMPLETED = "COMPLETED"
    ABORTED = "ABORTED"
    INVALID = "INVALID"


@dataclass(frozen=True)
class Mission:
    """
    Strongly typed immutable mission domain object.
    """

    mission_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Tactical Search Grid"
    description: str = "Autonomous UAV Search and Reconnaissance Corridor"
    waypoints: List[Waypoint] = field(default_factory=list)
    home_latitude: float = 37.774929
    home_longitude: float = -122.419416
    default_altitude: float = 25.0
    default_speed: float = 5.0
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    active_waypoint: int = 1
    status: MissionStatus = MissionStatus.EMPTY
    selected_waypoint_id: Optional[str] = None


# Backward compatibility alias
MissionAction = WaypointCommand
