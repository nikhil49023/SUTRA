"""
Smart Horizon GCS — Geodetic 2-Opt Waypoint Route Optimization Engine
Subsystem: Mission Engine (Phase 5)
"""

from typing import List

from mission.models import Mission
from mission.route_calculator import RouteCalculator
from mission.waypoint import Waypoint


class RouteOptimizer:
    """
    Optimizes waypoint flight corridors using 2-opt heuristic search
    to minimize total path distance and airframe battery consumption.
    """

    @classmethod
    def optimize_route(cls, waypoints: List[Waypoint], home_lat: float, home_lon: float) -> List[Waypoint]:
        """
        Runs 2-opt path optimization across waypoints.
        """
        if len(waypoints) <= 3:
            return list(waypoints)

        best_wps = list(waypoints)
        best_dist = RouteCalculator.calculate_total_distance(best_wps, home_lat, home_lon)
        improved = True

        iterations = 0
        while improved and iterations < 50:
            improved = False
            iterations += 1

            for i in range(1, len(best_wps) - 1):
                for j in range(i + 1, len(best_wps)):
                    new_wps = best_wps[:i] + best_wps[i:j + 1][::-1] + best_wps[j + 1:]
                    new_dist = RouteCalculator.calculate_total_distance(new_wps, home_lat, home_lon)

                    if new_dist < best_dist - 0.5:
                        best_wps = new_wps
                        best_dist = new_dist
                        improved = True
                        break
                if improved:
                    break

        # Re-index
        from dataclasses import replace
        return [replace(wp, index=i + 1) for i, wp in enumerate(best_wps)]
