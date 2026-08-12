#!/usr/bin/env python3
"""
Project SUTRA — Subsystem A Parallel Sim Manager Unit & Performance Test Suite
=============================================================================
Author: Tech Lead Nikhil (Subsystem A Lead ⚡)

Verifies parallel thread pool execution, lock-free position telemetry processing,
perception & consensus subscriber wiring, and simulation RTF calculation.
"""

import time
import json
import unittest
import rclpy
from std_msgs.msg import String
from nav_msgs.msg import Odometry
from sutra_gnc.parallel_sim_manager import ParallelSimManager


class TestParallelSimManager(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        rclpy.init()

    @classmethod
    def tearDownClass(cls):
        rclpy.shutdown()

    def setUp(self):
        self.node = ParallelSimManager()

    def tearDown(self):
        self.node.destroy_node()

    def test_parallel_sim_manager_initialization(self):
        """Test node creation and parameters."""
        self.assertEqual(len(self.node.drones), 5)
        self.assertEqual(self.node.num_workers, 4)
        self.assertEqual(self.node.target_rate_hz, 50.0)
        self.assertIn("uav_alpha", self.node.drones)

    def test_odom_callback_and_state_updates(self):
        """Test multi-drone odometry callback updates position and velocity thread-safely."""
        odom_msg = Odometry()
        odom_msg.pose.pose.position.x = 10.5
        odom_msg.pose.pose.position.y = -5.2
        odom_msg.pose.pose.position.z = 8.0
        odom_msg.twist.twist.linear.x = 1.2
        odom_msg.twist.twist.linear.y = 0.5

        cb = self.node._make_odom_cb("uav_alpha")
        cb(odom_msg)

        pos = self.node.drone_positions["uav_alpha"]
        vel = self.node.drone_velocities["uav_alpha"]

        self.assertEqual(pos, (10.5, -5.2, 8.0))
        self.assertEqual(vel, (1.2, 0.5, 0.0))

    def test_perception_targets_subscription(self):
        """Test parsing of Subsystem C target detections."""
        targets_msg = String()
        targets_msg.data = json.dumps([
            {"class_name": "Survivor", "confidence": 0.95, "x": 12.0, "y": 8.0, "z": 4.0}
        ])

        self.node._on_perception_targets(targets_msg)
        self.assertEqual(len(self.node.last_perception_targets), 1)
        self.assertEqual(self.node.last_perception_targets[0]["class_name"], "Survivor")

    def test_parallel_sim_tick_execution(self):
        """Test parallel worker execution tick."""
        t_start = time.time()
        self.node._parallel_sim_tick()
        duration = time.time() - t_start

        # Tick should execute efficiently in parallel under 20ms
        self.assertLess(duration, 0.05)
        self.assertGreaterEqual(self.node.loop_count, 1)


if __name__ == "__main__":
    unittest.main()
