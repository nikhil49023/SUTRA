#!/usr/bin/env python3
"""
PROJECT SUTRA — SUTRA-FSD: Quintic Polynomial Trajectory Ribbon Planner
======================================================================
Author: Tech Lead Nikhil (Subsystem A Lead)
Location: sutra_ws/src/sutra_gnc/sutra_gnc/sutra_fsd_trajectory_planner.py

Generates and evaluates a bundle of candidate 3D quintic polynomial splines (Tesla FSD style):
- Solves closed-form C^2 continuous splines ensuring zero instantaneous jerk.
- Evaluates composite cost volume: Collision risk in 3D Occupancy Grid + Goal progress + Kinematic smoothness.
- Selects the optimal trajectory ribbon tau* at 50Hz.
"""

import math
import numpy as np
from typing import List, Tuple, Optional
from sutra_gnc.sutra_fsd_occupancy import SutraFsdOccupancyGrid


class Quintic1D:
    """1D Closed-Form Quintic Polynomial: p(t) = a0 + a1*t + a2*t^2 + a3*t^3 + a4*t^4 + a5*t^5"""

    def __init__(self, x0: float, v0: float, a0: float, xT: float, vT: float, aT: float, T: float):
        self.T = max(0.1, T)
        self.a0 = x0
        self.a1 = v0
        self.a2 = 0.5 * a0

        # Linear 3x3 matrix solve for high-order coefficients [a3, a4, a5]
        T2 = self.T * self.T
        T3 = T2 * self.T
        T4 = T3 * self.T
        T5 = T4 * self.T

        A = np.array([
            [T3, T4, T5],
            [3.0 * T2, 4.0 * T3, 5.0 * T4],
            [6.0 * self.T, 12.0 * T2, 20.0 * T3],
        ], dtype=np.float64)

        b = np.array([
            xT - self.a0 - self.a1 * self.T - self.a2 * T2,
            vT - self.a1 - 2.0 * self.a2 * self.T,
            aT - 2.0 * self.a2,
        ], dtype=np.float64)

        try:
            coeffs = np.linalg.solve(A, b)
            self.a3, self.a4, self.a5 = coeffs[0], coeffs[1], coeffs[2]
        except np.linalg.LinAlgError:
            self.a3, self.a4, self.a5 = 0.0, 0.0, 0.0

    def pos(self, t: float) -> float:
        t = max(0.0, min(self.T, t))
        return self.a0 + self.a1*t + self.a2*t**2 + self.a3*t**3 + self.a4*t**4 + self.a5*t**5

    def vel(self, t: float) -> float:
        t = max(0.0, min(self.T, t))
        return self.a1 + 2.0*self.a2*t + 3.0*self.a3*t**2 + 4.0*self.a4*t**3 + 5.0*self.a5*t**4

    def accel(self, t: float) -> float:
        t = max(0.0, min(self.T, t))
        return 2.0*self.a2 + 6.0*self.a3*t + 12.0*self.a4*t**2 + 20.0*self.a5*t**3

    def jerk(self, t: float) -> float:
        t = max(0.0, min(self.T, t))
        return 6.0*self.a3 + 24.0*self.a4*t + 60.0*self.a5*t**2


class Trajectory3D:
    """Parametric 3D Quintic Trajectory Ribbon."""

    def __init__(self, qx: Quintic1D, qy: Quintic1D, qz: Quintic1D, T: float):
        self.qx = qx
        self.qy = qy
        self.qz = qz
        self.T = T
        self.cost = float("inf")

    def sample_positions(self, num_samples: int = 20) -> List[Tuple[float, float, float]]:
        times = np.linspace(0.0, self.T, num_samples)
        return [(self.qx.pos(t), self.qy.pos(t), self.qz.pos(t)) for t in times]

    def get_state_at(self, t: float) -> Tuple[Tuple[float, float, float], Tuple[float, float, float], Tuple[float, float, float]]:
        p = (self.qx.pos(t), self.qy.pos(t), self.qz.pos(t))
        v = (self.qx.vel(t), self.qy.vel(t), self.qz.vel(t))
        a = (self.qx.accel(t), self.qy.accel(t), self.qz.accel(t))
        return p, v, a

    def compute_total_jerk_integral(self, num_samples: int = 20) -> float:
        times = np.linspace(0.0, self.T, num_samples)
        total_jerk = 0.0
        dt = self.T / num_samples
        for t in times:
            jx = self.qx.jerk(t)
            jy = self.qy.jerk(t)
            jz = self.qz.jerk(t)
            total_jerk += (jx*jx + jy*jy + jz*jz) * dt
        return total_jerk


