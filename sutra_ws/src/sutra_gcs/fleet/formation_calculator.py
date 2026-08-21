"""
SUTRA GCS — Swarm Formation Geometry Calculator
"""

import math
from typing import Dict, Tuple, List


class FormationCalculator:
    """Calculates relative NED offsets (North, East, Down in meters) for swarm geometry."""

    @staticmethod
    def get_formation_offsets(formation_type: str) -> Dict[str, Tuple[float, float, float]]:
        f = formation_type.upper()
        if f == "V_FORMATION":
            # Tactical Wedge
            return {
                "drone_alpha": (0.0, 0.0, -20.0),      # Apex leader
                "drone_bravo": (-12.0, -12.0, -20.0),   # Left wing
                "drone_charlie": (-12.0, 12.0, -20.0),  # Right wing
                "drone_delta": (-24.0, 0.0, -25.0)      # Tail guard
            }
        elif f == "GRID_SEARCH":
            # 4-Lane Parallel Search Corridors
            return {
                "drone_alpha": (0.0, -15.0, -20.0),
                "drone_bravo": (0.0, -5.0, -20.0),
                "drone_charlie": (0.0, 5.0, -20.0),
                "drone_delta": (0.0, 15.0, -20.0)
            }
        elif f == "PERIMETER_BOX":
            # 4-Corner Boundary Box
            return {
                "drone_alpha": (15.0, -15.0, -20.0),
                "drone_bravo": (15.0, 15.0, -20.0),
                "drone_charlie": (-15.0, 15.0, -20.0),
                "drone_delta": (-15.0, -15.0, -20.0)
            }
        # Default Staggered Line
        return {
            "drone_alpha": (0.0, 0.0, -20.0),
            "drone_bravo": (-10.0, 0.0, -20.0),
            "drone_charlie": (-20.0, 0.0, -20.0),
            "drone_delta": (-30.0, 0.0, -20.0)
        }


formation_calc = FormationCalculator()
