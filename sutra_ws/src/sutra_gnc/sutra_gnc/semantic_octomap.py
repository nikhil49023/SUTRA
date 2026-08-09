#!/usr/bin/env python3
"""
SUTRA Subsystem A: Semantic OctoMap — Voxel Semantic Label Channel
References:
  - OCC-VO: 3D Semantic Occupancy VO (arXiv 2309.11011, IEEE 10611516)
  - UAV Indoor 3D Reconstruction + Semantic Segmentation (arXiv 2401.08134)

Extends OctoMap3DVoxelGrid with a per-voxel semantic label dictionary.
Labels are assigned from Subsystem C YOLO/detection outputs and are
persisted across OctoMap updates.

Gazebo SIM:
  - Labels default to UNKNOWN when Subsystem C is offline.
  - With Subsystem C connected, debris/survivor detections label their
    projected ground voxels automatically.
  - Labels are visualized on the GCS HUD as colour-coded voxel overlays.

Inter-subsystem interfaces:
  - Consumes /sutra/perception/detections (Subsystem C JSON stream)
  - Exports /sutra/gnc/semantic_voxels (JSON, Subsystem D HUD)
  - Feeds NDMA rescue category labels to Subsystem F CONOPS corridor plan
"""

import json
import math
from typing import Dict, List, Optional, Tuple

from sutra_gnc.octomap_generator import OctoMap3DVoxelGrid, VoxelState


class SemanticLabel:
    """Semantic category labels aligned with NDMA rescue categories (Subsystem F)."""
    UNKNOWN       = 0  # No semantic information
    SAFE_ZONE     = 1  # Confirmed navigable corridor
    DEBRIS        = 2  # Structural debris / rubble
    WATER         = 3  # Water body / flood zone
    FIRE          = 4  # Active fire / thermal hotspot
    SURVIVOR_AREA = 5  # Survivor or casualty detected nearby
    THREAT        = 6  # Armed threat detected (Subsystem C class)

    _LABEL_NAMES = {
        0: 'UNKNOWN', 1: 'SAFE_ZONE', 2: 'DEBRIS',
        3: 'WATER', 4: 'FIRE', 5: 'SURVIVOR_AREA', 6: 'THREAT',
    }
    # RGBa colours for GCS HUD voxel overlay (r,g,b,a)
    _COLORS = {
        0: (0.5, 0.5, 0.5, 0.3),   # Grey / unknown
        1: (0.1, 0.9, 0.1, 0.6),   # Green / safe
        2: (0.8, 0.5, 0.1, 0.7),   # Orange / debris
        3: (0.1, 0.4, 0.9, 0.7),   # Blue / water
        4: (0.9, 0.2, 0.1, 0.9),   # Red / fire
        5: (0.9, 0.9, 0.1, 0.9),   # Yellow / survivor
        6: (0.7, 0.0, 0.7, 0.9),   # Purple / threat
    }

    @classmethod
    def name(cls, label: int) -> str:
        return cls._LABEL_NAMES.get(label, 'UNKNOWN')

    @classmethod
    def color(cls, label: int) -> Tuple[float, float, float, float]:
        return cls._COLORS.get(label, (0.5, 0.5, 0.5, 0.3))


