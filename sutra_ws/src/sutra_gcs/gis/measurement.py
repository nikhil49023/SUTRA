"""
Smart Horizon GCS — Tactical Measurement & Spatial Survey Tool
Subsystem: GIS Subsystem (Phase 7)
"""

import math
from typing import List, Tuple

from geofence.geometry import GeofenceGeometry
from mission.route_calculator import RouteCalculator
from .elevation_service import elevation_service, ElevationService
from .models import MeasurementResult


class MeasurementTool:
    """
    Computes real-time tactical geodetic distances, true azimuth bearings,
    elevation deltas, and geodesic polygon surface areas.
    """

    def __init__(self, elev_service: ElevationService = elevation_service) -> None:
        self.elevation_service = elev_service

    def measure_line(
        self, p1: Tuple[float, float], p2: Tuple[float, float]
    ) -> MeasurementResult:
        """
        Measures distance, bearing, and altitude change between Point A and Point B.
        """
        dist_m = RouteCalculator.calculate_distance(p1[0], p1[1], p2[0], p2[1])
        bearing_deg = RouteCalculator.calculate_bearing(p1[0], p1[1], p2[0], p2[1])

        elev1 = self.elevation_service.get_elevation(p1[0], p1[1])
        elev2 = self.elevation_service.get_elevation(p2[0], p2[1])
        elev_diff = elev2 - elev1

        return MeasurementResult(
            distance_m=round(dist_m, 2),
            bearing_deg=round(bearing_deg, 1),
            elevation_diff_m=round(elev_diff, 2),
            area_m2=0.0,
            perimeter_m=round(dist_m, 2),
        )

    def measure_polygon(self, coords: List[Tuple[float, float]]) -> MeasurementResult:
        """
        Measures geodesic surface area (m²) and perimeter (m) for an enclosed region.
        """
        if len(coords) < 3:
            return MeasurementResult()

        area_m2 = GeofenceGeometry.calculate_area(coords)
        perim_m = GeofenceGeometry.calculate_perimeter(coords)

        return MeasurementResult(
            distance_m=0.0,
            bearing_deg=0.0,
            elevation_diff_m=0.0,
            area_m2=round(area_m2, 1),
            perimeter_m=round(perim_m, 1),
        )


# Global singleton
measurement_tool = MeasurementTool()
