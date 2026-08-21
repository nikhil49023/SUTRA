"""
SUTRA GCS — Primary Flight Display (PFD) HUD Coordinator
"""

from typing import Dict, Any


class PrimaryFlightDisplay:
    """Coordinates gyro attitude, pitch ladder, compass tape, and altitude readout."""

    @staticmethod
    def get_hud_state(drone_dict: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "pitch_deg": drone_dict.get("pitch", 0.0),
            "roll_deg": drone_dict.get("roll", 0.0),
            "heading_deg": drone_dict.get("heading", 0),
            "alt_agl_m": drone_dict.get("alt_agl", 0.0),
            "ground_speed_mps": drone_dict.get("ground_speed", 0.0),
            "climb_rate_mps": drone_dict.get("climb_rate", 0.0),
            "battery_pct": drone_dict.get("battery_pct", 100.0)
        }


pfd = PrimaryFlightDisplay()
