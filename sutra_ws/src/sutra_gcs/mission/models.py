"""
SUTRA GCS — Mission & Waypoint Data Models
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum


class MissionAction(str, Enum):
    WAYPOINT = "WAYPOINT"
    TAKEOFF = "TAKEOFF"
    LOITER = "LOITER"
    LAND = "LAND"
    RTL = "RTL"
    SURVEY_GRID = "SURVEY_GRID"


@dataclass
class Waypoint:
    index: int
    lat: float
    lon: float
    alt_agl: float = 20.0
    speed_mps: float = 5.0
    action: MissionAction = MissionAction.WAYPOINT
    hold_time_sec: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "lat": self.lat,
            "lon": self.lon,
            "alt": self.alt_agl,
            "speed": self.speed_mps,
            "action": self.action.value,
            "hold_time": self.hold_time_sec
        }


@dataclass
class MissionPlan:
    id: str = "mission_01"
    name: str = "Tactical SAR Route"
    waypoints: List[Waypoint] = field(default_factory=list)
    auto_start: bool = True
