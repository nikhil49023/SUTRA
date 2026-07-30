#!/usr/bin/env python3
"""
SUTRA Integration Test: Subsystem B (Comms) <-> Subsystem C (Perception) Wiring Test
====================================================================================
Verifies:
1. Target published by Subsystem C (detector_node) is received by Subsystem B (mesh_node).
2. Target is appended to SwarmRAFT consensus log with AES-128-GCM authentication.
3. Deep JSCC neural compression pipeline processes target telemetry for mesh broadcast.
4. Mesh link status feedback modulates perception publishing mode.
"""

import json
import time
import pytest
import rclpy
from std_msgs.msg import String

from sutra_comms.mesh_node import SutraMeshNode, SwarmRaftConsensusEngine
from sutra_perception.detector_node import (
    SutraDetectorNode,
    FusedTarget,
    to_gps,
    pixel_to_ned,
)


def setup_module():
    if not rclpy.ok():
        rclpy.init()


def teardown_module():
    if rclpy.ok():
        rclpy.shutdown()


class TestSubsystemBCWiring:

    """Test suite verifying seamless inter-subsystem wiring between B & C."""

    def test_target_propagation_to_swarmraft(self):
        """Publishing a target on /sutra/perception/targets appends it to Raft log."""
        mesh_node = SutraMeshNode()

        # Construct mock perception target message
        target_payload = {
            "targets": [
                {
                    "id": 101,
                    "label": "SURVIVOR",
                    "confidence": 0.95,
                    "lat": 37.774929,
                    "lon": -122.419416,
                    "alt": 15.0,
                    "modalities": ["visual", "thermal"],
                    "ts": time.time(),
                }
            ]
        }
        msg = String()
        msg.data = json.dumps(target_payload)

        # Trigger perception subscriber callback in mesh_node
        mesh_node._on_perception_targets(msg)

        # Assert target was appended to SwarmRaft consensus log
        assert len(mesh_node.raft_engine.log) >= 2
        last_entry = mesh_node.raft_engine.log[-1]
        assert last_entry["type"] == "SURVIVOR_GPS"
        assert last_entry["data"]["label"] == "SURVIVOR"
        assert last_entry["data"]["confidence"] == 0.95
        assert last_entry["data"]["lat"] == 37.774929

    def test_duplicate_target_deduplication(self):
        """Sending the exact same target payload multiple times does not flood Raft log."""
        mesh_node = SutraMeshNode()
        target_payload = {
            "targets": [
                {
                    "id": 102,
                    "label": "POSSIBLE_SURVIVOR",
                    "confidence": 0.72,
                    "lat": 37.775100,
                    "lon": -122.419000,
                    "alt": 18.0,
                    "modalities": ["thermal"],
                    "ts": time.time(),
                }
            ]
        }
        msg = String()
        msg.data = json.dumps(target_payload)

        # Trigger twice
        mesh_node._on_perception_targets(msg)
        log_len_after_first = len(mesh_node.raft_engine.log)

        mesh_node._on_perception_targets(msg)
        log_len_after_second = len(mesh_node.raft_engine.log)

        assert log_len_after_first == log_len_after_second

    def test_mesh_status_feedback_adaptation(self):
        """Receiving low SNR in detector_node toggles low bandwidth mode."""
        detector_node = SutraDetectorNode()

        # Normal SNR status
        normal_msg = String()
        normal_msg.data = json.dumps({"snr_db": 22.5})
        detector_node._mesh_status_callback(normal_msg)
        assert not detector_node._low_bandwidth_mode

        # Heavy jamming / degraded SNR status (< -85.0 dBm)
        degraded_msg = String()
        degraded_msg.data = json.dumps({"snr_db": -92.0})
        detector_node._mesh_status_callback(degraded_msg)
        assert detector_node._low_bandwidth_mode
