#!/usr/bin/env python3
"""
Unit tests for Subsystem A: Risk-Aware Emergency Landing FSM (Phase 3)
"""

import unittest
from sutra_gnc.emergency_landing import LandingRiskMap, EmergencyLandingFSM, RiskLevel, ELFSMState


class TestEmergencyLanding(unittest.TestCase):
    def setUp(self):
        self.risk_map = LandingRiskMap(grid_res_m=0.5, extent_m=20.0)
        self.fsm = EmergencyLandingFSM(self.risk_map, nav_speed_m_s=1.5, max_descent_m_s=0.5)

    def test_risk_map_updates(self):
        self.risk_map.update_from_detection(2.0, 2.0, 'fire')
        self.assertEqual(self.risk_map.risk_at(2.0, 2.0), RiskLevel.FIRE)

        self.risk_map.update_from_detection(5.0, 5.0, 'safe_ground')
        self.assertEqual(self.risk_map.risk_at(5.0, 5.0), RiskLevel.SAFE)

    def test_best_landing_zone_selection(self):
        self.risk_map.update_from_detection(0.0, 0.0, 'debris')
        self.risk_map.update_from_detection(3.0, 0.0, 'safe_ground', radius_m=0.3)

        best_xyz = self.risk_map.best_landing_zone((0.0, 0.0, 10.0), search_radius_m=5.0)
        self.assertAlmostEqual(best_xyz[0], 3.0, delta=1.0)
        self.assertAlmostEqual(best_xyz[1], 0.0, delta=0.5)

    def test_fsm_state_transitions(self):
        self.assertEqual(self.fsm.state, ELFSMState.ASSESS)

        # Step 1: ASSESS -> NAVIGATE_TO_ZONE
        vel1, state1 = self.fsm.step((0.0, 0.0, 10.0))
        self.assertEqual(state1, ELFSMState.NAVIGATE_TO_ZONE.value)

        # Step 2: NAVIGATE_TO_ZONE -> arrive at target -> DESCEND
        target_x, target_y, _ = self.fsm._target
        vel2, state2 = self.fsm.step((target_x, target_y, 10.0))
        self.assertEqual(state2, ELFSMState.DESCEND.value)

        # Step 3: DESCEND -> GROUNDED
        vel3, state3 = self.fsm.step((target_x, target_y, 0.2))
        self.assertEqual(state3, ELFSMState.GROUNDED.value)
        self.assertTrue(self.fsm.is_complete)


if __name__ == '__main__':
    unittest.main()
