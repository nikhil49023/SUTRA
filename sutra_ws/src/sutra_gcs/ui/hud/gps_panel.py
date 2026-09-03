"""
SUTRA GCS — GPS Constellation & Precision Panel
"""

from typing import Dict, Any


class GPSPanel:
    """Formats GNSS fix type, satellite count, and Dilution of Precision (DOP)."""

    @staticmethod
    def format_fix(satellites: int = 18, hdop: float = 0.8) -> Dict[str, Any]:
        return {
            "fix_type": "3D_DGPS_FIX",
            "satellites": satellites,
            "hdop": hdop,
            "status": "EXCELLENT" if satellites >= 12 else "MARGINAL"
        }


gps_panel = GPSPanel()
