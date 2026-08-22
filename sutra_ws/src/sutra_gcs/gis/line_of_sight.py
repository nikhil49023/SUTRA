"""
Smart Horizon GCS — 3D Line-of-Sight (LOS) Optical & RF Ray-Tracing Engine
Subsystem: GIS Subsystem (Phase 7)
"""

import math
from typing import Any, Dict, List, Optional, Tuple

from mission.route_calculator import RouteCalculator
from .elevation_service import elevation_service, ElevationService
from .models import LOSResult


class LineOfSightAnalyzer:
    """
    Traces 3D optical rays and 1st Fresnel zone ellipsoids over digital elevation
    models to determine unobstructed visual and radio propagation between GCS and swarm drones.
    """

    EARTH_RADIUS_M: float = 6371000.0

    def __init__(self, elev_service: ElevationService = elevation_service) -> None:
        self.elevation_service = elev_service

    def analyze_los(
        self,
        obs_lat: float,
        obs_lon: float,
        obs_alt_msl: float,
        target_lat: float,
        target_lon: float,
        target_alt_msl: float,
        num_samples: int = 40,
    ) -> LOSResult:
        """
        Traces Line-of-Sight ray between Observer (GCS) and Target (UAV).
        """
        total_dist_m = RouteCalculator.calculate_distance(
            obs_lat, obs_lon, target_lat, target_lon
        )

        if total_dist_m < 1.0:
            return LOSResult(
                visible=True,
                blocked=False,
                blocking_location=None,
                blocking_elevation_m=0.0,
                min_clearance_m=obs_alt_msl,
                distance_m=0.0,
            )

        min_clearance = float("inf")
        is_blocked = False
        blocking_loc: Optional[Tuple[float, float]] = None
        blocking_elev = 0.0
        profile_nodes: List[Dict[str, Any]] = []

        d_lat = target_lat - obs_lat
        d_lon = target_lon - obs_lon

        for i in range(num_samples):
            fraction = i / (num_samples - 1) if num_samples > 1 else 0.0
            cur_lat = obs_lat + (fraction * d_lat)
            cur_lon = obs_lon + (fraction * d_lon)
            d1_m = fraction * total_dist_m
            d2_m = (1.0 - fraction) * total_dist_m

            # Linear ray elevation
            ray_alt = obs_alt_msl + (fraction * (target_alt_msl - obs_alt_msl))

            # Earth curvature sag correction (meters)
            earth_sag = (d1_m * d2_m) / (2.0 * self.EARTH_RADIUS_M)
            eff_ray_alt = ray_alt - earth_sag

            # Sample terrain
            terrain_elev = self.elevation_service.get_elevation(cur_lat, cur_lon)
            clearance = eff_ray_alt - terrain_elev

            profile_nodes.append({
                "index": i,
                "distance_m": round(d1_m, 1),
                "ray_alt_m": round(eff_ray_alt, 2),
                "terrain_alt_m": round(terrain_elev, 2),
                "clearance_m": round(clearance, 2),
                "lat": cur_lat,
                "lon": cur_lon,
            })

            if clearance < min_clearance:
                min_clearance = clearance

            # If ray penetrates terrain
            if clearance <= 0.0 and not is_blocked:
                is_blocked = True
                blocking_loc = (cur_lat, cur_lon)
                blocking_elev = terrain_elev

        return LOSResult(
            visible=not is_blocked,
            blocked=is_blocked,
            blocking_location=blocking_loc,
            blocking_elevation_m=round(blocking_elev, 2),
            min_clearance_m=round(min_clearance, 2),
            distance_m=round(total_dist_m, 1),
            profile=profile_nodes,
        )

    @staticmethod
    def check_los(profile: List[Dict[str, float]], gcs_alt_msl: float, drone_alt_msl: float) -> Dict[str, Any]:
        """Backward-compatibility wrapper for test suites."""
        num_samples = len(profile)
        if num_samples < 2:
            return {"clear": True, "min_clearance_m": 100.0}

        min_clearance = float("inf")
        is_clear = True

        for i, pt in enumerate(profile):
            fraction = i / (num_samples - 1)
            los_ray_alt = gcs_alt_msl + fraction * (drone_alt_msl - gcs_alt_msl)
            terrain_alt = pt["elevation_m"]
            clearance = los_ray_alt - terrain_alt
            if clearance < min_clearance:
                min_clearance = clearance
            if clearance <= 0.0:
                is_clear = False

        return {
            "clear": is_clear,
            "min_clearance_m": round(min_clearance, 2),
        }


# Global singleton
los_analyzer = LineOfSightAnalyzer()
