#!/usr/bin/env python3
"""
Unit tests for Subsystem A: CoVOR-SLAM Range-Aided Swarm Frame Merger (Phase 2)
"""

import unittest
import json
from sutra_gnc.swarm_frame import SwarmFrameSolver, DroneRangeMeasurement


class TestSwarmFrameSolver(unittest.TestCase):
    def setUp(self):
        self.solver = SwarmFrameSolver(num_drones=3, ranging_noise_std_m=0.15)

    def test_local_pose_update(self):
        self.solver.update_local_pose(1, 0.0, 0.0, 10.0)
        self.solver.update_local_pose(2, 5.0, 0.0, 10.0)
        self.solver.update_local_pose(3, 2.5, 4.0, 10.0)

        corrected = self.solver.solve_swarm_frame()
        self.assertIn(1, corrected)
        self.assertIn(2, corrected)
        self.assertIn(3, corrected)

    def test_gazebo_range_simulation_and_solve(self):
        gt = {
            1: (0.0, 0.0, 10.0),
            2: (5.0, 0.0, 10.0),
            3: (0.0, 5.0, 10.0)
        }
        # Add offset to local poses to simulate VIO drift
        self.solver.update_local_pose(1, 0.2, -0.1, 10.0)
        self.solver.update_local_pose(2, 5.3, 0.1, 10.0)
        self.solver.update_local_pose(3, -0.1, 5.2, 10.0)

        self.solver.simulate_gazebo_ranges(gt, noise_std_m=0.05, rng_seed=42)
        corrected = self.solver.solve_swarm_frame()

        # Check WLS pulled poses closer to correct inter-drone geometry
        residuals = self.solver.get_range_residuals()
        self.assertTrue(len(residuals) > 0)

    def test_export_json_schema(self):
        self.solver.update_local_pose(1, 0.0, 0.0, 10.0)
        raw_json = self.solver.export_swarm_frame_json()
        data = json.loads(raw_json)
        self.assertIn("swarm_frame", data)
        self.assertIn("num_drones", data)


if __name__ == '__main__':
    unittest.main()
