"""
Smart Horizon GCS — Production MAVLink v2 Command & Packet Encoder
Subsystem: MAVLink Subsystem (Phase 8)
"""

import time
from typing import Any, Dict, List, Optional
from .mavlink_messages import MAVCmd, MAVType, MAVAutopilot


class MAVLinkEncoder:
    """
    Constructs standard MAVLink v2 telemetry frames and flight action commands.
    """

    @classmethod
    def encode_heartbeat(cls, drone_dict: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "type": MAVType.QUADROTOR,
            "autopilot": MAVAutopilot.PX4,
            "base_mode": 128 if drone_dict.get("armed") else 0,
            "custom_mode": 4,  # OFFBOARD
            "system_status": 4 if drone_dict.get("armed") else 3,
            "mavlink_version": 3,
        }

    @classmethod
    def encode_global_position(cls, drone_dict: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "time_boot_ms": int(time.time() * 1000) & 0xFFFFFFFF,
            "lat": int(drone_dict.get("lat", 0.0) * 1e7),
            "lon": int(drone_dict.get("lon", 0.0) * 1e7),
            "alt": int(drone_dict.get("alt_msl", 0.0) * 1000),
            "relative_alt": int(drone_dict.get("alt_agl", 0.0) * 1000),
            "vx": int(drone_dict.get("ground_speed", 0.0) * 100),
            "vy": 0,
            "vz": -int(drone_dict.get("climb_rate", 0.0) * 100),
            "hdg": int(drone_dict.get("heading", 0.0) * 100),
        }

    @classmethod
    def encode_command_long(
        cls,
        command_id: int,
        param1: float = 0.0,
        param2: float = 0.0,
        param3: float = 0.0,
        param4: float = 0.0,
        param5: float = 0.0,
        param6: float = 0.0,
        param7: float = 0.0,
        target_system: int = 1,
        target_component: int = 1,
    ) -> Dict[str, Any]:
        """Generic MAVLink COMMAND_LONG frame."""
        return {
            "target_system": target_system,
            "target_component": target_component,
            "command": command_id,
            "confirmation": 0,
            "param1": param1,
            "param2": param2,
            "param3": param3,
            "param4": param4,
            "param5": param5,
            "param6": param6,
            "param7": param7,
        }

    @classmethod
    def encode_arm(cls, arm: bool = True, target_system: int = 1) -> Dict[str, Any]:
        return cls.encode_command_long(
            command_id=MAVCmd.COMPONENT_ARM_DISARM,
            param1=1.0 if arm else 0.0,
            target_system=target_system,
        )

    @classmethod
    def encode_takeoff(cls, altitude_m: float = 25.0, target_system: int = 1) -> Dict[str, Any]:
        return cls.encode_command_long(
            command_id=MAVCmd.NAV_TAKEOFF,
            param7=altitude_m,
            target_system=target_system,
        )

    @classmethod
    def encode_land(cls, target_system: int = 1) -> Dict[str, Any]:
        return cls.encode_command_long(
            command_id=MAVCmd.NAV_LAND,
            target_system=target_system,
        )

    @classmethod
    def encode_rtl(cls, target_system: int = 1) -> Dict[str, Any]:
        return cls.encode_command_long(
            command_id=MAVCmd.NAV_RETURN_TO_LAUNCH,
            target_system=target_system,
        )


# Global singleton
mavlink_encoder = MAVLinkEncoder()
