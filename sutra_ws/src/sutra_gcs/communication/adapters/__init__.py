"""
Smart Horizon GCS — Autopilot Protocol Adapters Package
"""

from .autopilot_adapter import AutopilotAdapter
from .px4_adapter import PX4Adapter, px4_adapter
from .ardupilot_adapter import ArduPilotAdapter, ardupilot_adapter
from .perception_subsystem_adapter import (
    PerceptionSubsystemAdapter,
    perception_adapter,
    get_perception_adapter,
    normalize_drone_id,
    validate_target_payload,
)

__all__ = [
    "AutopilotAdapter",
    "PX4Adapter",
    "px4_adapter",
    "ArduPilotAdapter",
    "ardupilot_adapter",
    "PerceptionSubsystemAdapter",
    "perception_adapter",
    "get_perception_adapter",
    "normalize_drone_id",
    "validate_target_payload",
]

