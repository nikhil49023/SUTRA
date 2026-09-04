"""
Smart Horizon GCS — Production MAVLink v2 Telemetry Frame Parser
Subsystem: MAVLink Subsystem (Phase 8)
"""

import math
from typing import Any, Dict, Optional


class MAVLinkParser:
    """
    Decodes MAVLink v2 telemetry frames into structured Python telemetry dictionaries.
    """

    @classmethod
    def parse_frame(cls, msg_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses a named MAVLink packet into standard telemetry metrics.
        """
        result: Dict[str, Any] = {"msg_type": msg_name, "valid": True}

        if msg_name == "HEARTBEAT":
            result["type"] = payload.get("type", 2)
            result["autopilot"] = payload.get("autopilot", 12)
            base_mode = payload.get("base_mode", 0)
            result["armed"] = bool(base_mode & 128)
            result["custom_mode"] = payload.get("custom_mode", 0)
            result["system_status"] = payload.get("system_status", 0)

        elif msg_name == "GLOBAL_POSITION_INT" or msg_name == "GLOBAL_POS_INT":
            result["lat"] = payload.get("lat", 0) / 1e7
            result["lon"] = payload.get("lon", 0) / 1e7
            result["alt_msl"] = payload.get("alt", 0) / 1000.0
            result["alt_agl"] = payload.get("relative_alt", 0) / 1000.0
            result["heading"] = payload.get("hdg", 0) / 100.0
            vx = payload.get("vx", 0) / 100.0
            vy = payload.get("vy", 0) / 100.0
            result["ground_speed"] = math.sqrt(vx**2 + vy**2)
            result["climb_rate"] = -payload.get("vz", 0) / 100.0

        elif msg_name == "ATTITUDE":
            result["roll_deg"] = payload.get("roll", 0.0)
            result["pitch_deg"] = payload.get("pitch", 0.0)
            result["yaw_deg"] = payload.get("yaw", 0.0)

        elif msg_name == "SYS_STATUS" or msg_name == "BATTERY_STATUS":
            result["battery_pct"] = payload.get("battery_remaining", payload.get("remaining", 100))
            result["voltage_v"] = payload.get("voltage_battery", 0) / 1000.0

        elif msg_name == "GPS_RAW_INT":
            result["gps_fix_type"] = payload.get("fix_type", 3)
            result["satellites_visible"] = payload.get("satellites_visible", 12)

        elif msg_name == "VFR_HUD":
            result["airspeed"] = payload.get("airspeed", 0.0)
            result["groundspeed"] = payload.get("groundspeed", 0.0)
            result["climb"] = payload.get("climb", 0.0)
            result["throttle_pct"] = payload.get("throttle", 0)

        elif msg_name == "COMMAND_ACK":
            result["command"] = payload.get("command", 0)
            result["result"] = payload.get("result", 0)  # 0 = MAV_RESULT_ACCEPTED

        elif msg_name == "MISSION_CURRENT":
            result["seq"] = payload.get("seq", 0)

        elif msg_name == "MISSION_ITEM_REACHED":
            result["seq"] = payload.get("seq", 0)

        elif msg_name == "STATUSTEXT":
            result["severity"] = payload.get("severity", 6)
            result["text"] = payload.get("text", "")

        return result


# Global singleton
mavlink_parser = MAVLinkParser()
