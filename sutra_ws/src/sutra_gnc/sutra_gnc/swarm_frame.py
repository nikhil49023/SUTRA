#!/usr/bin/env python3
"""
SUTRA Subsystem A: CoVOR-SLAM Range-Aided Swarm Frame Merger
References:
  - CoVOR-SLAM: Cooperative SLAM using Visual Odometry + Ranges (arXiv 2311.12580)
  - CoLRIO: LiDAR-Ranging-Inertial Centralized State Estimation (arXiv 2402.11790)
  - Ultra-Lightweight Collaborative Mapping for Robot Swarms (arXiv 2407.03136)
"""

import math
import json
import random
from typing import Dict, List, Optional, Tuple, NamedTuple


class DroneRangeMeasurement(NamedTuple):
    agent_id_from: int
    agent_id_to: int
    range_m: float
    timestamp: float
    sigma_m: float = 0.15


class DroneLocalPose:
    __slots__ = ('agent_id', 'x', 'y', 'z', 'qx', 'qy', 'qz', 'qw', 'timestamp', 'valid')

    def __init__(self, agent_id: int, x=0., y=0., z=0.,
                 qx=0., qy=0., qz=0., qw=1., timestamp=0., valid=True):
        self.agent_id = agent_id
        self.x, self.y, self.z = x, y, z
        self.qx, self.qy, self.qz, self.qw = qx, qy, qz, qw
        self.timestamp = timestamp
        self.valid = valid


class SwarmFrameSolver:
    def __init__(
        self,
        num_drones: int = 5,
        ranging_noise_std_m: float = 0.15,
        lr: float = 0.01,
        max_iter: int = 10,
    ):
        self.num_drones = num_drones
        self.sigma = ranging_noise_std_m
        self.lr = lr
        self.max_iter = max_iter
        self._poses: Dict[int, DroneLocalPose] = {}
        self._ranges: Dict[Tuple[int, int], DroneRangeMeasurement] = {}
        self._corrections: Dict[int, Tuple[float, float, float]] = {}

    def update_local_pose(
        self,
        agent_id: int,
        x: float, y: float, z: float,
        qx: float = 0., qy: float = 0., qz: float = 0., qw: float = 1.,
        timestamp: float = 0.,
        valid: bool = True,
    ) -> None:
        self._poses[agent_id] = DroneLocalPose(
            agent_id, x, y, z, qx, qy, qz, qw, timestamp, valid
        )

    def add_range_measurement(self, meas: DroneRangeMeasurement) -> None:
        key = (min(meas.agent_id_from, meas.agent_id_to),
               max(meas.agent_id_from, meas.agent_id_to))
        self._ranges[key] = meas

    def simulate_gazebo_ranges(
        self,
        gt_positions: Dict[int, Tuple[float, float, float]],
        noise_std_m: float = 0.15,
        rng_seed: Optional[int] = None,
    ) -> None:
        import time
        rng = random.Random(rng_seed)
        ids = list(gt_positions.keys())
        now = time.time()
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                id_a, id_b = ids[i], ids[j]
                pa, pb = gt_positions[id_a], gt_positions[id_b]
                true_dist = math.sqrt(sum((a - b)**2 for a, b in zip(pa, pb)))
                noisy_dist = max(0.01, true_dist + rng.gauss(0, noise_std_m))
                self.add_range_measurement(DroneRangeMeasurement(
                    agent_id_from=id_a,
                    agent_id_to=id_b,
                    range_m=noisy_dist,
                    timestamp=now,
                    sigma_m=noise_std_m,
                ))

    def solve_swarm_frame(
        self,
    ) -> Dict[int, Tuple[float, float, float]]:
        if not self._poses or not self._ranges:
            return {aid: (p.x, p.y, p.z) for aid, p in self._poses.items() if p.valid}

        working: Dict[int, List[float]] = {
            aid: [p.x, p.y, p.z]
            for aid, p in self._poses.items() if p.valid
        }
        weight = 1.0 / (self.sigma ** 2)

        for _ in range(self.max_iter):
            gradients: Dict[int, List[float]] = {aid: [0., 0., 0.] for aid in working}

            for (id_a, id_b), meas in self._ranges.items():
                if id_a not in working or id_b not in working:
                    continue
                pa = working[id_a]
                pb = working[id_b]
                dx = pa[0] - pb[0]
                dy = pa[1] - pb[1]
                dz = pa[2] - pb[2]
                dist = math.sqrt(dx*dx + dy*dy + dz*dz)
                if dist < 1e-6:
                    continue

                err = dist - meas.range_m
                scale = weight * err / dist
                for k, delta in enumerate((dx, dy, dz)):
                    grad = scale * delta
                    gradients[id_a][k] -= grad
                    gradients[id_b][k] += grad

            for aid in working:
                for k in range(3):
                    working[aid][k] -= self.lr * gradients[aid][k]

        result = {}
        for aid, pos in working.items():
            orig_pose = self._poses[aid]
            self._corrections[aid] = (
                pos[0] - orig_pose.x,
                pos[1] - orig_pose.y,
                pos[2] - orig_pose.z,
            )
            result[aid] = (pos[0], pos[1], pos[2])

        return result

    def get_corrected_pose(
        self, agent_id: int
    ) -> Optional[Tuple[float, float, float]]:
        if agent_id not in self._poses:
            return None
        p = self._poses[agent_id]
        cx, cy, cz = self._corrections.get(agent_id, (0., 0., 0.))
        return (p.x + cx, p.y + cy, p.z + cz)

    def export_swarm_frame_json(self) -> str:
        corrected = self.solve_swarm_frame()
        payload = {}
        for agent_id, (cx, cy, cz) in corrected.items():
            p = self._poses[agent_id]
            payload[str(agent_id)] = {
                'x': round(cx, 4), 'y': round(cy, 4), 'z': round(cz, 4),
                'qx': round(p.qx, 6), 'qy': round(p.qy, 6),
                'qz': round(p.qz, 6), 'qw': round(p.qw, 6),
                'valid': p.valid,
            }
        return json.dumps({'swarm_frame': payload, 'num_drones': self.num_drones})

    def get_range_residuals(self) -> Dict[str, float]:
        residuals = {}
        corrected = {}
        for aid, p in self._poses.items():
            if p.valid:
                cx, cy, cz = self._corrections.get(aid, (0., 0., 0.))
                corrected[aid] = (p.x + cx, p.y + cy, p.z + cz)
        for (id_a, id_b), meas in self._ranges.items():
            if id_a in corrected and id_b in corrected:
                pa, pb = corrected[id_a], corrected[id_b]
                dist = math.sqrt(sum((a-b)**2 for a, b in zip(pa, pb)))
                residuals[f'{id_a}-{id_b}'] = round(dist - meas.range_m, 4)
        return residuals
