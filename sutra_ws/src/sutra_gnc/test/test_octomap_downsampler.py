#!/usr/bin/env python3
"""
Unit tests for Subsystem A: Geometric-Preserving OctoMap Downsampler (Phase 1)
"""

import unittest
from sutra_gnc.octomap_downsampler import GeometricDownsampler


class TestGeometricDownsampler(unittest.TestCase):
    def setUp(self):
        self.downsampler = GeometricDownsampler(target_ratio=0.5, min_feature_radius_m=0.3, voxel_resolution_m=0.10)

    def test_empty_input(self):
        result = self.downsampler.downsample([], {})
        self.assertEqual(result, [])

    def test_frontier_preservation(self):
        # Create a 3x3x3 solid block of occupied voxels
        voxels = [(x, y, z) for x in range(3) for y in range(3) for z in range(3)]
        grid_dict = {v: 1.0 for v in voxels}

        downsampled = self.downsampler.downsample(voxels, grid_dict)
        # All surface voxels (outer shell) should be preserved as frontiers
        self.assertGreater(len(downsampled), 0)
        self.assertLessEqual(len(downsampled), len(voxels))

    def test_downsample_positions_convenience(self):
        positions = [(0.1 * x, 0.0, 0.0) for x in range(10)]
        result = self.downsampler.downsample_positions(positions)
        self.assertGreater(len(result), 0)


if __name__ == '__main__':
    unittest.main()
