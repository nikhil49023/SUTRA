"""
SUTRA GCS — Terrain Elevation & Topography Model
"""

import math
from typing import Dict, Any, List


class TerrainModel:
    """Generates synthetic Digital Elevation Model (DEM) terrain profiles."""

    def __init__(self, base_elevation_m: float = 45.0):
        self.base_elevation_m = base_elevation_m

    def get_elevation_at(self, lat: float, lon: float) -> float:
        """Computes synthetic coastal hill elevation."""
        scale = 1000.0
        hill_1 = math.sin((lat - 37.77) * scale) * 22.0
        hill_2 = math.cos((lon - (-122.41)) * scale) * 18.0
        micro = math.sin((lat + lon) * scale * 2.5) * 6.0
        return max(5.0, self.base_elevation_m + hill_1 + hill_2 + micro)


terrain_model = TerrainModel()
