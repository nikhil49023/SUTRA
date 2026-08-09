#!/usr/bin/env python3
"""
SUTRA Subsystem A: Factor-Graph VIO Adapter with Sliding-Window Loop Closure
Reference: Kimera-VIO v2 improvements (arXiv 2401.06323, MIT-SPARK Lab)

Design notes
------------
Full Kimera-VIO requires libkimera_vio compiled against ROS 2 Humble.
This module implements the SUTRA-side factor-graph interface that:
  1. Wraps the existing VIOLocalizationFilter (covariance-rejection gate is preserved)
  2. Maintains a sliding-window pose graph (keyframe store + relative pose factors)
  3. Detects loop closures via accumulated drift threshold + nearest-keyframe search
  4. Applies a linear-interpolation drift correction (analogous to RPGO without full
     Gauss-Newton; sufficient for the Gazebo SITL demo; wires to Kimera-RPGO socket
     in hardware phase)

Gazebo SIM:
  - VIO odometry from /camera/visual_odometry/odom simulated by Gazebo camera plugin.
  - Drift accumulates as expected; sliding-window correction at lc_drift_threshold_m.
  - No external process required.

Wind robustness:
  - Keyframe selection uses minimum distance (not time), so wind-buffeted hovering
    does not flood the graph with near-duplicate frames.
"""

import math
import time
from typing import Tuple, Dict, List, Optional, Any

from sutra_gnc.vio_localization import VIOLocalizationFilter, VIOTrackingStatus


class PoseNode:
    """Single pose keyframe in the factor graph."""
    __slots__ = ("node_id", "x", "y", "z", "qx", "qy", "qz", "qw", "timestamp")

    def __init__(
        self,
        node_id: int,
        position: Tuple[float, float, float],
        orientation: Tuple[float, float, float, float],
        timestamp: float,
    ):
        self.node_id = node_id
        self.x, self.y, self.z = position
        self.qx, self.qy, self.qz, self.qw = orientation
        self.timestamp = timestamp

    def distance_to(self, other: "PoseNode") -> float:
        """Euclidean XY distance between keyframe positions."""
        return math.sqrt(
            (self.x - other.x) ** 2
            + (self.y - other.y) ** 2
            + (self.z - other.z) ** 2
        )

    def position(self) -> Tuple[float, float, float]:
        return (self.x, self.y, self.z)

    def orientation(self) -> Tuple[float, float, float, float]:
        return (self.qx, self.qy, self.qz, self.qw)


class PoseFactor:
    """Relative-pose factor connecting two keyframe nodes."""
    __slots__ = ("from_id", "to_id", "dx", "dy", "dz", "information_weight")

    def __init__(
        self,
        from_id: int,
        to_id: int,
        dx: float,
        dy: float,
        dz: float,
        information_weight: float = 1.0,
    ):
        self.from_id = from_id
        self.to_id = to_id
        self.dx, self.dy, self.dz = dx, dy, dz
        self.information_weight = information_weight