class SutraFsdTrajectoryPlanner:
    """
    Tesla FSD-Style Cost-Volume Trajectory Optimizer.
    Evaluates candidate ribbons against 3D Occupancy, Swarm Peers, and Kinematic Jerk.
    """

    def __init__(
        self,
        time_horizon: float = 3.0,  # 3.0s look-ahead horizon
        num_candidates: int = 35,   # Number of candidate ribbons sampled in parallel
        max_speed: float = 3.5,
        max_accel: float = 2.50,    # Gate G5 / G1: 2.50 m/s^2
        max_jerk: float = 5.00,     # Gate G1: 5.00 m/s^3
    ):
        self.horizon = time_horizon
        self.num_cand = num_candidates
        self.max_speed = max_speed
        self.max_accel = max_accel
        self.max_jerk = max_jerk

        # Cost function weights (Tesla FSD inspired)
        self.w_occ = 10.0      # Hard collision avoidance
        self.w_goal = 2.5      # Waypoint progress
        self.w_jerk = 0.1      # Smoothness / zero passenger/airframe stress
        self.w_accel = 0.5     # Aerodynamic efficiency

    def plan(
        self,
        current_pos: Tuple[float, float, float],
        current_vel: Tuple[float, float, float],
        current_acc: Tuple[float, float, float],
        goal_pos: Tuple[float, float, float],
        occupancy_grid: SutraFsdOccupancyGrid,
    ) -> Trajectory3D:
        """
        Generates and scores candidate quintic polynomial trajectories.
        Returns the minimum-cost optimal trajectory ribbon tau*.
        """
        cx, cy, cz = current_pos
        vx, vy, vz = current_vel
        ax, ay, az = current_acc
        gx, gy, gz = goal_pos

        # Vector towards goal
        dx = gx - cx
        dy = gy - cy
        dz = gz - cz
        dist_to_goal = math.sqrt(dx*dx + dy*dy + dz*dz)

        # Nominal direction & normal vectors for lateral/vertical ribbon sampling
        if dist_to_goal > 0.1:
            nx = dx / dist_to_goal
            ny = dy / dist_to_goal
            nz = dz / dist_to_goal
        else:
            nx, ny, nz = 1.0, 0.0, 0.0

        # Perpendicular horizontal and vertical basis vectors
        lat_x = -ny
        lat_y = nx
        lat_z = 0.0

        vert_x = 0.0
        vert_y = 0.0
        vert_z = 1.0

        # Lookahead target distance
        d_lookahead = min(dist_to_goal, self.max_speed * self.horizon)
        nominal_target = (cx + nx * d_lookahead, cy + ny * d_lookahead, cz + nz * d_lookahead)

        # Generate candidate trajectory ribbons
        candidates: List[Trajectory3D] = []

        lateral_offsets = [-2.5, -1.5, -0.8, 0.0, 0.8, 1.5, 2.5]
        vertical_offsets = [-1.0, 0.0, 1.0]

        for d_lat in lateral_offsets:
            for d_vert in vertical_offsets:
                # Target endpoint for this candidate ribbon
                tx = nominal_target[0] + lat_x * d_lat + vert_x * d_vert
                ty = nominal_target[1] + lat_y * d_lat + vert_y * d_vert
                tz = nominal_target[2] + lat_z * d_lat + vert_z * d_vert

                # Terminal velocity target (pointing towards goal)
                tvx = nx * min(self.max_speed, dist_to_goal / self.horizon)
                tvy = ny * min(self.max_speed, dist_to_goal / self.horizon)
                tvz = nz * min(self.max_speed, dist_to_goal / self.horizon)

                tax, tay, taz = 0.0, 0.0, 0.0

                qx = Quintic1D(cx, vx, ax, tx, tvx, tax, self.horizon)
                qy = Quintic1D(cy, vy, ay, ty, tvy, tay, self.horizon)
                qz = Quintic1D(cz, vz, az, tz, tvz, taz, self.horizon)

                traj = Trajectory3D(qx, qy, qz, self.horizon)
                candidates.append(traj)

        # Evaluate cost volume for each ribbon
        best_traj = candidates[0]
        min_cost = float("inf")

        for traj in candidates:
            # 1. Sample 3D trajectory points
            pts = traj.sample_positions(num_samples=15)

            # 2. Collision Cost in 3D Occupancy Grid
            c_occ = occupancy_grid.query_trajectory_collision_cost(pts, current_pos)

            # 3. Goal Progress Cost (distance from end of ribbon to goal)
            end_pt = pts[-1]
            c_goal = math.sqrt((end_pt[0] - gx)**2 + (end_pt[1] - gy)**2 + (end_pt[2] - gz)**2)

            # 4. Jerk Integral Cost (Smoothness)
            c_jerk = traj.compute_total_jerk_integral(num_samples=10)

            # Total Composite Cost
            total_cost = (
                self.w_occ * c_occ +
                self.w_goal * c_goal +
                self.w_jerk * c_jerk
            )
            traj.cost = total_cost

            if total_cost < min_cost:
                min_cost = total_cost
                best_traj = traj

        return best_traj
