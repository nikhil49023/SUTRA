"""
Smart Horizon GCS — Terrain Topography Analysis & Service Registry
Subsystem: GIS Subsystem (Phase 7)
"""

from typing import List, Tuple
from .elevation_service import elevation_service, ElevationService


class TerrainService:
    """
    Facade and registry for digital elevation, slope topography, and relief analysis.
    """

    def __init__(self, elev_service: ElevationService = elevation_service) -> None:
        self.elevation_service = elev_service

    def get_elevation_at(self, lat: float, lon: float) -> float:
        return self.elevation_service.get_elevation(lat, lon)

    def get_relief_matrix(
        self,
        center_lat: float,
        center_lon: float,
        radius_m: float = 1000.0,
        grid_resolution: int = 20,
    ) -> List[List[float]]:
        """
        Samples an NxN elevation grid around a geographic coordinate.
        """
        d_lat = (radius_m / 111132.0)
        d_lon = (radius_m / (111132.0 * 0.79))  # ~cos(37.7 deg)

        matrix = []
        for r in range(grid_resolution):
            row = []
            lat = center_lat - d_lat + (2 * d_lat * (r / (grid_resolution - 1)))
            for c in range(grid_resolution):
                lon = center_lon - d_lon + (2 * d_lon * (c / (grid_resolution - 1)))
                row.append(self.get_elevation_at(lat, lon))
            matrix.append(row)
        return matrix


# Global singleton
terrain_service = TerrainService()