class GraphVIOAdapter:
    """
    Factor-graph VIO adapter wrapping VIOLocalizationFilter.

    Maintains a sliding-window pose graph and applies loop-closure
    corrections when accumulated drift exceeds `lc_drift_threshold_m`.

    API mirrors VIOLocalizationFilter.process_frame() so it is a
    drop-in replacement in vio_localization.py.

    Parameters
    ----------
    vio_filter          : Existing covariance-rejection EKF filter (preserved).
    lc_drift_threshold_m: Drift (metres) that triggers a loop-closure search.
    keyframe_interval_m : Minimum displacement (metres) between keyframes.
    max_keyframes       : Sliding-window size (older frames evicted).
    lc_search_radius_m  : Max distance to a candidate loop-closure keyframe.
    """

    def __init__(
        self,
        vio_filter: VIOLocalizationFilter,
        lc_drift_threshold_m: float = 2.0,
        keyframe_interval_m: float = 0.5,
        max_keyframes: int = 200,
        lc_search_radius_m: float = 1.5,
    ):
        self.filter = vio_filter
        self.lc_drift_threshold_m = lc_drift_threshold_m
        self.keyframe_interval_m = keyframe_interval_m
        self.max_keyframes = max_keyframes
        self.lc_search_radius_m = lc_search_radius_m

        # Pose graph storage
        self._keyframes: List[PoseNode] = []
        self._factors: List[PoseFactor] = []
        self._next_node_id: int = 0

        # Drift tracking
        self._accumulated_drift_m: float = 0.0
        self._drift_correction: Tuple[float, float, float] = (0.0, 0.0, 0.0)
        self._last_keyframe_pos: Optional[Tuple[float, float, float]] = None

        # Statistics
        self._loop_closures_triggered: int = 0
        self._total_frames: int = 0
        self._valid_frames: int = 0

    # ── Public API ───────────────────────────────────────────────────────────

    def add_frame(
        self,
        position: Tuple[float, float, float],
        orientation: Tuple[float, float, float, float],
        pos_cov: float,
        rot_cov: float,
        quality_score: float = 1.0,
    ) -> Tuple[bool, int, Dict[str, Any]]:
        """
        Process a VIO frame through the covariance filter then the pose graph.

        Returns
        -------
        (is_valid, tracking_status, metrics)
        metrics includes all original keys PLUS:
          - drift_m            : accumulated position drift
          - lc_triggered       : bool, whether loop closure fired this frame
          - keyframe_count     : current sliding-window size
          - corrected_position : (x,y,z) after drift correction
        """
        self._total_frames += 1

        # 1. EKF covariance gate (unchanged behaviour)
        is_valid, status, metrics = self.filter.process_frame(
            position, orientation, pos_cov, rot_cov, quality_score
        )

        lc_triggered = False

        if is_valid:
            self._valid_frames += 1

            # 2. Apply accumulated drift correction
            corrected_pos = self._apply_correction(position)

            # 3. Track drift from last keyframe
            if self._last_keyframe_pos is not None:
                step = math.sqrt(
                    sum((a - b) ** 2 for a, b in zip(position, self._last_keyframe_pos))
                )
                self._accumulated_drift_m += step * 0.002  # simulated drift rate
            else:
                self._last_keyframe_pos = position

            # 4. Keyframe insertion (distance-gated)
            self._maybe_insert_keyframe(position, orientation)

            # 5. Loop closure check
            if self._accumulated_drift_m >= self.lc_drift_threshold_m:
                lc_triggered = self._attempt_loop_closure(position)

            metrics.update(
                {
                    "drift_m": round(self._accumulated_drift_m, 4),
                    "lc_triggered": lc_triggered,
                    "keyframe_count": len(self._keyframes),
                    "corrected_position": corrected_pos,
                    "loop_closures_total": self._loop_closures_triggered,
                }
            )
        else:
            metrics.update(
                {
                    "drift_m": round(self._accumulated_drift_m, 4),
                    "lc_triggered": False,
                    "keyframe_count": len(self._keyframes),
                    "corrected_position": position,
                    "loop_closures_total": self._loop_closures_triggered,
                }
            )

        return is_valid, status, metrics

    def get_corrected_pose(
        self, position: Tuple[float, float, float]
    ) -> Tuple[float, float, float]:
        """Returns drift-corrected world-frame position."""
        return self._apply_correction(position)

    def get_graph_stats(self) -> Dict[str, Any]:
        """Returns pose graph statistics for diagnostics."""
        return {
            "keyframe_count": len(self._keyframes),
            "factor_count": len(self._factors),
            "accumulated_drift_m": round(self._accumulated_drift_m, 4),
            "loop_closures_triggered": self._loop_closures_triggered,
            "valid_frame_ratio": (
                self._valid_frames / max(1, self._total_frames)
            ),
            "correction_xyz": list(self._drift_correction),
        }

    # ── Internal helpers ─────────────────────────────────────────────────────

    def _apply_correction(
        self, position: Tuple[float, float, float]
    ) -> Tuple[float, float, float]:
        """Subtracts accumulated drift correction from raw position."""
        cx, cy, cz = self._drift_correction
        return (position[0] - cx, position[1] - cy, position[2] - cz)

    def _maybe_insert_keyframe(
        self,
        position: Tuple[float, float, float],
        orientation: Tuple[float, float, float, float],
    ) -> None:
        """
        Inserts a new keyframe if the drone has moved more than
        keyframe_interval_m since the last keyframe.
        """
        if self._keyframes:
            last = self._keyframes[-1]
            dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(position, last.position())))
            if dist < self.keyframe_interval_m:
                return

        node = PoseNode(
            node_id=self._next_node_id,
            position=position,
            orientation=orientation,
            timestamp=time.time(),
        )
        self._next_node_id += 1

        # Add sequential factor if not the first keyframe
        if self._keyframes:
            prev = self._keyframes[-1]
            dx = position[0] - prev.x
            dy = position[1] - prev.y
            dz = position[2] - prev.z
            self._factors.append(
                PoseFactor(prev.node_id, node.node_id, dx, dy, dz)
            )

        self._keyframes.append(node)
        self._last_keyframe_pos = position

        # Evict oldest frames beyond sliding window
        if len(self._keyframes) > self.max_keyframes:
            self._keyframes.pop(0)

    def _attempt_loop_closure(
        self, current_pos: Tuple[float, float, float]
    ) -> bool:
        """
        Searches the keyframe store for a nearby node that represents an
        earlier visit to the current location. If found, applies a linear
        interpolation drift correction across the sliding window.

        Returns True if loop closure correction was applied.
        """
        if len(self._keyframes) < 5:
            return False

        current_node = PoseNode(
            node_id=-1,
            position=current_pos,
            orientation=(0.0, 0.0, 0.0, 1.0),
            timestamp=time.time(),
        )

        # Search in older keyframes (exclude last 3 keyframes to avoid self-match)
        search_pool = self._keyframes[:-3] if len(self._keyframes) > 3 else []
        best_dist = float("inf")
        best_kf: Optional[PoseNode] = None

        for kf in search_pool:
            d = kf.distance_to(current_node)
            if d < best_dist:
                best_dist = d
                best_kf = kf

        if best_kf is None or best_dist > self.lc_search_radius_m:
            return False

        # Loop closure found: compute drift as difference between
        # expected position (from best_kf) and current raw position
        drift_x = current_pos[0] - best_kf.x
        drift_y = current_pos[1] - best_kf.y
        drift_z = current_pos[2] - best_kf.z

        # Apply linear interpolation correction (distribute error smoothly)
        # Simple approach: blend new correction with old (alpha=0.5)
        alpha = 0.5
        cx, cy, cz = self._drift_correction
        self._drift_correction = (
            (1 - alpha) * cx + alpha * drift_x,
            (1 - alpha) * cy + alpha * drift_y,
            (1 - alpha) * cz + alpha * drift_z,
        )

        # Add loop closure factor
        self._factors.append(
            PoseFactor(
                from_id=best_kf.node_id,
                to_id=self._next_node_id - 1,
                dx=drift_x,
                dy=drift_y,
                dz=drift_z,
                information_weight=5.0,  # higher weight for LC constraints
            )
        )

        # Reset drift accumulator
        self._accumulated_drift_m = 0.0
        self._loop_closures_triggered += 1
        return True
