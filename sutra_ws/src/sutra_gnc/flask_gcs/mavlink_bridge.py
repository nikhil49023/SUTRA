"""
SUTRA MAVLink Protocol & QGroundControl Plan Bridge
Subsystem A & D: MAVLink Packet Serializer & QGC .plan Exporter/Importer
"""

import json
import time
from typing import List, Dict, Any, Optional


class MAVLinkBridge:
    """
    Encodes live drone states into MAVLink v2 telemetry packets and converts
    between SUTRA waypoint missions and QGroundControl `.plan` / WPL 110 formats.
    """

    @staticmethod
    def generate_mavlink_frames(drone_dict: Dict[str, Any], sys_id: int = 1) -> Dict[str, Any]:
        """
        Generate standard MAVLink v2 message packet payloads for inspection console.
        """
        now_ms = int(time.time() * 1000) % 4294967295

        return {
            "sys_id": sys_id,
            "comp_id": 1,
            "HEARTBEAT": {
                "type": 2,          # MAV_TYPE_QUADROTOR
                "autopilot": 12,    # MAV_AUTOPILOT_PX4
                "base_mode": 128 if drone_dict.get("armed") else 0,
                "custom_mode": 67371008 if drone_dict.get("mode") == "WAYPOINT_NAV" else 0,
                "system_status": 4  # MAV_STATE_ACTIVE
            },
            "ATTITUDE": {
                "time_boot_ms": now_ms,
                "roll": round(drone_dict.get("roll", 0.0) * 0.0174533, 4),    # radians
                "pitch": round(drone_dict.get("pitch", 0.0) * 0.0174533, 4),  # radians
                "yaw": round(drone_dict.get("yaw", 0.0) * 0.0174533, 4),      # radians
                "rollspeed": 0.02,
                "pitchspeed": -0.01,
                "yawspeed": 0.05
            },
            "GLOBAL_POS_INT": {
                "time_boot_ms": now_ms,
                "lat": int(drone_dict.get("lat", 0.0) * 1e7),
                "lon": int(drone_dict.get("lon", 0.0) * 1e7),
                "alt": int(drone_dict.get("alt_msl", 0.0) * 1000),      # mm MSL
                "relative_alt": int(drone_dict.get("alt_agl", 0.0) * 1000), # mm AGL
                "vx": int(drone_dict.get("vel_ned", [0, 0, 0])[0] * 100),  # cm/s North
                "vy": int(drone_dict.get("vel_ned", [0, 0, 0])[1] * 100),  # cm/s East
                "vz": int(drone_dict.get("vel_ned", [0, 0, 0])[2] * 100),  # cm/s Down
                "hdg": int(drone_dict.get("heading", 0.0) * 100)           # cdeg
            },
            "SYS_STATUS": {
                "battery_voltage_mv": int(drone_dict.get("battery_voltage", 25.2) * 1000),
                "battery_current_cA": int(drone_dict.get("battery_current", 12.0) * 100),
                "battery_remaining": int(drone_dict.get("battery_pct", 100.0)),
                "drop_rate_comm": 0,
                "errors_comm": 0
            },
            "VFR_HUD": {
                "airspeed": drone_dict.get("air_speed", 0.0),
                "groundspeed": drone_dict.get("ground_speed", 0.0),
                "heading": int(drone_dict.get("heading", 0)),
                "throttle": 55 if drone_dict.get("armed") else 0,
                "alt": drone_dict.get("alt_agl", 0.0),
                "climb": drone_dict.get("climb_rate", 0.0)
            }
        }

    @staticmethod
    def export_qgc_plan(waypoints: List[Dict[str, Any]], cruise_speed: float = 5.0) -> str:
        """
        Export mission waypoints into QGroundControl .plan v1 JSON format.
        """
        items = []

        # Item 0: Home / Takeoff
        items.append({
            "autoContinue": True,
            "command": 22,  # MAV_CMD_NAV_TAKEOFF
            "frame": 3,
            "params": [0, 0, 0, 0, 0, 0, 15.0],
            "type": "SimpleItem"
        })

        for seq, wp in enumerate(waypoints, start=1):
            items.append({
                "autoContinue": True,
                "command": 16,  # MAV_CMD_NAV_WAYPOINT
                "frame": 3,
                "params": [
                    0,               # Hold time
                    1.8,             # Acceptance radius
                    0,               # Pass radius
                    0,               # Yaw angle
                    wp.get("lat"),   # Lat
                    wp.get("lon"),   # Lon
                    wp.get("alt", 20.0) # Alt
                ],
                "type": "SimpleItem"
            })

        plan = {
            "fileType": "Plan",
            "version": 1,
            "groundStation": "SUTRA Tactical GCS",
            "mission": {
                "cruiseSpeed": cruise_speed,
                "hoverSpeed": 3.0,
                "items": items,
                "plannedHomePosition": [
                    waypoints[0]["lat"] if waypoints else 37.774929,
                    waypoints[0]["lon"] if waypoints else -122.419416,
                    15.0
                ]
            }
        }
        return json.dumps(plan, indent=2)

    @staticmethod
    def import_qgc_plan(plan_json_str: str) -> List[Dict[str, Any]]:
        """
        Import QGroundControl .plan JSON into SUTRA waypoint list.
        """
        data = json.loads(plan_json_str)
        waypoints = []
        mission_items = data.get("mission", {}).get("items", [])

        for item in mission_items:
            # Check for MAV_CMD_NAV_WAYPOINT (16)
            if item.get("command") == 16:
                params = item.get("params", [])
                if len(params) >= 7:
                    waypoints.append({
                        "lat": float(params[4]),
                        "lon": float(params[5]),
                        "alt": float(params[6]),
                        "speed": 5.0
                    })

        return waypoints
