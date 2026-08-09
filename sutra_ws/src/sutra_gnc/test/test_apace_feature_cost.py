#!/usr/bin/env python3
"""
Unit tests for Subsystem A: APACE Perception-Aware Feature Matchability Cost (Phase 2)
"""

import unittest
from sutra_gnc.apace_feature_cost import APACEFeatureCost


class TestAPACEFeatureCost(unittest.TestCase):
    def setUp(self):
        self.apace = APACEFeatureCost(fov_deg=90.0, grid_res_m=1.0)

    def test_default_cost(self):
        cost = self.apace.cost((0.0, 0.0, 5.0), yaw_rad=0.0)
        self.assertGreaterEqual(cost, 0.0)
        self.assertLessEqual(cost, 1.0)

    def test_low_density_marking(self):
        # Update density at (3.0, 0.0) with low tracking quality
        for _ in range(5):
            self.apace.update_density((3.0, 0.0, 5.0), tracking_quality=0.2)

        low_regions = self.apace.get_low_density_regions(threshold=0.5)
        self.assertTrue(len(low_regions) > 0)


if __name__ == '__main__':
    unittest.main()
