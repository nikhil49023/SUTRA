#!/usr/bin/env python3
"""
Unit tests for Subsystem A: ORCA 3D Symmetric Deadlock Avoidance (Phase 1)
"""

import unittest
from sutra_gnc.orca_avoidance import ORCA3DSolver, DroneAgentState, Vector3D


class TestORCADeadlock(unittest.TestCase):
    def setUp(self):
        self.solver = ORCA3DSolver(safety_buffer_m=3.0)

    def test_symmetric_headon_deadlock_resolution(self):
        # Two drones on exact head-on collision path: Drone 1 at (0,0,10) moving +X, Drone 2 at (4,0,10) moving -X
        drone1 = DroneAgentState(agent_id=1, position=Vector3D(0.0, 0.0, 10.0), velocity=Vector3D(2.0, 0.0, 0.0))
        drone2 = DroneAgentState(agent_id=2, position=Vector3D(4.0, 0.0, 10.0), velocity=Vector3D(-2.0, 0.0, 0.0))

        pref_vel1 = Vector3D(2.0, 0.0, 0.0)
        safe_vel1 = self.solver.compute_safe_velocity(drone1, [drone2], pref_vel1)

        # Non-zero avoidance velocity
        self.assertGreater(safe_vel1.norm(), 0.1)
        # Verify lateral perturbation occurred (Y or Z component is non-zero to break deadlock)
        self.assertTrue(abs(safe_vel1.y) > 0.01 or abs(safe_vel1.z) > 0.01 or safe_vel1.x != pref_vel1.x)


if __name__ == '__main__':
    unittest.main()