class SemanticOctoMap(OctoMap3DVoxelGrid):
    """
    OctoMap3DVoxelGrid extended with a per-voxel semantic label dictionary.

    Occupancy updates (insert_hit_point, insert_pointcloud) behave identically
    to the base class. Labels are set independently via set_semantic_label().
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # {(vx, vy, vz) -> SemanticLabel int}
        self._labels: Dict[Tuple[int, int, int], int] = {}
        self._label_update_count: int = 0

    # ── Labelling API ────────────────────────────────────────────────────────

    def set_semantic_label(
        self,
        world_pos: Tuple[float, float, float],
        label: int,
        radius_m: float = 0.0,
    ) -> None:
        """
        Sets the semantic label for the voxel(s) at world position.
        If radius_m > 0, labels all voxels within that radius sphere.
        """
        if radius_m <= 0.0:
            key = self.pos_to_voxel(*world_pos)
            self._labels[key] = label
        else:
            r_vx = max(1, int(math.ceil(radius_m / self.resolution)))
            cx, cy, cz = self.pos_to_voxel(*world_pos)
            r_sq = (radius_m / self.resolution) ** 2
            for dx in range(-r_vx, r_vx + 1):
                for dy in range(-r_vx, r_vx + 1):
                    for dz in range(-r_vx, r_vx + 1):
                        if dx*dx + dy*dy + dz*dz <= r_sq:
                            self._labels[(cx+dx, cy+dy, cz+dz)] = label
        self._label_update_count += 1

    def get_semantic_label(self, world_pos: Tuple[float, float, float]) -> int:
        """Returns the semantic label at a world position."""
        key = self.pos_to_voxel(*world_pos)
        return self._labels.get(key, SemanticLabel.UNKNOWN)

    def get_labeled_voxels(
        self, label: int
    ) -> List[Tuple[float, float, float]]:
        """Returns world-frame positions of all voxels with a given label."""
        return [
            self.voxel_to_pos(*k)
            for k, v in self._labels.items()
            if v == label
        ]

    def update_from_detection_stream(
        self, detections: List[Dict]
    ) -> int:
        """
        Bulk label update from Subsystem C JSON detection stream.
        Each detection: {label, world_x, world_y, world_z, radius_m (opt)}
        Returns number of voxels labelled.
        """
        label_map = {
            'Survivor':     SemanticLabel.SURVIVOR_AREA,
            'survivor':     SemanticLabel.SURVIVOR_AREA,
            'Threat/Fire':  SemanticLabel.THREAT,
            'fire':         SemanticLabel.FIRE,
            'Safe Corridor':SemanticLabel.SAFE_ZONE,
            'safe':         SemanticLabel.SAFE_ZONE,
            'debris':       SemanticLabel.DEBRIS,
            'water':        SemanticLabel.WATER,
        }
        count = 0
        for det in detections:
            sem_label = label_map.get(det.get('label', ''), SemanticLabel.UNKNOWN)
            wx = det.get('world_x', 0.0)
            wy = det.get('world_y', 0.0)
            wz = det.get('world_z', 0.0)
            r = det.get('radius_m', 0.3)
            self.set_semantic_label((wx, wy, wz), sem_label, radius_m=r)
            count += 1
        return count

    # ── Export / Query ───────────────────────────────────────────────────────

    def export_semantic_json(
        self, max_voxels: int = 500
    ) -> dict:
        """
        Exports labeled voxels as a JSON-compatible dict for Subsystem D GCS HUD.
        Schema: {voxels: [{x,y,z,label,label_name,color_rgba}], ...}
        """
        voxels_out = []
        for (vx, vy, vz), lbl in list(self._labels.items())[:max_voxels]:
            if lbl == SemanticLabel.UNKNOWN:
                continue
            wx, wy, wz = self.voxel_to_pos(vx, vy, vz)
            r, g, b, a = SemanticLabel.color(lbl)
            voxels_out.append({
                'x': round(wx, 2), 'y': round(wy, 2), 'z': round(wz, 2),
                'label': lbl,
                'label_name': SemanticLabel.name(lbl),
                'color_rgba': [round(r,3), round(g,3), round(b,3), round(a,3)],
            })
        return {
            'semantic_voxels': voxels_out,
            'total_labeled': len(self._labels),
            'resolution_m': self.resolution,
            'label_update_count': self._label_update_count,
        }

    def label_summary(self) -> Dict[str, int]:
        """Returns count of each semantic label in the current map."""
        counts: Dict[int, int] = {}
        for lbl in self._labels.values():
            counts[lbl] = counts.get(lbl, 0) + 1
        return {SemanticLabel.name(k): v for k, v in sorted(counts.items())}
