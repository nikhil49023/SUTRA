"""
SUTRA GCS — Artificial Horizon Drawing Geometry
"""

import math
from typing import Tuple, Dict, Any


class ArtificialHorizon:
    """Calculates sky/ground polygon split lines given roll and pitch."""

    @staticmethod
    def calculate_horizon_line(roll_rad: float, pitch_deg: float, width: float, height: float) -> Dict[str, Any]:
        cx = width / 2.0
        cy = height / 2.0
        pitch_pixels_per_deg = height / 60.0
        dy = pitch_deg * pitch_pixels_per_deg

        # Rotated center
        rcx = cx
        rcy = cy + dy

        return {
            "center_x": rcx,
            "center_y": rcy,
            "roll_rad": roll_rad,
            "sky_color": "#0284c7",
            "ground_color": "#78350f"
        }


artificial_horizon = ArtificialHorizon()
