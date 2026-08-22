"""
Smart Horizon GCS — Terrain Elevation Profile & Relief Sampling Engine
Subsystem: GIS Subsystem (Phase 7)
"""

import math
from typing import Any, Dict, List, Optional, Tuple

from mission.route_calculator import RouteCalculator
from mission.waypoint import Waypoint
from .elevation_service import elevation_service, ElevationService
from .models import ElevationPoint, ElevationProfileReport


class ElevationProfileGenerator:
    """
    Computes high-resolution terrain cross-sections, elevation minimums/maximums,
    and highest geographical obstacle points along spatial paths.
    """

    def __init__(self, elev_service: ElevationService = elevation_service) -> None:
        self.elevation_service = elev_service

    def generate_profile(
        self,
        start_lat: float,
        start_lon: float,
        end_lat: float,
        end_lon: float,
        num_samples: int = 50,
    ) -> ElevationProfileReport:
        """
        Samples elevation profile along a straight-line vector.
        """
        total_dist_m = RouteCalculator.calculate_distance(start_lat, start_lon, end_lat, end_lon)
        samples: List[ElevationPoint] = []

        d_lat = end_lat - start_lat
        d_lon = end_lon - start_lon

        min_elev = float("inf")
        max_elev = float("-inf")
        total_elev = 0.0

        highest_pt: Optional[ElevationPoint] = None
        lowest_pt: Optional[ElevationPoint] = None

        for i in range(num_samples):
            fraction = i / (num_samples - 1) if num_samples > 1 else 0.0
            cur_lat = start_lat + (fraction * d_lat)
            cur_lon = start_lon + (fraction * d_lon)
            dist_along = fraction * total_dist_m

            elev = self.elevation_service.get_elevation(cur_lat, cur_lon)
            pt = ElevationPoint(
                latitude=cur_lat,
                longitude=cur_lon,
                elevation_m=round(elev, 2),
                distance_along_m=round(dist_along, 1),
            )
            samples.append(pt)

            total_elev += elev
            if elev > max_elev:
                max_elev = elev
                highest_pt = pt
            if elev < min_elev:
                min_elev = elev
                lowest_pt = pt

        avg_elev = total_elev / num_samples if num_samples > 0 else 0.0

        return ElevationProfileReport(
            start_point=(start_lat, start_lon),
            end_point=(end_lat, end_lon),
            total_distance_m=round(total_dist_m, 1),
            min_elevation_m=round(min_elev, 2),
            max_elevation_m=round(max_elev, 2),
            avg_elevation_m=round(avg_elev, 2),
            highest_point=highest_pt or ElevationPoint(start_lat, start_lon, 0.0),
            lowest_point=lowest_pt or ElevationPoint(start_lat, start_lon, 0.0),
            samples=samples,
        )

    def generate_mission_profile(
        self,
        waypoints: List[Waypoint],
        home_lat: float,
        home_lon: float,
        samples_per_segment: int = 20,
    ) -> ElevationProfileReport:
        """
        Generates full elevation cross-section across all mission flight legs.
        """
        if not waypoints:
            elev = self.elevation_service.get_elevation(home_lat, home_lon)
            pt = ElevationPoint(home_lat, home_lon, elev)
            return ElevationProfileReport(
                start_point=(home_lat, home_lon),
                end_point=(home_lat, home_lon),
                total_distance_m=0.0,
                min_elevation_m=elev,
                max_elevation_m=elev,
                avg_elevation_m=elev,
                highest_point=pt,
                lowest_point=pt,
                samples=[pt],
            )

        points = [(home_lat, home_lon)] + [(wp.latitude, wp.longitude) for wp in waypoints]
        all_samples: List[ElevationPoint] = []
        cumulative_dist = 0.0

        min_elev = float("inf")
        max_elev = float("-inf")
        total_elev = 0.0
        highest_pt: Optional[ElevationPoint] = None
        lowest_pt: Optional[ElevationPoint] = None

        for s in range(len(points) - 1):
            p1 = points[s]
            p2 = points[s + 1]
            seg_dist = RouteCalculator.calculate_distance(p1[0], p1[1], p2[0], p2[1])

            d_lat = p2[0] - p1[0]
            d_lon = p2[1] - p1[1]

            for i in range(samples_per_segment):
                # Skip duplicate vertex at segment start if not first segment
                if s > 0 and i == 0:
                    continue

                fraction = i / (samples_per_segment - 1) if samples_per_segment > 1 else 0.0
                cur_lat = p1[0] + (fraction * d_lat)
                cur_lon = p1[1] + (fraction * d_lon)
                dist_along = cumulative_dist + (fraction * seg_dist)

                elev = self.elevation_service.get_elevation(cur_lat, cur_lon)
                pt = ElevationPoint(cur_lat, cur_lon, round(elev, 2), round(dist_along, 1))
                all_samples.append(pt)

                total_elev += elev
                if elev > max_elev:
                    max_elev = elev
                    highest_pt = pt
                if elev < min_elev:
                    min_elev = elev
                    lowest_pt = pt

            cumulative_dist += seg_dist

        avg_elev = total_elev / len(all_samples) if all_samples else 0.0

        return ElevationProfileReport(
            start_point=(home_lat, home_lon),
            end_point=(waypoints[-1].latitude, waypoints[-1].longitude),
            total_distance_m=round(cumulative_dist, 1),
            min_elevation_m=round(min_elev, 2),
            max_elevation_m=round(max_elev, 2),
            avg_elevation_m=round(avg_elev, 2),
            highest_point=highest_pt or all_samples[0],
            lowest_point=lowest_pt or all_samples[0],
            samples=all_samples,
        )


# Backward compatibility class and singletons
class ElevationProfiler:
    @staticmethod
    def sample_path(start_lat: float, start_lon: float, end_lat: float, end_lon: float, num_samples: int = 20) -> List[Dict[str, float]]:
        gen = ElevationProfileGenerator()
        rep = gen.generate_profile(start_lat, start_lon, end_lat, end_lon, num_samples)
        return [
            {
                "index": i,
                "distance_m": pt.distance_along_m,
                "elevation_m": pt.elevation_m,
                "lat": pt.latitude,
                "lon": pt.longitude,
            }
            for i, pt in enumerate(rep.samples)
        ]


elevation_profile_generator = ElevationProfileGenerator()
elevation_profiler = ElevationProfiler()
