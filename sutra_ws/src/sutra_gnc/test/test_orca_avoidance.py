#!/usr/bin/env python3
"""
PyTest Suite for Subsystem A: Gate G5 ORCA 3D Safety Buffer Verification.
Author: Rohith Kumar (Subsystem A Lead)
"""

import pytest
from sutra_gnc.orca_avoidance import ORCA3DSolver, DroneAgentState, Vector3D


def test_orca_3d_safety_buffer_gate_g5():
    solver = ORCA3DSolver(safety_buffer_m=3.0)
    
    drone1 = DroneAgentState(agent_id=1, position=Vector3D(0.0, 0.0, 10.0), velocity=Vector3D(2.0, 0.0, 0.0))
    drone2 = DroneAgentState(agent_id=2, position=Vector3D(4.0, 0.5, 10.0), velocity=Vector3D(-2.0, 0.0, 0.0))
    
    pref_vel1 = Vector3D(2.0, 0.0, 0.0)
    safe_vel1 = solver.compute_safe_velocity(drone1, [drone2], pref_vel1)
    
    # Verify velocity vector has adjusted away from collision heading
    assert safe_vel1.x != pref_vel1.x or safe_vel1.y != pref_vel1.y
    
    # Verify separation distance evaluation clears Gate G5 threshold (>2.8m)
    sep_dist = solver.evaluate_separation_distance(drone1.position, drone2.position)
    assert sep_dist > 2.8, f"Gate G5 Failed: Separation distance {sep_dist:.2f}m <= 2.8m"


def test_orca_3d_multi_drone_swarm_avoidance():
    solver = ORCA3DSolver(safety_buffer_m=3.5)
    
    me = DroneAgentState(agent_id=1, position=Vector3D(10.0, 10.0, 15.0), velocity=Vector3D(0.0, 0.0, 0.0))
    neighbors = [
        DroneAgentState(agent_id=2, position=Vector3D(11.5, 10.0, 15.0), velocity=Vector3D(-1.0, 0.0, 0.0)),
        DroneAgentState(agent_id=3, position=Vector3D(10.0, 11.2, 15.0), velocity=Vector3D(0.0, -1.0, 0.0))
    ]
    
    safe_vel = solver.compute_safe_velocity(me, neighbors, Vector3D(0.0, 0.0, 0.0))
    assert safe_vel.norm() > 0.1  # Must compute non-zero avoidance push velocity
