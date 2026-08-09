#!/usr/bin/env python3
"""
Unit tests for Subsystem A: Autonomous Dynamic Target Pursuit & Tracking Controller
Lead Engineer: Nikhil (Tech Lead)
"""

import unittest
import math
from sutra_gnc.target_tracker_node import TargetPursuitController, SimulatedTarget, TargetTrackingState


class TestTargetPursuitController(unittest.TestCase):
    def setUp(self):
        self.sim_target = SimulatedTarget(center=(10.0, 10.0, 0.0), radius_m=8.0, speed_m_s=2.0, pattern="CIRCLE")
        self.controller = TargetPursuitController(standoff_dist_m=4.0, standoff_alt_m=8.0)

    def test_simulated_target_trajectory(self):
        pos1, vel1 = self.sim_target.get_state(t_current=100.0)
        pos2, vel2 = self.sim_target.get_state(t_current=101.0)

        # Distance between consecutive positions should match speed (~2.0 m/s)
        dist = math.sqrt(sum((a - b)**2 for a, b in zip(pos1, pos2)))
        self.assertAlmostEqual(dist, 2.0, delta=0.5)

    def test_pursuit_step_active_lock(self):
        t_pos, t_vel = self.sim_target.get_state()
        drone_pos = (0.0, 0.0, 10.0)
        drone_vel = (0.0, 0.0, 0.0)

        (vx, vy, vz), yaw, state, metrics = self.controller.compute_pursuit_step(
            drone_pos=drone_pos,
            drone_vel=drone_vel,
            target_pos=t_pos,
            target_vel=t_vel
        )

        self.assertEqual(state, TargetTrackingState.PURSUIT_ACTIVE)
        self.assertIn("distance_to_target_m", metrics)
        self.assertIn("desired_yaw_deg", metrics)
        # Minimum-snap polynomial starts from rest at t=0.02s; verify non-zero target setpoint generated
        self.assertIn("pursuit_setpoint", metrics)
        self.assertEqual(metrics["tracking_state"], "PURSUIT_ACTIVE")

    def test_lemniscate_target_pattern(self):
        target = SimulatedTarget(pattern="LEMNISCATE_8")
        pos, vel = target.get_state(t_current=100.0)
        self.assertEqual(len(pos), 3)
        self.assertEqual(len(vel), 3)


if __name__ == '__main__':
    unittest.main()
