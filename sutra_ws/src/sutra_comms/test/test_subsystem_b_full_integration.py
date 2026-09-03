#!/usr/bin/env python3
"""
Integration Verification Suite for Subsystem B (Comms & Simulation)
Tests cross-subsystem topic wiring, dynamic odometry, parameter handling, and RTL dispatch.
"""

import json
import time
import pytest
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from nav_msgs.msg import Odometry
from geometry_msgs.msg import Pose, Point, Quaternion

from sutra_comms.gcs_gateway_bridge import SutraGcsGatewayBridge
from sutra_comms.mesh_node import SutraMeshNode
from sutra_comms.perceptron_jscc import SutraPerceptronJsccNode
from sutra_gnc.single_quadcopter_offboard_node import SingleQuadcopterOffboardNode


@pytest.fixture(scope="module", autouse=True)
def rclpy_init_shutdown():
    if not rclpy.ok():
        rclpy.init()
    yield
    if rclpy.ok():
        rclpy.shutdown()


def test_gcs_gateway_bridge_parameters_and_topics():
    """Verify GCS Gateway Bridge defaults to port 9090 and subscribes to /sutra/perception/targets."""
    bridge = SutraGcsGatewayBridge(port=9090)
    assert bridge.port == 9090
    assert bridge.host == "0.0.0.0"

    # Verify topic subscriptions present
    subscriptions = [sub.topic_name for sub in bridge.subscriptions]
    assert "/sutra/perception/targets" in subscriptions
    assert "/sutra/comms/heartbeats" in subscriptions
    
    # Test perception target callback parsing
    target_json = json.dumps({
        "targets": [{
            "id": 101,
            "label": "SURVIVOR",
            "lat": 37.774929,
            "lon": -122.419416,
            "alt": 15.0,
            "confidence": 0.96,
            "drone": "uav_alpha",
            "ts": time.time()
        }]
    })
    msg = String()
    msg.data = target_json
    bridge._on_perception_target(msg)
    
    assert len(bridge.survivor_alerts) > 0
    assert bridge.survivor_alerts[0]["label"] == "SURVIVOR"
    bridge.destroy_node()


def test_gcs_gateway_bridge_georeferenced_coordinates():
    """Verify state cache default coordinates align with georeferenced origin."""
    bridge = SutraGcsGatewayBridge()
    alpha_state = bridge.swarm_telemetry["uav_alpha"]
    assert pytest.approx(alpha_state["lat"], abs=0.01) == bridge.origin_lat
    assert pytest.approx(alpha_state["lon"], abs=0.01) == bridge.origin_lon
    bridge.destroy_node()


def test_mesh_node_dynamic_odometry_update():
    """Verify mesh node dynamically updates peer 3D coordinates from Gazebo odometry."""
    mesh_node = SutraMeshNode()
    assert 'uav_alpha' in mesh_node.peer_positions

    # Simulate odometry update on /model/uav_alpha/odometry
    odom_msg = Odometry()
    odom_msg.pose.pose.position = Point(x=45.0, y=-30.0, z=25.0)
    mesh_node._on_drone_odometry("uav_alpha", odom_msg)

    assert mesh_node.peer_positions["uav_alpha"] == (45.0, -30.0, 25.0)
    
    # Link matrix recalculation uses updated position
    link_matrix = mesh_node.compute_peer_link_matrix()
    assert len(link_matrix) > 0
    mesh_node.destroy_node()


def test_perceptron_jscc_ros2_node_instantiation():
    """Verify perceptron_jscc ROS 2 node creation and camera subscriptions."""
    jscc_node = SutraPerceptronJsccNode()
    subscriptions = [sub.topic_name for sub in jscc_node.subscriptions]
    publishers = [pub.topic_name for pub in jscc_node.publishers]

    assert "/uav_alpha/camera/image_raw" in subscriptions
    assert "/uav_alpha/thermal_camera/image_raw" in subscriptions
    assert "/sutra/comms/jscc_stream" in publishers
    
    jscc_node._timer_tick()
    jscc_node.destroy_node()


def test_emergency_rtl_dispatch_and_gnc_response():
    """Verify Emergency RTL command from GCS bridge triggers EMERGENCY_RTL in GNC node."""
    gnc_node = SingleQuadcopterOffboardNode()
    assert gnc_node.flight_mode in ["MANUAL_TELEOP", "AUTONOMOUS_RING_PURSUIT"]

    # Simulate GCS bridge dispatching Emergency RTL payload to /sutra/cmd/rtl
    rtl_msg = String()
    rtl_msg.data = json.dumps({"command": "RTL", "drone_id": "ALL", "timestamp": time.time()})
    gnc_node._rtl_command_callback(rtl_msg)

    assert gnc_node.flight_mode == "EMERGENCY_RTL"
    gnc_node.destroy_node()
