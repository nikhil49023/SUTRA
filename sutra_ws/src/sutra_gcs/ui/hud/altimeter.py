"""
SUTRA GCS — Altimeter HUD Display
"""

from typing import Dict, Any


class AltimeterDisplay:
    """Formats altitude MSL and AGL for HUD tape."""

    @staticmethod
    def format_alt(alt_agl: float, alt_msl: float) -> Dict[str, str]:
        return {
            "agl_str": f"{alt_agl:.1f} m",
            "msl_str": f"{alt_msl:.1f} m",
            "status": "NOMINAL" if alt_agl < 120.0 else "CEILING_EXCEEDED"
        }


altimeter = AltimeterDisplay()
