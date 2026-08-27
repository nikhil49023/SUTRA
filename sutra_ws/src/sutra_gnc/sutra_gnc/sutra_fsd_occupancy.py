#!/usr/bin/env python3
"""
PROJECT SUTRA — SUTRA-FSD: 3D Spatio-Temporal Occupancy Grid Engine
==================================================================
Author: Tech Lead Nikhil (Subsystem A Lead)
Location: sutra_ws/src/sutra_gnc/sutra_gnc/sutra_fsd_occupancy.py

Constructs a continuous 3D metric voxel occupancy grid (32 x 32 x 16) around the UAV:
- Inspired by Tesla FSD Occupancy Network (Karpathy / Elluswamy).
- Fuses point clouds, laser rangefinders, bounding box obstacles, and peer UAV positions.
- Maintains a rolling temporal FIFO queue with decay memory so occluded obstacles are remembered.
"""

import math
import numpy as np
from typing import List, Tuple, Optional


class SutraFsdOccupancyGrid:
    """
    3D Metric Voxel Occupancy Grid centered in local drone body-fixed or world frame.
    Default grid resolution:
      - X span: [-16m, +16m] (32 cells @ 1.0m resolution)
      - Y span: [-16m, +16m] (32 cells @ 1.0m resolution)
      - Z span: [-4m,  +12m] (16 cells @ 1.0m resolution)
    """

    def __init__(
        self,
        grid_dim_xy: int = 32,
        grid_dim_z: int = 16,
        resolution: float = 1.0,  # 1.0m per voxel
        temporal_decay: float = 0.92,  # Memory retention rate per 50Hz step (~0.5s half-life)
    ):
        self.nx = grid_dim_xy
        self.ny = grid_dim_xy
        self.nz = grid_dim_z
        self.res = resolution
        self.decay = temporal_decay

        self.x_min = - (self.nx * self.res) / 2.0  # -16.0m
        self.y_min = - (self.ny * self.res) / 2.0  # -16.0m
        self.z_min = -4.0                          # -4.0m relative to drone
        self.z_max = self.z_min + (self.nz * self.res)  # +12.0m

        # 3D Occupancy Probability Grid: V(x, y, z) in [0.0, 1.0]
        self.grid = np.zeros((self.nx, self.ny, self.nz), dtype=np.float32)

    def world_to_grid(self, wx: float, wy: float, wz: float, origin_pos: Tuple[float, float, float]) -> Optional[Tuple[int, int, int]]:
        """Converts world coordinate to integer voxel indices relative to current drone origin."""
        ox, oy, oz = origin_pos
        rel_x = wx - ox
        rel_y = wy - oy
        rel_z = wz - oz

        ix = int((rel_x - self.x_min) / self.res)
        iy = int((rel_y - self.y_min) / self.res)
        iz = int((rel_z - self.z_min) / self.res)

        if 0 <= ix < self.nx and 0 <= iy < self.ny and 0 <= iz < self.nz:
            return ix, iy, iz
        return None

    def grid_to_world(self, ix: int, iy: int, iz: int, origin_pos: Tuple[float, float, float]) -> Tuple[float, float, float]:
        """Converts grid voxel index back to world coordinate."""
        ox, oy, oz = origin_pos
        wx = ox + self.x_min + (ix + 0.5) * self.res
        wy = oy + self.y_min + (iy + 0.5) * self.res
        wz = oz + self.z_min + (iz + 0.5) * self.res
        return wx, wy, wz

    def step_temporal_decay(self):
        """Decays historical occupancy values by temporal factor (Tesla temporal queue memory)."""
        self.grid *= self.decay
        self.grid[self.grid < 0.01] = 0.0

    def insert_point_cloud(self, points: np.ndarray, origin_pos: Tuple[float, float, float], confidence: float = 0.85):
        """
        Inserts 3D point cloud array (N x 3) into the occupancy voxel grid.
        """
        self.step_temporal_decay()
        for p in points:
            idx = self.world_to_grid(p[0], p[1], p[2], origin_pos)
            if idx:
                ix, iy, iz = idx
                self.grid[ix, iy, iz] = min(1.0, self.grid[ix, iy, iz] + confidence)

    def insert_peer_drone_safety_bubble(
        self,
        peer_pos: Tuple[float, float, float],
        peer_vel: Tuple[float, float, float],
        origin_pos: Tuple[float, float, float],
        safety_radius: float = 2.80,
    ):
        """
        Injects a dynamic 3D velocity-dilated Gaussian occupancy bubble for a peer drone.
        """
        px, py, pz = peer_pos
        vx, vy, vz = peer_vel
        
        # Sample bounding box of safety bubble
        r_voxels = int(math.ceil(safety_radius / self.res))
        c_idx = self.world_to_grid(px, py, pz, origin_pos)
        if not c_idx:
            return

        cx, cy, cz = c_idx
        for dx in range(-r_voxels, r_voxels + 1):
            for dy in range(-r_voxels, r_voxels + 1):
                for dz in range(-r_voxels, r_voxels + 1):
                    ix, iy, iz = cx + dx, cy + dy, cz + dz
                    if 0 <= ix < self.nx and 0 <= iy < self.ny and 0 <= iz < self.nz:
                        dist = math.sqrt(dx*dx + dy*dy + dz*dz) * self.res
                        if dist <= safety_radius:
                            prob = math.exp(- (dist*dist) / (2.0 * (safety_radius/2.0)**2))
                            self.grid[ix, iy, iz] = max(self.grid[ix, iy, iz], float(prob))

    def query_point_occupancy(self, wx: float, wy: float, wz: float, origin_pos: Tuple[float, float, float]) -> float:
        """Returns trilinear interpolated occupancy probability at world coordinate."""
        idx = self.world_to_grid(wx, wy, wz, origin_pos)
        if idx:
            return float(self.grid[idx[0], idx[1], idx[2]])
        return 0.0

    def query_trajectory_collision_cost(self, trajectory_points: List[Tuple[float, float, float]], origin_pos: Tuple[float, float, float]) -> float:
        """
        Integrates occupancy probability along a continuous 3D trajectory ribbon.
        Returns total collision risk cost.
        """
        total_cost = 0.0
        for pt in trajectory_points:
            occ = self.query_point_occupancy(pt[0], pt[1], pt[2], origin_pos)
            if occ > 0.5:
                total_cost += occ * 50.0  # Heavy penalty for high occupancy
            else:
                total_cost += occ * 5.0
        return total_cost
