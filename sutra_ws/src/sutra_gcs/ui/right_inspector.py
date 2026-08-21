"""
SUTRA GCS — Right Inspector Component
"""

from typing import Dict, Any


class RightInspectorComponent:
    """Manages avionics cards, motor RPM bars, and live video stream box."""

    @staticmethod
    def format_inspector(drone_dict: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "alt_agl": f"{drone_dict.get('alt_agl', 0.0):.1f} m",
            "gnd_spd": f"{drone_dict.get('ground_speed', 0.0):.1f} m/s",
            "battery": f"{drone_dict.get('battery_pct', 100.0):.1f} %",
            "climb": f"{drone_dict.get('climb_rate', 0.0):.2f} m/s",
            "motor_rpms": drone_dict.get("motor_rpms", [0, 0, 0, 0]),
            "camera_source": "GIMBAL_RGB_LWIR"
        }


right_inspector = RightInspectorComponent()
