#!/usr/bin/env python3
"""
Unit tests for Subsystem A: Factor-Graph VIO Adapter with Loop Closure (Phase 1)
"""

import unittest
from sutra_gnc.vio_localization import VIOLocalizationFilter, VIOTrackingStatus
from sutra_gnc.vio_factor_graph import GraphVIOAdapter, PoseNode, PoseFactor


class TestGraphVIOAdapter(unittest.TestCase):
    def setUp(self):
        self.base_filter = VIOLocalizationFilter(max_pos_covariance=0.05, max_rot_covariance=0.02)
        self.adapter = GraphVIOAdapter(
            vio_filter=self.base_filter,
            lc_drift_threshold_m=1.0,
            keyframe_interval_m=0.2,
            max_keyframes=50,
            lc_search_radius_m=1.0
        )

    def test_init_and_stats(self):
        stats = self.adapter.get_graph_stats()
        self.assertEqual(stats["keyframe_count"], 0)
        self.assertEqual(stats["loop_closures_triggered"], 0)

    def test_keyframe_insertion(self):
        # First frame
        is_valid, status, metrics = self.adapter.add_frame(
            position=(0.0, 0.0, 5.0),
            orientation=(0.0, 0.0, 0.0, 1.0),
            pos_cov=0.01,
            rot_cov=0.005
        )
        self.assertTrue(is_valid)
        self.assertIn("drift_m", metrics)
        self.assertEqual(metrics["keyframe_count"], 1)

        # Move slightly (< 0.2m interval) -> no new keyframe
        is_valid, status, metrics = self.adapter.add_frame(
            position=(0.1, 0.0, 5.0),
            orientation=(0.0, 0.0, 0.0, 1.0),
            pos_cov=0.01,
            rot_cov=0.005
        )
        self.assertEqual(metrics["keyframe_count"], 1)

        # Move > 0.2m -> keyframe inserted
        is_valid, status, metrics = self.adapter.add_frame(
            position=(0.5, 0.0, 5.0),
            orientation=(0.0, 0.0, 0.0, 1.0),
            pos_cov=0.01,
            rot_cov=0.005
        )
        self.assertEqual(metrics["keyframe_count"], 2)

    def test_high_covariance_rejection_passed_through(self):
        is_valid, status, metrics = self.adapter.add_frame(
            position=(0.0, 0.0, 5.0),
            orientation=(0.0, 0.0, 0.0, 1.0),
            pos_cov=0.50,  # High covariance > 0.05
            rot_cov=0.005
        )
        self.assertFalse(is_valid)
        self.assertEqual(status, VIOTrackingStatus.TRACKING_DEGRADED)

    def test_loop_closure_trigger(self):
        # Populate keyframes along a square loop: (0,0) -> (5,0) -> (5,5) -> (0,5) -> (0,0)
        waypoints = [
            (0.0, 0.0, 5.0),
            (2.0, 0.0, 5.0),
            (4.0, 0.0, 5.0),
            (4.0, 2.0, 5.0),
            (4.0, 4.0, 5.0),
            (2.0, 4.0, 5.0),
            (0.0, 4.0, 5.0),
            (0.0, 2.0, 5.0),
            (0.0, 0.1, 5.0),  # Loop re-entry near origin
        ]

        # Artificially set low accumulated drift threshold to ensure LC trigger condition
        self.adapter.lc_drift_threshold_m = 0.001

        lc_fired = False
        for wp in waypoints:
            is_valid, status, metrics = self.adapter.add_frame(
                position=wp,
                orientation=(0.0, 0.0, 0.0, 1.0),
                pos_cov=0.01,
                rot_cov=0.005
            )
            if metrics.get("lc_triggered", False):
                lc_fired = True

        stats = self.adapter.get_graph_stats()
        self.assertGreater(stats["keyframe_count"], 5)
        self.assertTrue(lc_fired or stats["loop_closures_triggered"] > 0)

    def test_corrected_pose(self):
        pos = (10.0, 5.0, 3.0)
        self.adapter._drift_correction = (0.5, -0.2, 0.1)
        corrected = self.adapter.get_corrected_pose(pos)
        self.assertAlmostEqual(corrected[0], 9.5)
        self.assertAlmostEqual(corrected[1], 5.2)
        self.assertAlmostEqual(corrected[2], 2.9)


if __name__ == '__main__':
    unittest.main()
