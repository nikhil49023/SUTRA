#!/usr/bin/env python3
"""
Unit tests for Subsystem A: CILC Cryptographic Inter-agent Loop Closure Verifier (Phase 3)
"""

import unittest
import time
from sutra_gnc.cilc_security import CILCVerifier


class TestCILCSecurity(unittest.TestCase):
    def setUp(self):
        self.verifier = CILCVerifier(shared_key=b'TEST_FLEET_KEY_SECRET_12345678')

    def test_sign_and_verify(self):
        lc_data = {
            'agent_id': 1,
            'from_node': 10,
            'to_node': 45,
            'dx': 0.5, 'dy': -0.2, 'dz': 0.1,
            'timestamp': time.time()
        }
        sig = self.verifier.sign_loop_closure(lc_data)
        self.assertTrue(self.verifier.verify_loop_closure(lc_data, sig))
        self.assertTrue(self.verifier.is_trusted_agent(1))

    def test_tampered_data_rejected(self):
        lc_data = {
            'agent_id': 2,
            'from_node': 5,
            'to_node': 20,
            'dx': 1.0, 'dy': 0.0, 'dz': 0.0,
            'timestamp': time.time()
        }
        sig = self.verifier.sign_loop_closure(lc_data)
        lc_data['dx'] = 999.0  # Tampered
        self.assertFalse(self.verifier.verify_loop_closure(lc_data, sig))

    def test_expired_timestamp_rejected(self):
        lc_data = {
            'agent_id': 3,
            'from_node': 1,
            'to_node': 2,
            'dx': 0.0, 'dy': 0.0, 'dz': 0.0,
            'timestamp': time.time() - 100.0  # Expired
        }
        sig = self.verifier.sign_loop_closure(lc_data)
        self.assertFalse(self.verifier.verify_loop_closure(lc_data, sig))


if __name__ == '__main__':
    unittest.main()
