"""
Smart Horizon GCS — Swarm Pairwise Collision Detection & ORCA 3D Avoidance
Subsystem: Swarm Fleet Management (Phase 6)
"""

import math
from typing import Dict, List, Optional, Tuple

from mission.route_calculator import RouteCalculator
from state.fleet_state import DroneState


class CollisionAvoidanceEngine:
    """
    Evaluates pairwise separation distances between active swarm drones,
    detects proximity thresholds, and calculates 3D reciprocal avoidance deflections.
    """

    def __init__(
        self,
        warning_distance_m: float = 10.0,
        critical_distance_m: float = 4.0,
        safety_radius: float = 3.6,
        time_horizon: float = 2.0,
        max_speed: float = 8.0,
    ) -> None:
        self.warning_distance_m = warning_distance_m
        self.critical_distance_m = critical_distance_m
        self.safety_radius = safety_radius
        self.time_horizon = time_horizon
        self.max_speed = max_speed

    def check_fleet_collisions(self, drones: List[DroneState]) -> List[Dict]:
        """
        Audits pairwise 3D distances between all active aircraft.
        Returns list of proximity warnings and critical collision events.
        """
        events: List[Dict] = []
        n = len(drones)
        if n < 2:
            return events

        for i in range(n):
            for j in range(i + 1, n):
                d1 = drones[i]
                d2 = drones[j]

                # Geodesic horizontal distance
                horiz_dist_m = RouteCalculator.calculate_distance(
                    d1.latitude, d1.longitude, d2.latitude, d2.longitude
                )
                alt_diff_m = abs(d1.altitude - d2.altitude)
                dist_3d_m = math.sqrt(horiz_dist_m**2 + alt_diff_m**2)

                if dist_3d_m < self.critical_distance_m:
                    events.append({
                        "severity": "CRITICAL",
                        "drone_1": d1.callsign,
                        "drone_2": d2.callsign,
                        "distance_m": round(dist_3d_m, 2),
                        "message": f"CRITICAL PROXIMITY: {d1.callsign} & {d2.callsign} separation is {dist_3d_m:.1f}m!",
                    })
                elif dist_3d_m < self.warning_distance_m:
                    events.append({
                        "severity": "WARNING",
                        "drone_1": d1.callsign,
                        "drone_2": d2.callsign,
                        "distance_m": round(dist_3d_m, 2),
                        "message": f"Separation warning: {d1.callsign} & {d2.callsign} at {dist_3d_m:.1f}m.",
                    })

        return events

    def compute_avoidance_velocity(
        self,
        pos_i: Tuple[float, float, float],
        vel_pref: Tuple[float, float, float],
        neighbors: List[Tuple[Tuple[float, float, float], Tuple[float, float, float]]],
    ) -> Tuple[float, float, float]:
        """
        Optimal Reciprocal Collision Avoidance (ORCA 3D) Velocity Obstacle solver.
        """
        v_opt = list(vel_pref)

        for pos_j, vel_j in neighbors:
            p_rel = (pos_j[0] - pos_i[0], pos_j[1] - pos_i[1], pos_j[2] - pos_i[2])
            dist = math.sqrt(p_rel[0]**2 + p_rel[1]**2 + p_rel[2]**2)

            if dist < 1e-4:
                continue

            v_rel = (v_opt[0] - vel_j[0], v_opt[1] - vel_j[1], v_opt[2] - vel_j[2])
            dot = p_rel[0] * v_rel[0] + p_rel[1] * v_rel[1] + p_rel[2] * v_rel[2]
            v_rel_sq = v_rel[0]**2 + v_rel[1]**2 + v_rel[2]**2

            if v_rel_sq < 1e-4:
                continue

            t_cpa = dot / v_rel_sq

            if 0 < t_cpa <= self.time_horizon:
                cpa_pos = (
                    p_rel[0] - v_rel[0] * t_cpa,
                    p_rel[1] - v_rel[1] * t_cpa,
                    p_rel[2] - v_rel[2] * t_cpa,
                )
                d_cpa = math.sqrt(cpa_pos[0]**2 + cpa_pos[1]**2 + cpa_pos[2]**2)

                if d_cpa < self.safety_radius:
                    overlap = (self.safety_radius - d_cpa) / t_cpa

                    # Symmetry breaking via lateral cross product (p_rel x [0, 0, 1])
                    lat_dir = (-p_rel[1], p_rel[0], 0.0)
                    lat_norm = math.sqrt(lat_dir[0]**2 + lat_dir[1]**2)

                    if lat_norm > 1e-3:
                        u = (lat_dir[0] / lat_norm, lat_dir[1] / lat_norm, 0.0)
                    else:
                        u = (0.0, 1.0, 0.0)

                    # Reciprocal 50% avoidance deflection
                    v_opt[0] += 0.5 * overlap * u[0]
                    v_opt[1] += 0.5 * overlap * u[1]
                    v_opt[2] += 0.5 * overlap * u[2]

        # Clamp speed
        spd = math.sqrt(v_opt[0]**2 + v_opt[1]**2 + v_opt[2]**2)
        if spd > self.max_speed:
            scale = self.max_speed / spd
            v_opt = [v_opt[0] * scale, v_opt[1] * scale, v_opt[2] * scale]

        return (v_opt[0], v_opt[1], v_opt[2])


# Global singleton
collision_avoidance = CollisionAvoidanceEngine()
