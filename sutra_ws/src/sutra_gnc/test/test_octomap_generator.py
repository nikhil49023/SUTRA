#!/usr/bin/env python3
"""
Unit tests for Subsystem A 3D OctoMap Voxel Generator (Phase 2)
Lead Engineer: Rohith Kumar
"""

import unittest
from sutra_gnc.octomap_generator import OctoMap3DVoxelGrid, VoxelState


class TestOctoMap3DVoxelGrid(unittest.TestCase):
    def setUp(self):
        self.grid = OctoMap3DVoxelGrid(resolution_m=0.10)

    def test_pos_to_voxel_conversion(self):
        vx, vy, vz = self.grid.pos_to_voxel(0.15, 0.25, 0.35)
        self.assertEqual((vx, vy, vz), (1, 2, 3))

    def test_voxel_to_pos_conversion(self):
        x, y, z = self.grid.voxel_to_pos(1, 2, 3)
        self.assertAlmostEqual(x, 0.15)
        self.assertAlmostEqual(y, 0.25)
        self.assertAlmostEqual(z, 0.35)

    def test_insert_hit_point_and_raycast_clearing(self):
        origin = (0.0, 0.0, 0.0)
        hit = (0.5, 0.0, 0.0)

        # Before insertion, voxel is UNKNOWN
        hit_v = self.grid.pos_to_voxel(*hit)
        self.assertEqual(self.grid.get_voxel_state(*hit_v), VoxelState.UNKNOWN)

        # Insert hit point
        self.grid.insert_hit_point(origin, hit)

        # Hit voxel must now be OCCUPIED
        self.assertEqual(self.grid.get_voxel_state(*hit_v), VoxelState.OCCUPIED)

        # Traversed voxel along ray (e.g. 0.2m) must be FREE (cleared by raycasting)
        free_v = self.grid.pos_to_voxel(0.2, 0.0, 0.0)
        self.assertEqual(self.grid.get_voxel_state(*free_v), VoxelState.FREE)


if __name__ == '__main__':
    unittest.main()
