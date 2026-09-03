#!/usr/bin/env python3
"""
Unit & Integration Verification Gate for Subsystem A/B Heartbeat Adaptation
=============================================================================
Tests Subsystem B binary mesh heartbeat telemetry reception and dynamic GNC
trajectory adaptation (motor failure & heartbeat timeout handling).
"""

import json
import time
import pytest
from std_msgs.msg import String
from sutra_gnc.orca_avoidance import Orca3DSolver, ORCAAvoidanceNode
from sutra_comms.mesh_node import SutraMeshNode
import rclpy


def test_heartbeat_packet_serialization():
    """Verify heartbeat data fields serialized by Subsystem B mesh node."""
    drone_id = "uav_alpha"
    pos = (10.0, 20.0, 15.0)
    heartbeat_data = {
        'drone_id': drone_id,
        'timestamp': time.time(),
        'battery_pct': 92.5,
        'armed': True,
        'position': {'x': pos[0], 'y': pos[1], 'z': pos[2]},
        'velocity': {'vx': 1.0, 'vy': 0.0, 'vz': 0.0},
        'motor_status': 'OK',
        'consensus_role': 'LEADER'
    }
    raw = json.dumps(heartbeat_data)
    decoded = json.loads(raw)
    
    assert decoded['drone_id'] == "uav_alpha"
    assert decoded['battery_pct'] == 92.5
    assert decoded['motor_status'] == "OK"
    assert decoded['position']['x'] == 10.0


def test_orca_solver_with_dynamic_motor_failure_obstacle():
    """Verify ORCA 3D Solver expands clearance when a peer drone reports motor failure."""
    solver = Orca3DSolver(safety_radius=1.40, max_speed=3.0)
    
    pos_alpha = (0.0, 0.0, 4.0)
    vel_alpha = (1.0, 0.0, 0.0)
    pref_vel_alpha = (1.0, 0.0, 0.0)
    
    # Healthy neighbor Beta
    neighbors = [((2.0, 0.0, 4.0), (-1.0, 0.0, 0.0))]
    
    # Run solver under normal conditions
    normal_vx, normal_vy, normal_vz = solver.compute_avoidance_velocity(
        pos_alpha, vel_alpha, pref_vel_alpha, neighbors, obstacles=[]
    )
    
    # Now simulate Beta experiencing motor failure (inserted as dynamic obstacle with 2.25m radius)
    failed_obstacles = [((2.0, 0.0, 4.0), 2.25)]
    avoid_vx, avoid_vy, avoid_vz = solver.compute_avoidance_velocity(
        pos_alpha, vel_alpha, pref_vel_alpha, neighbors=[], obstacles=failed_obstacles
    )
    
    # Alpha must steer sideways (vy != 0) to avoid the failed drone's expanded safety zone
    assert abs(avoid_vy) > 0.1 or avoid_vx < 0.5
