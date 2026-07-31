"""
Unit and Integration Test Suite for Subsystem B ↔ D Gateway Bridge
"""

import json
import pytest
import rclpy
from sutra_comms.gcs_gateway_bridge import SutraGcsGatewayBridge


@pytest.fixture(scope="module")
def ros_context():
    if not rclpy.ok():
        rclpy.init()
    yield
    if rclpy.ok():
        rclpy.shutdown()


def test_gateway_bridge_instantiation(ros_context):
    """Verify SutraGcsGatewayBridge initializes state and publishers correctly."""
    bridge = SutraGcsGatewayBridge(port=9091)
    try:
        assert bridge.host == "0.0.0.0"
        assert bridge.port == 9091
        assert "uav_alpha" in bridge.swarm_telemetry
        assert len(bridge.survivor_alerts) >= 2
        assert bridge.raft_consensus_status["leader"] == "uav_alpha"
    finally:
        bridge.destroy_node()


def test_emergency_rtl_dispatch(ros_context):
    """Verify dispatch_emergency_rtl updates internal drone state and broadcasts payload."""
    bridge = SutraGcsGatewayBridge(port=9092)
    try:
        bridge.dispatch_emergency_rtl("uav_alpha")
        assert bridge.swarm_telemetry["uav_alpha"]["status"] == "RTL"
        assert bridge.swarm_telemetry["uav_beta"]["status"] == "MISSION"

        bridge.dispatch_emergency_rtl("ALL")
        for drone, state in bridge.swarm_telemetry.items():
            assert state["status"] == "RTL"
    finally:
        bridge.destroy_node()


def test_perception_target_callback(ros_context):
    """Verify _on_perception_target parses incoming JSON alert and updates memory buffer."""
    bridge = SutraGcsGatewayBridge(port=9093)
    try:
        from std_msgs.msg import String
        msg = String()
        sample_target = {
            "id": 99,
            "type": "SURVIVOR",
            "lat": 37.774900,
            "lon": -122.419400,
            "alt": 15.0,
            "confidence": 0.965,
            "drone": "uav_gamma",
            "time": "11:25:00"
        }
        msg.data = json.dumps(sample_target)
        bridge._on_perception_target(msg)

        assert len(bridge.survivor_alerts) >= 3
        assert bridge.survivor_alerts[0]["id"] == 99
        assert bridge.survivor_alerts[0]["confidence"] == 0.965
    finally:
        bridge.destroy_node()
