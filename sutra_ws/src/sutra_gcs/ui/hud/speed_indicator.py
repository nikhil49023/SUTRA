"""
SUTRA GCS — Airspeed & Ground Speed Indicator
"""

from typing import Dict, Any


class SpeedIndicator:
    """Formats ground speed and air speed."""

    @staticmethod
    def format_speed(ground_speed_mps: float, air_speed_mps: float) -> Dict[str, str]:
        return {
            "gnd_spd_str": f"{ground_speed_mps:.1f} m/s",
            "air_spd_str": f"{air_speed_mps:.1f} m/s",
            "gnd_spd_kmh": f"{ground_speed_mps * 3.6:.1f} km/h"
        }


speed_indicator = SpeedIndicator()
