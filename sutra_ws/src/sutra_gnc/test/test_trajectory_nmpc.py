#!/usr/bin/env python3
"""
Unit tests for Subsystem A: Online NMPC Polynomial Trajectory Planner (Phase 2)
"""

import math
import unittest
import numpy as np
from sutra_gnc.trajectory_nmpc import NMPCTrajectoryPlanner, MinimumSnapSegment


class TestNMPCTrajectoryPlanner(unittest.TestCase):
    def setUp(self):
        self.planner = NMPCTrajectoryPlanner(N=10, dt=0.02, v_max=3.0, a_max=2.5)

    def test_minimum_snap_segment(self):
        p0 = np.array([0.0, 0.0, 10.0])
        p1 = np.array([10.0, 0.0, 10.0])
        v0 = np.array([0.0, 0.0, 0.0])
        v1 = np.array([2.0, 0.0, 0.0])
        segment = MinimumSnapSegment(p0, p1, v0, v1, T=2.0)

        pos_start, vel_start, _ = segment.evaluate(0.0)
        pos_end, vel_end, _ = segment.evaluate(2.0)

        np.testing.assert_allclose(pos_start, p0, atol=1e-3)
        np.testing.assert_allclose(pos_end, p1, atol=1e-3)

    def test_nmpc_plan_generation(self):
        setpoints = self.planner.plan(
            current_pos=(0.0, 0.0, 10.0),
            current_vel=(0.0, 0.0, 0.0),
            target_wp=(10.0, 0.0, 10.0)
        )
        self.assertEqual(len(setpoints), 10)
        for vx, vy, vz in setpoints:
            speed = math.sqrt(vx**2 + vy**2 + vz**2)
            self.assertLessEqual(speed, 3.001)

    def test_disturbance_rejection_update(self):
        exp_v = (1.0, 0.0, 0.0)
        act_v = (0.8, 0.0, 0.0)  # Wind blowing against motion
        self.planner.update_disturbance_estimate(exp_v, act_v, dt=0.02)
        self.assertLess(self.planner.disturb_accel[0], 0.0)


if __name__ == '__main__':
    unittest.main()
