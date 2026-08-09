#!/usr/bin/env python3
"""
SUTRA Subsystem A: APACE-lite Perception-Aware Feature Matchability Cost
Reference: APACE — Agile & Perception-Aware Trajectory Generation (arXiv 2403.08365)

This module computes a lightweight feature-matchability cost for the NMPC
trajectory planner. Trajectories that pass through low-texture regions
(dust, smoke, uniform walls) are penalised so the optimizer steers toward
feature-rich areas where VIO tracking stays healthy.

Gazebo SIM integration:
  - Feature density is derived from /sutra/gnc/vio_status quality_score stream.
  - Regions where quality_score consistently < 0.6 are marked low-density.
  - Gazebo environments with empty walls will correctly penalise those headings.

Wind robustness:
  - Cost is position/yaw dependent, not velocity dependent, so wind-induced
    velocity perturbations do not corrupt the feature map.
"""

import math
from typing import Tuple, Dict, Optional


class APACEFeatureCost:
    """
    Lightweight perception-awareness cost for NMPC trajectory optimization.

    Maintains a 2D spatial grid of expected feature density. Each cell records
    the average VIO quality_score observed while the drone was in that region.
    Low quality → high cost → optimizer avoids the region.

    Parameters
    ----------
    fov_deg          : Camera horizontal field of view in degrees.
    grid_res_m       : Spatial resolution of the feature density grid (metres).
    grid_extent_m    : One-sided extent of the grid (total = 2 * extent).
    default_density  : Assumed density for unvisited cells (optimistic default).
    low_density_thresh: Quality score below this triggers low-density marking.
    """

    def __init__(
        self,
        fov_deg: float = 90.0,
        grid_res_m: float = 1.0,
        grid_extent_m: float = 50.0,
        default_density: float = 0.75,
        low_density_thresh: float = 0.55,
    ):
        self.fov_rad = math.radians(fov_deg)
        self.grid_res = grid_res_m
        self.grid_extent = grid_extent_m
        self.default_density = default_density
        self.low_density_thresh = low_density_thresh

        # {(grid_ix, grid_iy) -> (sum_quality, count)}
        self._density_map: Dict[Tuple[int, int], Tuple[float, int]] = {}

    # ── Cost computation ─────────────────────────────────────────────────────

    def cost(
        self,
        position: Tuple[float, float, float],
        yaw_rad: float,
        lookahead_m: float = 3.0,
    ) -> float:
        """
        Returns a feature-matchability cost in [0.0, 1.0].
        0.0 = feature-rich region (low cost, prefer this).
        1.0 = feature-starved region (high cost, avoid).

        Evaluates the density of the camera's field-of-view cone projected
        on the horizontal plane `lookahead_m` ahead of the current pose.
        """
        # Sample 5 points in the FOV cone ahead
        sample_costs = []
        half_fov = self.fov_rad / 2.0
        for angle_offset in (-half_fov, -half_fov/2, 0.0, half_fov/2, half_fov):
            bearing = yaw_rad + angle_offset
            sx = position[0] + lookahead_m * math.cos(bearing)
            sy = position[1] + lookahead_m * math.sin(bearing)
            density = self._get_density(sx, sy)
            cost = max(0.0, min(1.0, 1.0 - density))
            sample_costs.append(cost)

        return sum(sample_costs) / len(sample_costs)

    def trajectory_cost(
        self,
        positions: list,
        yaws: list,
    ) -> float:
        """
        Computes the mean feature cost over a trajectory segment.
        Suitable for use as an additive term in the NMPC objective function.
        """
        if not positions:
            return 0.0
        total = 0.0
        for pos, yaw in zip(positions, yaws):
            total += self.cost(pos, yaw)
        return total / len(positions)

    # ── Online density map update ─────────────────────────────────────────────

    def update_density(
        self,
        drone_pose: Tuple[float, float, float],
        tracking_quality: float,
    ) -> None:
        """
        Records the observed VIO tracking quality at the current drone location.
        Call this at each VIO frame to keep the feature map current.

        Parameters
        ----------
        drone_pose       : Current (x, y, z) position in world frame.
        tracking_quality : VIO quality_score from VIOLocalizationFilter [0, 1].
        """
        key = self._pos_to_cell(drone_pose[0], drone_pose[1])
        prev_sum, prev_count = self._density_map.get(key, (0.0, 0))
        # Exponential forgetting: weight recent observations more heavily
        # (equivalent to a windowed average of last ~20 observations)
        alpha = max(0.05, 1.0 / max(1, prev_count + 1))
        new_val = (1 - alpha) * (prev_sum / max(1, prev_count)) + alpha * tracking_quality
        self._density_map[key] = (new_val, prev_count + 1)

    def get_low_density_regions(
        self, threshold: Optional[float] = None
    ) -> list:
        """
        Returns a list of (x, y) world-frame positions of known low-density regions.
        Useful for visualization on the GCS HUD.
        """
        thresh = threshold if threshold is not None else self.low_density_thresh
        result = []
        for (ix, iy), (q_sum, count) in self._density_map.items():
            if count > 0 and (q_sum / count) < thresh:
                wx = (ix + 0.5) * self.grid_res
                wy = (iy + 0.5) * self.grid_res
                result.append((wx, wy))
        return result

    # ── Internal helpers ─────────────────────────────────────────────────────

    def _get_density(self, x: float, y: float) -> float:
        """Returns feature density at world position (x, y)."""
        key = self._pos_to_cell(x, y)
        if key not in self._density_map:
            return self.default_density
        q_sum, count = self._density_map[key]
        return q_sum / max(1, count)

    def _pos_to_cell(self, x: float, y: float) -> Tuple[int, int]:
        """Maps world XY position to grid cell index."""
        return (int(math.floor(x / self.grid_res)), int(math.floor(y / self.grid_res)))
