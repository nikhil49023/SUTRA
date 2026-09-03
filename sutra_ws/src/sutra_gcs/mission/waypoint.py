"""
Smart Horizon GCS — Waypoint Model & Command Enums
Subsystem: Mission Engine (Phase 3)
"""

import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class WaypointCommand(str, Enum):
    """
    Supported autonomous waypoint action commands.
    """

    WAYPOINT = "WAYPOINT"
    TAKEOFF = "TAKEOFF"
    LAND = "LAND"
    LOITER = "LOITER"
    RTL = "RTL"


class AltitudeReference(str, Enum):
    """
    Altitude datum reference frames.
    """

    RELATIVE_TO_HOME = "RELATIVE_TO_HOME"
    TERRAIN_AGL = "TERRAIN_AGL"
    AMSL = "AMSL"


@dataclass(frozen=True)
class Waypoint:
    """
    Strongly-typed immutable 3D spatial waypoint model.
    """

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    index: int = 1
    latitude: float = 37.774929
    longitude: float = -122.419416
    altitude: float = 25.0
    altitude_reference: AltitudeReference = AltitudeReference.RELATIVE_TO_HOME
    speed: float = 5.0
    heading: float = 0.0
    hold_time: float = 0.0
    acceptance_radius: float = 1.8
    command: WaypointCommand = WaypointCommand.WAYPOINT
    loiter_radius: float = 10.0
    enabled: bool = True

    @property
    def altitude_agl(self) -> float:
        """Compatibility property for legacy views."""
        return self.altitude

    @property
    def speed_mps(self) -> float:
        """Compatibility property for legacy views."""
        return self.speed

    @property
    def hold_time_sec(self) -> float:
        """Compatibility property for legacy views."""
        return self.hold_time

    @property
    def action(self) -> str:
        """Compatibility property for legacy views."""
        return self.command.value
