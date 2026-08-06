#!/usr/bin/env python3
"""
Unit tests for Subsystem A VIO Localization & Covariance Filtering (Phase 1)
Lead Engineer: Rohith Kumar
"""

import unittest
from sutra_gnc.vio_localization import VIOLocalizationFilter, VIOTrackingStatus


class TestVIOLocalizationFilter(unittest.TestCase):
    def setUp(self):
        self.filter = VIOLocalizationFilter(max_pos_covariance=0.05, max_rot_covariance=0.02)

    def test_valid_frame_pass(self):
        pos = (1.0, 2.0, 3.0)
        orient = (0.0, 0.0, 0.0, 1.0)
        is_valid, status, metrics = self.filter.process_frame(pos, orient, pos_cov=0.01, rot_cov=0.005, quality_score=0.9)
        self.assertTrue(is_valid)
        self.assertEqual(status, VIOTrackingStatus.TRACKING_OK)
        self.assertIn("valid_ratio", metrics)

    def test_high_covariance_rejection(self):
        pos = (1.0, 2.0, 3.0)
        orient = (0.0, 0.0, 0.0, 1.0)
        is_valid, status, metrics = self.filter.process_frame(pos, orient, pos_cov=0.10, rot_cov=0.005, quality_score=0.9)
        self.assertFalse(is_valid)
        self.assertEqual(status, VIOTrackingStatus.TRACKING_DEGRADED)

    def test_nan_position_rejection(self):
        pos = (float('nan'), 2.0, 3.0)
        orient = (0.0, 0.0, 0.0, 1.0)
        is_valid, status, metrics = self.filter.process_frame(pos, orient, pos_cov=0.01, rot_cov=0.005, quality_score=0.9)
        self.assertFalse(is_valid)
        self.assertEqual(status, VIOTrackingStatus.TRACKING_LOST)

    def test_low_quality_rejection(self):
        pos = (1.0, 2.0, 3.0)
        orient = (0.0, 0.0, 0.0, 1.0)
        is_valid, status, metrics = self.filter.process_frame(pos, orient, pos_cov=0.01, rot_cov=0.005, quality_score=0.2)
        self.assertFalse(is_valid)
        self.assertEqual(status, VIOTrackingStatus.TRACKING_DEGRADED)

    def test_tracking_status_string_mapping(self):
        """Verify VIOTrackingStatus.to_string maps enum codes to human-readable strings."""
        self.assertEqual(VIOTrackingStatus.to_string(VIOTrackingStatus.UNINITIALIZED), "UNINITIALIZED")
        self.assertEqual(VIOTrackingStatus.to_string(VIOTrackingStatus.TRACKING_OK), "TRACKING_OK")
        self.assertEqual(VIOTrackingStatus.to_string(VIOTrackingStatus.TRACKING_DEGRADED), "TRACKING_DEGRADED")
        self.assertEqual(VIOTrackingStatus.to_string(VIOTrackingStatus.TRACKING_LOST), "TRACKING_LOST")

    def test_tracking_status_state_transitions(self):
        """Verify state transitions: OK -> DEGRADED -> LOST -> OK."""
        pos = (1.0, 2.0, 3.0)
        orient = (0.0, 0.0, 0.0, 1.0)

        # 1. OK
        v1, s1, _ = self.filter.process_frame(pos, orient, pos_cov=0.01, rot_cov=0.005)
        self.assertEqual(s1, VIOTrackingStatus.TRACKING_OK)

        # 2. DEGRADED (high cov)
        v2, s2, _ = self.filter.process_frame(pos, orient, pos_cov=0.10, rot_cov=0.005)
        self.assertEqual(s2, VIOTrackingStatus.TRACKING_DEGRADED)

        # 3. LOST (NaN)
        v3, s3, _ = self.filter.process_frame((float('nan'), 0.0, 0.0), orient, pos_cov=0.01, rot_cov=0.005)
        self.assertEqual(s3, VIOTrackingStatus.TRACKING_LOST)

        # 4. Recovery -> OK
        v4, s4, _ = self.filter.process_frame(pos, orient, pos_cov=0.01, rot_cov=0.005)
        self.assertEqual(s4, VIOTrackingStatus.TRACKING_OK)


if __name__ == '__main__':
    unittest.main()
