"""
Smart Horizon GCS — Autopilot Abstraction Layer Interface
Subsystem: Autopilot Adapters (Phase 8)
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class AutopilotAdapter(ABC):
    """
    Abstract interface decoupling high-level GCS flight actions from autopilot-specific MAVLink dialects.
    """

    @abstractmethod
    def connect(self, uri: str) -> bool:
        pass

    @abstractmethod
    def disconnect(self) -> None:
        pass

    @abstractmethod
    def arm(self, arm: bool = True, target_system: int = 1) -> bool:
        pass

    @abstractmethod
    def takeoff(self, altitude_m: float = 25.0, target_system: int = 1) -> bool:
        pass

    @abstractmethod
    def land(self, target_system: int = 1) -> bool:
        pass

    @abstractmethod
    def rtl(self, target_system: int = 1) -> bool:
        pass

    @abstractmethod
    def hold(self, target_system: int = 1) -> bool:
        pass

    @abstractmethod
    def set_mode(self, mode_name: str, target_system: int = 1) -> bool:
        pass

    @abstractmethod
    def upload_mission(self, waypoints: List[Any], target_system: int = 1) -> bool:
        pass

    @abstractmethod
    def download_mission(self, target_system: int = 1) -> List[Any]:
        pass
