#!/usr/bin/env python3
"""
Unit tests for Subsystem A 3D OctoMap Voxel Generator (Phase 2)
Lead Engineer: Rohith Kumar
"""

import unittest
import struct
from sutra_gnc.octomap_generator import OctoMap3DVoxelGrid, OctoMapGeneratorNode, VoxelState


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

    def test_insert_pointcloud_range_filtering(self):
        """Verify min_range (self-body filter) and max_range filtering."""
        origin = (0.0, 0.0, 0.0)
        points = [
            (0.1, 0.0, 0.0),   # < 0.25m self-body -> REJECTED
            (2.0, 0.0, 0.0),   # valid 2.0m -> ACCEPTED
            (10.0, 0.0, 0.0),  # > 8.0m far noise -> REJECTED
        ]
        self.grid.insert_pointcloud(origin, points, min_range=0.25, max_range=8.0)

        near_v = self.grid.pos_to_voxel(0.1, 0.0, 0.0)
        valid_v = self.grid.pos_to_voxel(2.0, 0.0, 0.0)
        far_v = self.grid.pos_to_voxel(10.0, 0.0, 0.0)

        self.assertNotEqual(self.grid.get_voxel_state(*near_v), VoxelState.OCCUPIED)
        self.assertEqual(self.grid.get_voxel_state(*valid_v), VoxelState.OCCUPIED)
        self.assertEqual(self.grid.get_voxel_state(*far_v), VoxelState.UNKNOWN)

    def test_get_occupied_within_radius(self):
        """Verify spatial radius query for ORCA avoidance."""
        self.grid.insert_hit_point((0.0, 0.0, 0.0), (1.0, 0.0, 0.0))
        self.grid.insert_hit_point((0.0, 0.0, 0.0), (10.0, 0.0, 0.0))

        nearby = self.grid.get_occupied_within_radius((0.0, 0.0, 0.0), radius_m=3.0)
        self.assertEqual(len(nearby), 1)
        self.assertAlmostEqual(nearby[0][0], 1.05)

    def test_prune_distant_voxels(self):
        """Verify memory garbage collection of stale voxels beyond max distance."""
        self.grid.insert_hit_point((0.0, 0.0, 0.0), (1.0, 0.0, 0.0))
        self.grid.insert_hit_point((0.0, 0.0, 0.0), (50.0, 0.0, 0.0))

        self.grid.prune_distant_voxels((0.0, 0.0, 0.0), max_distance_m=30.0)
        occupied = self.grid.get_occupied_positions()

        self.assertEqual(len(occupied), 1)
        self.assertLess(occupied[0][0], 30.0)

    def test_pointcloud2_binary_parsing(self):
        """Verify binary decoding of PointCloud2 payload."""
        node = OctoMapGeneratorNode.__new__(OctoMapGeneratorNode)

        # Mock PointCloud2 msg with 2 points: (1.0, 2.0, 3.0) and (4.0, 5.0, 6.0)
        buf = struct.pack('<fff', 1.0, 2.0, 3.0) + struct.pack('<fff', 4.0, 5.0, 6.0)

        class DummyMsg:
            point_step = 12
            row_step = 24
            data = buf

        pts = node._parse_pointcloud2(DummyMsg())
        self.assertEqual(len(pts), 2)
        self.assertAlmostEqual(pts[0][0], 1.0)
        self.assertAlmostEqual(pts[1][2], 6.0)


if __name__ == '__main__':
    unittest.main()
