"""
Smart Horizon GCS — Input Validation & Payload Sanitization Service
Subsystem: Security & Governance (Phase 13)
"""

import json
import re
from typing import Any, Dict, List, Optional, Tuple
from .security_config import get_security_config


class InputValidator:
    """
    Validates and sanitizes all incoming GCS command envelopes, waypoint geometries,
    drone parameters, and payload sizes to prevent malicious or out-of-envelope injections.
    """

    ALLOWED_FORMATIONS = {
        "LINE",
        "COLUMN",
        "V_FORMATION",
        "DIAMOND",
        "ECHELON_LEFT",
        "ECHELON_RIGHT",
        "CIRCLE",
        "GRID",
    }

    ALLOWED_FLIGHT_MODES = {
        "MISSION",
        "HOLD",
        "RTL",
        "LAND",
        "TAKEOFF",
        "MANUAL",
        "GUIDED",
        "LOITER",
        "AUTO",
    }

    def __init__(self):
        self.config = get_security_config()

    def validate_message_size(self, raw_message: str) -> Tuple[bool, Optional[str]]:
        """Checks raw incoming WebSocket message length."""
        size = len(raw_message.encode("utf-8"))
        if size > self.config.max_ws_message_size:
            return False, f"Message size ({size} bytes) exceeds limit ({self.config.max_ws_message_size} bytes)"
        return True, None

    def validate_command_envelope(self, data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validates baseline envelope schema."""
        if not isinstance(data, dict):
            return False, "Command envelope must be a JSON object"

        cmd_type = data.get("command_type") or data.get("command") or data.get("type")
        if not cmd_type or not isinstance(cmd_type, str):
            return False, "Missing or invalid 'command_type'"

        if len(cmd_type) > 128:
            return False, "command_type exceeds 128 characters"

        return True, None

    def validate_command_payload(self, cmd_type: str, payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validates specific domain command payloads against safety envelopes."""
        if payload is None:
            return True, None
        if not isinstance(payload, dict):
            return False, "Command payload must be a dictionary"

        # 1. Waypoint validations
        if cmd_type in ("mission.add_waypoint", "WAYPOINT_CREATE", "mission.update_waypoint", "WAYPOINT_MOVE", "WAYPOINT_UPDATE"):
            if "latitude" in payload:
                lat = payload["latitude"]
                if not isinstance(lat, (int, float)) or not (-90.0 <= lat <= 90.0):
                    return False, f"Invalid latitude {lat}. Must be between -90 and 90 degrees."
            if "longitude" in payload:
                lon = payload["longitude"]
                if not isinstance(lon, (int, float)) or not (-180.0 <= lon <= 180.0):
                    return False, f"Invalid longitude {lon}. Must be between -180 and 180 degrees."
            if "altitude" in payload:
                alt = payload["altitude"]
                if not isinstance(alt, (int, float)) or not (0.0 <= alt <= 500.0):
                    return False, f"Invalid altitude {alt}m. Must be between 0.0 and 500.0m AGL."
            if "speed" in payload:
                spd = payload["speed"]
                if not isinstance(spd, (int, float)) or not (0.0 <= spd <= 50.0):
                    return False, f"Invalid speed {spd} m/s. Must be between 0.0 and 50.0 m/s."

        # 2. Formation validations
        if cmd_type in ("fleet.set_formation", "FLEET_SET_FORMATION"):
            formation = str(payload.get("formation", "")).upper().replace(" ", "_")
            if formation not in self.ALLOWED_FORMATIONS:
                return False, f"Unsupported formation '{formation}'. Supported: {', '.join(sorted(self.ALLOWED_FORMATIONS))}"
            if "spacing" in payload:
                spacing = payload["spacing"]
                if not isinstance(spacing, (int, float)) or not (1.0 <= spacing <= 500.0):
                    return False, f"Invalid formation spacing {spacing}m. Must be between 1.0 and 500.0m."

        # 3. Drone ID validations
        if "drone_id" in payload:
            d_id = str(payload["drone_id"])
            if d_id != "ALL" and not re.match(r"^[a-zA-Z0-9_\-\.]{1,64}$", d_id):
                return False, f"Invalid drone_id '{d_id}'. Must be alphanumeric with - or _ up to 64 chars."

        # 4. Geofence validations
        if cmd_type in ("geofence.add_point", "GEOFENCE_ADD_POINT", "geofence.move_vertex", "GEOFENCE_MOVE_VERTEX"):
            if "latitude" in payload:
                lat = payload["latitude"]
                if not isinstance(lat, (int, float)) or not (-90.0 <= lat <= 90.0):
                    return False, f"Invalid geofence latitude {lat}."
            if "longitude" in payload:
                lon = payload["longitude"]
                if not isinstance(lon, (int, float)) or not (-180.0 <= lon <= 180.0):
                    return False, f"Invalid geofence longitude {lon}."

        # 5. Flight mode validation
        if cmd_type in ("drone.mode_change", "DRONE_MODE_CHANGE"):
            mode = str(payload.get("mode", "")).upper()
            if mode not in self.ALLOWED_FLIGHT_MODES:
                return False, f"Invalid flight mode '{mode}'. Supported: {', '.join(sorted(self.ALLOWED_FLIGHT_MODES))}"

        return True, None

    @classmethod
    def sanitize_string(cls, val: str) -> str:
        """Strips harmful control characters and script injection patterns."""
        if not isinstance(val, str):
            return str(val)
        # Remove null bytes and control chars except newlines/tabs
        cleaned = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", val)
        # Strip script tags
        cleaned = re.sub(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", "", cleaned, flags=re.IGNORECASE)
        return cleaned.strip()


input_validator = InputValidator()
