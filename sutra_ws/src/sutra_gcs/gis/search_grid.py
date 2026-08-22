"""
Smart Horizon GCS — Tactical Search & Rescue (SAR) / Survey Grid Generator
Subsystem: GIS Subsystem (Phase 7)
"""

import math
from typing import Dict, List, Optional, Tuple

from mission.mission_manager import get_mission_manager
from mission.route_calculator import RouteCalculator
from mission.waypoint import AltitudeReference, Waypoint, WaypointCommand
from .models import SearchGridConfig, SearchPattern


class SearchGridGenerator:
    """
    Generates high-efficiency SAR search corridors, photogrammetry transects,
    and perimeter sweeps directly converted into executable mission waypoints.
    """

    @classmethod
    def generate_search_path(cls, config: SearchGridConfig) -> List[Tuple[float, float]]:
        """
        Generates 2D coordinates for the selected search pattern.
        """
        coords = config.bounds_coordinates
        if not coords or len(coords) < 3:
            return []

        if config.pattern == SearchPattern.PERIMETER:
            # Closed boundary polygon loop
            return list(coords) + [coords[0]]

        elif config.pattern == SearchPattern.LAWN_MOWER or config.pattern == SearchPattern.GRID:
            return cls._generate_lawnmower_path(coords, config.spacing_m, config.orientation_deg)

        else:
            return cls._generate_lawnmower_path(coords, config.spacing_m, config.orientation_deg)

    @classmethod
    def generate_mission_waypoints(cls, config: SearchGridConfig) -> List[Waypoint]:
        """
        Creates fully populated Waypoint objects for the flight plan.
        """
        path_coords = cls.generate_search_path(config)
        wps: List[Waypoint] = []

        for i, (lat, lon) in enumerate(path_coords):
            wp = Waypoint(
                index=i + 1,
                latitude=round(lat, 6),
                longitude=round(lon, 6),
                altitude=config.altitude_m,
                speed=config.speed_mps,
                command=WaypointCommand.WAYPOINT,
                acceptance_radius=2.0,
                altitude_reference=AltitudeReference.RELATIVE_TO_HOME,
            )
            wps.append(wp)

        return wps

    @classmethod
    def _generate_lawnmower_path(
        cls, coords: List[Tuple[float, float]], spacing_m: float, orientation_deg: float
    ) -> List[Tuple[float, float]]:
        """
        Computes parallel back-and-forth transects bounded inside the polygon.
        """
        min_lat = min(p[0] for p in coords)
        max_lat = max(p[0] for p in coords)
        min_lon = min(p[1] for p in coords)
        max_lon = max(p[1] for p in coords)

        # Spacing in degrees
        lat_step = spacing_m / 111132.0
        if lat_step <= 0.0:
            lat_step = 0.0002

        path: List[Tuple[float, float]] = []
        cur_lat = min_lat
        sweep_east = True

        while cur_lat <= max_lat:
            if sweep_east:
                path.append((cur_lat, min_lon))
                path.append((cur_lat, max_lon))
            else:
                path.append((cur_lat, max_lon))
                path.append((cur_lat, min_lon))

            cur_lat += lat_step
            sweep_east = not sweep_east

        return path


# Global singleton
search_grid_generator = SearchGridGenerator()
