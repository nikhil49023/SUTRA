"""
Smart Horizon GCS — UAV Ground Clearance & Terrain Buffer Safety Engine
Subsystem: GIS Subsystem (Phase 7)
"""

from typing import List, Optional

from mission.waypoint import Waypoint
from .elevation_service import elevation_service, ElevationService
from .models import ClearanceStatus, GroundClearanceReport


class GroundClearanceAnalyzer:
    """
    Evaluates vertical distance between airframe MSL/AGL flight level
    and terrain relief to prevent controlled flight into terrain (CFIT).
    """

    CRITICAL_CLEARANCE_M: float = 10.0
    WARNING_CLEARANCE_M: float = 30.0

    def __init__(self, elev_service: ElevationService = elevation_service) -> None:
        self.elevation_service = elev_service

    def check_position_clearance(
        self,
        drone_id: str,
        lat: float,
        lon: float,
        alt_agl: float,
    ) -> GroundClearanceReport:
        """
        Calculates terrain clearance for a live aircraft.
        """
        terrain_elev = self.elevation_service.get_elevation(lat, lon)
        alt_msl = terrain_elev + alt_agl
        clearance = alt_agl  # Vertical clearance above local ground

        if clearance < self.CRITICAL_CLEARANCE_M:
            status = ClearanceStatus.CRITICAL
        elif clearance < self.WARNING_CLEARANCE_M:
            status = ClearanceStatus.WARNING
        else:
            status = ClearanceStatus.SAFE

        return GroundClearanceReport(
            drone_id=drone_id,
            latitude=lat,
            longitude=lon,
            altitude_msl=round(alt_msl, 1),
            altitude_agl=round(alt_agl, 1),
            terrain_elevation_m=round(terrain_elev, 1),
            clearance_m=round(clearance, 1),
            status=status,
        )

    def check_mission_clearances(
        self, waypoints: List[Waypoint], home_lat: float, home_lon: float
    ) -> List[GroundClearanceReport]:
        """
        Evaluates terrain safety clearance at each mission waypoint.
        """
        reports: List[GroundClearanceReport] = []
        for wp in waypoints:
            rep = self.check_position_clearance(
                drone_id=f"WP{wp.index:02d}",
                lat=wp.latitude,
                lon=wp.longitude,
                alt_agl=wp.altitude,
            )
            reports.append(rep)
        return reports


# Global singleton
ground_clearance_analyzer = GroundClearanceAnalyzer()
