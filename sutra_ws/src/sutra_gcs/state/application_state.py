"""
SUTRA GCS — Global Application State
"""

from typing import Dict, Any
from enum import Enum


class AppFlightMode(str, Enum):
    MANUAL = "MANUAL"
    ARMED = "ARMED"
    TAKEOFF = "TAKEOFF"
    WAYPOINT_NAV = "WAYPOINT_NAV"
    LOITER = "LOITER"
    GRID_SEARCH = "GRID_SEARCH"
    RTL = "RTL"
    LAND = "LAND"
    EMERGENCY = "EMERGENCY"


class ApplicationState:
    """Manages high-level GCS application runtime state."""

    def __init__(self):
        self.current_user: str = "OFFGRID_LEAD"
        self.user_role: str = "COMMANDER"
        self.system_health: str = "HEALTHY"
        self.is_connected: bool = True
        self.active_tab: str = "dashboard"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "current_user": self.current_user,
            "user_role": self.user_role,
            "system_health": self.system_health,
            "is_connected": self.is_connected,
            "active_tab": self.active_tab
        }


app_state = ApplicationState()
