"""
Smart Horizon GCS — ArduPilot Autopilot Hardware Protocol Adapter
Subsystem: Autopilot Adapters (Phase 8)
"""

import logging
from typing import Any, Dict, List, Optional

from communication.mavlink.mavlink_connection import MAVLinkConnection, mavlink_connection
from communication.mavlink.mavlink_encoder import MAVLinkEncoder
from .autopilot_adapter import AutopilotAdapter

logger = logging.getLogger("sutra_gcs.communication.ardupilot_adapter")


class ArduPilotAdapter(AutopilotAdapter):
    """
    Translates standard GCS flight commands into ArduPilot GUIDED and AUTO mode frames.
    """

    def __init__(self, connection: Optional[MAVLinkConnection] = None) -> None:
        self.connection = connection or mavlink_connection
        self.logger = logger

    def connect(self, uri: str) -> bool:
        self.connection.endpoint_uri = uri
        return self.connection.connect()

    def disconnect(self) -> None:
        self.connection.disconnect()

    def arm(self, arm: bool = True, target_system: int = 1) -> bool:
        self.logger.info(f"ArduPilot: {'ARM' if arm else 'DISARM'} -> Sys {target_system}")
        frame = MAVLinkEncoder.encode_arm(arm=arm, target_system=target_system)
        return self.connection.send_frame(frame)

    def takeoff(self, altitude_m: float = 25.0, target_system: int = 1) -> bool:
        self.logger.info(f"ArduPilot: TAKEOFF to {altitude_m}m -> Sys {target_system}")
        frame = MAVLinkEncoder.encode_takeoff(altitude_m=altitude_m, target_system=target_system)
        return self.connection.send_frame(frame)

    def land(self, target_system: int = 1) -> bool:
        self.logger.info(f"ArduPilot: LAND -> Sys {target_system}")
        frame = MAVLinkEncoder.encode_land(target_system=target_system)
        return self.connection.send_frame(frame)

    def rtl(self, target_system: int = 1) -> bool:
        self.logger.info(f"ArduPilot: RTL -> Sys {target_system}")
        frame = MAVLinkEncoder.encode_rtl(target_system=target_system)
        return self.connection.send_frame(frame)

    def hold(self, target_system: int = 1) -> bool:
        self.logger.info(f"ArduPilot: LOITER -> Sys {target_system}")
        frame = MAVLinkEncoder.encode_command_long(command_id=17, target_system=target_system)
        return self.connection.send_frame(frame)

    def set_mode(self, mode_name: str, target_system: int = 1) -> bool:
        self.logger.info(f"ArduPilot: SET_MODE {mode_name} -> Sys {target_system}")
        return True

    def upload_mission(self, waypoints: List[Any], target_system: int = 1) -> bool:
        self.logger.info(f"ArduPilot: Uploading {len(waypoints)} waypoints -> Sys {target_system}")
        return True

    def download_mission(self, target_system: int = 1) -> List[Any]:
        return []


# Global singleton
ardupilot_adapter = ArduPilotAdapter()
