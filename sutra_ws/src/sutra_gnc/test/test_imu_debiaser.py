#!/usr/bin/env python3
"""
Unit tests for Subsystem A: Online IMU Bias Estimator (Phase 1)
"""

import unittest
from sutra_gnc.imu_debiaser import IMUDebiaser


class TestIMUDebiaser(unittest.TestCase):
    def setUp(self):
        self.debiaser = IMUDebiaser(
            alpha_gyro=0.1,
            alpha_accel=0.1,
            stationary_vel_thresh=0.1,
            stationary_ang_thresh=0.1,
            min_stationary_frames=3
        )

    def test_stationary_detection(self):
        # Motionless
        self.assertTrue(self.debiaser.is_stationary((0.01, 0.0, 0.0), (0.01, 0.0, 0.0)))
        # Moving linear
        self.assertFalse(self.debiaser.is_stationary((0.5, 0.0, 0.0), (0.01, 0.0, 0.0)))
        # Oscillating angular (wind)
        self.assertFalse(self.debiaser.is_stationary((0.01, 0.0, 0.0), (0.5, 0.0, 0.0)))

    def test_bias_convergence(self):
        # Injected biases: gyro = (0.05, -0.02, 0.01), accel = (0.1, -0.1, 9.81 + 0.2)
        raw_g = (0.05, -0.02, 0.01)
        raw_a = (0.1, -0.1, 9.81 + 0.2)
        vel = (0.0, 0.0, 0.0)
        ang = (0.0, 0.0, 0.0)

        for _ in range(60):
            self.debiaser.update(raw_g, raw_a, vel, ang)

        stats = self.debiaser.get_stats()
        self.assertTrue(stats["converged"])
        self.assertAlmostEqual(stats["gyro_bias_rad_s"][0], 0.05, places=2)
        self.assertAlmostEqual(stats["accel_bias_m_s2"][0], 0.1, places=2)

    def test_apply_to_frame_nan_guard(self):
        pos_cov, rot_cov, q = self.debiaser.apply_to_frame(
            pos_cov=0.01, rot_cov=0.005, quality_score=0.9,
            raw_gyro=(float('nan'), 0.0, 0.0)
        )
        self.assertEqual(pos_cov, 0.01)
        self.assertEqual(q, 0.9)


if __name__ == '__main__':
    unittest.main()
