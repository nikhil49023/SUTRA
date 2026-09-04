"""
SUTRA GCS — MAVLink v2 Encoder
Generates standard MAVLink telemetry packets and command frames.
"""

import time
from typing import Dict, Any, List


class MAVLinkEncoder:
    """Encodes drone state into MAVLink v2 frames."""

    @staticmethod
    def encode_heartbeat(drone_dict: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "type": 2,  # MAV_TYPE_QUADROTOR
            "autopilot": 12,  # MAV_AUTOPILOT_PX4
            "base_mode": 128 if drone_dict.get("armed") else 0,
            "custom_mode": 4,  # OFFBOARD
            "system_status": 4 if drone_dict.get("armed") else 3,
            "mavlink_version": 3
        }

    @staticmethod
    def encode_global_position(drone_dict: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "time_boot_ms": int(time.time() * 1000) & 0xFFFFFFFF,
            "lat": int(drone_dict.get("lat", 0.0) * 1e7),
            "lon": int(drone_dict.get("lon", 0.0) * 1e7),
            "alt": int(drone_dict.get("alt_msl", 0.0) * 1000),
            "relative_alt": int(drone_dict.get("alt_agl", 0.0) * 1000),
            "vx": int(drone_dict.get("ground_speed", 0.0) * 100),
            "vy": 0,
            "vz": int(drone_dict.get("climb_rate", 0.0) * 100),
            "hdg": int(drone_dict.get("heading", 0) * 100)
        }


mavlink_encoder = MAVLinkEncoder()
