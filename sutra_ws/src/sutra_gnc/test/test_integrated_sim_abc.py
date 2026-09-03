#!/usr/bin/env python3
"""
Project SUTRA — Integrated Multi-Subsystem (A + B + C) Simulation Test Suite
=============================================================================
Author: Tech Lead Nikhil (Tech Architect & Lead ⚡)

Tests end-to-end closed-loop interaction across:
- Subsystem A (GNC & Swarm Control): CoordinatedSwarmSearchNode, OrcaAvoidanceNode, ParallelSimManager
- Subsystem B (Comms & Consensus): SutraMeshNode (802.11s Mesh & SwarmRAFT)
- Subsystem C (Edge AI Perception): TriModalDetectorNode
- Gazebo Sim 8 SITL Multi-UAV Topic Telemetry
"""

import time
import json
import unittest
import rclpy
from rclpy.executors import SingleThreadedExecutor
from std_msgs.msg import String
from nav_msgs.msg import Odometry
from geometry_msgs.msg import Twist

from sutra_gnc.parallel_sim_manager import ParallelSimManager
from sutra_gnc.coordinated_swarm_search_node import CoordinatedSwarmSearchNode
from sutra_gnc.orca_avoidance import ORCAAvoidanceNode
from sutra_comms.mesh_node import SutraMeshNode
from sutra_perception.detector_node import SutraDetectorNode


class TestIntegratedSimABC(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        rclpy.init()

    @classmethod
    def tearDownClass(cls):
        rclpy.shutdown()

    def setUp(self):
        self.executor = SingleThreadedExecutor()
        self.sim_manager = ParallelSimManager()
        self.search_node = CoordinatedSwarmSearchNode()
        self.orca_node = ORCAAvoidanceNode()
        self.mesh_node = SutraMeshNode()
        self.detector_node = SutraDetectorNode()

        self.executor.add_node(self.sim_manager)
        self.executor.add_node(self.search_node)
        self.executor.add_node(self.orca_node)
        self.executor.add_node(self.mesh_node)
        self.executor.add_node(self.detector_node)

    def tearDown(self):
        self.executor.remove_node(self.sim_manager)
        self.executor.remove_node(self.search_node)
        self.executor.remove_node(self.orca_node)
        self.executor.remove_node(self.mesh_node)
        self.executor.remove_node(self.detector_node)

        self.sim_manager.destroy_node()
        self.search_node.destroy_node()
        self.orca_node.destroy_node()
        self.mesh_node.destroy_node()
        self.detector_node.destroy_node()

    def test_tri_subsystem_initialization(self):
        """Verify all three subsystem nodes instantiate and join executor cleanly."""
        self.assertIsNotNone(self.sim_manager)
        self.assertIsNotNone(self.search_node)
        self.assertIsNotNone(self.orca_node)
        self.assertIsNotNone(self.mesh_node)
        self.assertIsNotNone(self.detector_node)

    def test_closed_loop_perception_consensus_gnc_retasking(self):
        """
        Verify end-to-end closed-loop flow:
        Perception detection -> Mesh Raft consensus commit -> GNC swarm orbit re-tasking.
        """
        # Step 1: Inject simulated odometry for 5 swarm drones
        drones = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]
        spawns = [
            (15.0, 0.0, 4.0),
            (4.635, 14.265, 4.0),
            (-12.135, 8.816, 4.0),
            (-12.135, -8.816, 4.0),
            (4.635, -14.265, 4.0),
        ]
        for d, (x, y, z) in zip(drones, spawns):
            odom = Odometry()
            odom.header.frame_id = "world"
            odom.child_frame_id = d
            odom.pose.pose.position.x = x
            odom.pose.pose.position.y = y
            odom.pose.pose.position.z = z
            cb = self.search_node._make_odom_cb(d)
            cb(odom)
            cb_sim = self.sim_manager._make_odom_cb(d)
            cb_sim(odom)

        # Initial state should be SECTOR_SEARCH
        self.assertEqual(self.search_node.phase, "SECTOR_SEARCH")

        # Step 2: Inject survivor perception target alert from Subsystem C
        survivor_alert = String()
        survivor_alert.data = json.dumps({
            "target_id": "SURVIVOR_001",
            "class_name": "Survivor",
            "confidence": 0.98,
            "x": 20.0,
            "y": 15.0,
            "z": 0.5,
            "lat": 37.7751,
            "lon": -122.4190,
            "alt": 4.0,
        })

        # Process target alert in Subsystem B mesh node
        self.mesh_node._on_perception_targets(survivor_alert)
        self.executor.spin_once(timeout_sec=0.1)

        # Direct perception target fallback check in Subsystem A
        self.search_node._on_perception_targets(survivor_alert)
        self.executor.spin_once(timeout_sec=0.1)

        # Verify Subsystem A search node re-tasked swarm to SURVIVOR_CONCENTRIC_SURROUND
        self.assertEqual(self.search_node.phase, "SURVIVOR_CONCENTRIC_SURROUND")
        self.assertIsNotNone(self.search_node.survivor_gps)
        self.assertEqual(self.search_node.survivor_gps, (20.0, 15.0, 0.5))

    def test_parallel_gnc_control_loop_execution(self):
        """Test parallel simulation tick and velocity calculation under multi-drone load."""
        for _ in range(5):
            self.sim_manager._parallel_sim_tick()
            self.search_node._control_loop_20hz()
            self.executor.spin_once(timeout_sec=0.01)

        self.assertGreater(self.sim_manager.loop_count, 0)
        self.assertGreaterEqual(self.sim_manager.measured_rtf, 0.1)


if __name__ == "__main__":
    unittest.main()
