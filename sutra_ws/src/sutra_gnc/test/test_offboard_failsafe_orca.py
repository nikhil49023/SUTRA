"""
PyTest Suite for Subsystem A: Offboard Controller, Emergency RTL Failsafe & Integrated ORCA 3D.
Author: Rohith Kumar (Subsystem A Lead)
"""

import time
import pytest
from sutra_gnc.offboard_node import SutraOffboardControlNode, OffboardFlightMode, DroneState
from sutra_gnc.orca_avoidance import DroneAgentState, Vector3D


def test_emergency_rtl_failsafe_transition_latency():
    """
    Verify Failsafe transition to EMERGENCY_RTL happens in < 100ms upon link timeout (> 0.5s).
    """
    node = SutraOffboardControlNode(agent_id=1)
    
    # 1. Normal state
    t_start = time.time()
    node.state.last_heartbeat = t_start
    assert node.flight_mode == OffboardFlightMode.MISSION_PATROL
    
    # 2. Simulate 0.6s link silence (> 0.5s timeout)
    t_dropout = t_start + 0.6
    transition_occurred = node.check_failsafe_triggers(current_time=t_dropout, link_timeout_s=0.5)
    
    assert transition_occurred is True
    assert node.flight_mode == OffboardFlightMode.EMERGENCY_RTL
    
    # Transition time delta evaluation
    transition_latency_ms = (node.last_mode_change_time - t_dropout) * 1000.0
    assert abs(transition_latency_ms) < 100.0, f"Failsafe transition latency {transition_latency_ms:.2f}ms >= 100ms"


def test_emergency_rtl_tilt_overshoot_failsafe():
    """
    Verify Failsafe transition triggers on excessive roll/pitch (> 25 deg).
    """
    node = SutraOffboardControlNode(agent_id=1)
    node.state.roll = 0.5  # ~28.6 degrees > 25 degrees
    
    now = time.time()
    transition_occurred = node.check_failsafe_triggers(current_time=now, max_tilt_deg=25.0)
    assert transition_occurred is True
    assert node.flight_mode == OffboardFlightMode.EMERGENCY_RTL


def test_integrated_orca_3d_avoidance_in_offboard_control_loop():
    """
    Verify offboard control loop automatically detects peer swarm drone
    and adjusts velocity vector to enforce ORCA 3D avoidance mode.
    """
    node = SutraOffboardControlNode(agent_id=1, safety_buffer_m=3.0)
    node.state.update_pose(x=0.0, y=0.0, z=15.0)
    
    # Peer drone approaching head-on on East search leg
    peer_drone = DroneAgentState(
        agent_id=2,
        position=Vector3D(2.0, 0.0, 15.0),  # 2.0m away (< 3.0m safety buffer)
        velocity=Vector3D(-2.0, 0.0, 0.0)
    )
    node.peer_drones = [peer_drone]
    
    # Compute control step
    (vx, vy, vz), mode = node.compute_control_step(dt=0.1)
    
    # Mode must automatically shift to ORCA_AVOIDANCE
    assert mode == OffboardFlightMode.ORCA_AVOIDANCE
    assert (vx**2 + vy**2 + vz**2) > 0.0


def test_offboard_50hz_control_step_execution():
    """
    Verify 50Hz setpoint calculation runs stably and outputs valid velocities.
    """
    node = SutraOffboardControlNode(agent_id=1)
    node.state.update_pose(x=5.0, y=5.0, z=20.0)
    
    for _ in range(50):  # Simulate 1 second at 50Hz (dt=0.02)
        (vx, vy, vz), mode = node.compute_control_step(dt=0.02)
        assert isinstance(vx, float)
        assert isinstance(vy, float)
        assert isinstance(vz, float)
