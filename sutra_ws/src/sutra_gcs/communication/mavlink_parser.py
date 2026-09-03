"""
SUTRA GCS — MAVLink v2 Parser
Decodes binary and JSON MAVLink packets into telemetry dictionaries.
"""

from typing import Dict, Any, Optional


class MAVLinkParser:
    """Parses MAVLink v2 telemetry frames."""

    @staticmethod
    def parse_frame(msg_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        result = {"msg_type": msg_name, "valid": True}
        if msg_name == "GLOBAL_POS_INT":
            result["lat"] = payload.get("lat", 0) / 1e7
            result["lon"] = payload.get("lon", 0) / 1e7
            result["alt_msl"] = payload.get("alt", 0) / 1000.0
            result["alt_agl"] = payload.get("relative_alt", 0) / 1000.0
            result["heading"] = payload.get("hdg", 0) / 100.0
        elif msg_name == "ATTITUDE":
            result["roll_deg"] = payload.get("roll", 0.0)
            result["pitch_deg"] = payload.get("pitch", 0.0)
            result["yaw_deg"] = payload.get("yaw", 0.0)
        return result


mavlink_parser = MAVLinkParser()
