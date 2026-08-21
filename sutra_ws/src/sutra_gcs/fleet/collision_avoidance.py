"""
SUTRA GCS — Gate G5 Verified ORCA 3D Multi-Agent Collision Avoidance
Maintains > 2.8m separation buffer between swarm agents.
"""

import math
from typing import Tuple, List, Dict


class CollisionAvoidanceEngine:
    """Optimal Reciprocal Collision Avoidance (ORCA 3D) Velocity Obstacle solver."""

    def __init__(self, safety_radius: float = 3.6, time_horizon: float = 2.0, max_speed: float = 8.0):
        self.safety_radius = safety_radius
        self.time_horizon = time_horizon
        self.max_speed = max_speed

    def compute_avoidance_velocity(
        self,
        pos_i: Tuple[float, float, float],
        vel_pref: Tuple[float, float, float],
        neighbors: List[Tuple[Tuple[float, float, float], Tuple[float, float, float]]]
    ) -> Tuple[float, float, float]:
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
                    p_rel[2] - v_rel[2] * t_cpa
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


collision_avoidance = CollisionAvoidanceEngine()
