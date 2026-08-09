#!/usr/bin/env python3
"""
SUTRA Subsystem A: Geometric-Preserving OctoMap Downsampler
Reference: Downsampling + Path Planning (arXiv 2406.13910)
"""

import math
from typing import List, Tuple, Dict, Set


class GeometricDownsampler:
    def __init__(
        self,
        target_ratio: float = 0.5,
        min_feature_radius_m: float = 0.3,
        voxel_resolution_m: float = 0.10,
    ):
        self.target_ratio = target_ratio
        self.min_feature_radius_m = min_feature_radius_m
        self.voxel_res = voxel_resolution_m
        self._radius_vx = max(1, int(math.ceil(min_feature_radius_m / voxel_resolution_m)))

    _FACE_NEIGHBOURS = [
        (1, 0, 0), (-1, 0, 0),
        (0, 1, 0), (0, -1, 0),
        (0, 0, 1), (0, 0, -1),
    ]

    def downsample(
        self,
        occupied_voxels: List[Tuple[int, int, int]],
        grid_dict: Dict[Tuple[int, int, int], float],
    ) -> List[Tuple[int, int, int]]:
        if not occupied_voxels:
            return []

        occ_set: Set[Tuple[int, int, int]] = set(occupied_voxels)
        frontier_set = self._find_frontiers(occ_set)
        narrow_passage_set = self._find_narrow_passage_voxels(occ_set, frontier_set)
        essential_set = frontier_set | narrow_passage_set

        interior = [v for v in occupied_voxels if v not in essential_set]
        target_total = max(len(essential_set), int(len(occupied_voxels) * self.target_ratio))
        interior_budget = max(0, target_total - len(essential_set))

        step = max(1, len(interior) // max(1, interior_budget))
        kept_interior = interior[::step][:interior_budget]

        return list(essential_set) + kept_interior

    def downsample_positions(
        self,
        occupied_positions: List[Tuple[float, float, float]],
    ) -> List[Tuple[float, float, float]]:
        if not occupied_positions:
            return []
        voxels = [self._pos_to_voxel(*p) for p in occupied_positions]
        grid_dict = {v: 1.0 for v in voxels}
        kept_voxels = self.downsample(voxels, grid_dict)
        return [self._voxel_to_pos(*v) for v in kept_voxels]

    def _find_frontiers(
        self, occ_set: Set[Tuple[int, int, int]]
    ) -> Set[Tuple[int, int, int]]:
        frontiers: Set[Tuple[int, int, int]] = set()
        for vx, vy, vz in occ_set:
            for dx, dy, dz in self._FACE_NEIGHBOURS:
                if (vx + dx, vy + dy, vz + dz) not in occ_set:
                    frontiers.add((vx, vy, vz))
                    break
        return frontiers

    def _find_narrow_passage_voxels(
        self,
        occ_set: Set[Tuple[int, int, int]],
        frontier_set: Set[Tuple[int, int, int]],
    ) -> Set[Tuple[int, int, int]]:
        r = self._radius_vx
        passage_anchors: Set[Tuple[int, int, int]] = set()
        frontier_list = list(frontier_set)

        for i, (ax, ay, az) in enumerate(frontier_list):
            for bx, by, bz in frontier_list[i + 1:]:
                dist = math.sqrt((ax-bx)**2 + (ay-by)**2 + (az-bz)**2)
                if dist <= 2 * r:
                    mid = ((ax+bx)//2, (ay+by)//2, (az+bz)//2)
                    if mid not in occ_set:
                        passage_anchors.add((ax, ay, az))
                        passage_anchors.add((bx, by, bz))

        essential: Set[Tuple[int, int, int]] = set()
        for ax, ay, az in passage_anchors:
            for dx in range(-r, r + 1):
                for dy in range(-r, r + 1):
                    for dz in range(-r, r + 1):
                        v = (ax + dx, ay + dy, az + dz)
                        if v in occ_set:
                            essential.add(v)
        return essential

    def _pos_to_voxel(self, x: float, y: float, z: float) -> Tuple[int, int, int]:
        r = self.voxel_res
        return (int(math.floor(x / r)), int(math.floor(y / r)), int(math.floor(z / r)))

    def _voxel_to_pos(self, vx: int, vy: int, vz: int) -> Tuple[float, float, float]:
        r = self.voxel_res
        return ((vx + 0.5) * r, (vy + 0.5) * r, (vz + 0.5) * r)
