"""
Smart Horizon GCS — Collision Avoidance & Proximity Auditing Unit Tests
Subsystem: Test Suite (Phase 6)
"""

import pytest
from fleet.collision_avoidance import CollisionAvoidanceEngine
from state.fleet_state import DroneState


def test_pairwise_collision_detection():
    """Verify warning and critical proximity detection between swarm drones."""
    engine = CollisionAvoidanceEngine(warning_distance_m=10.0, critical_distance_m=4.0)

    # D1 and D2 are very close (2 meters apart)
    d1 = DroneState(drone_id="d1", callsign="ALPHA", latitude=37.774900, longitude=-122.419400, altitude=25.0)
    d2 = DroneState(drone_id="d2", callsign="BRAVO", latitude=37.774918, longitude=-122.419400, altitude=25.0) # ~2m

    # D3 is 30 meters away
    d3 = DroneState(drone_id="d3", callsign="CHARLIE", latitude=37.775200, longitude=-122.419400, altitude=25.0) # ~33m

    events = engine.check_fleet_collisions([d1, d2, d3])
    assert len(events) >= 1
    assert any(e["severity"] == "CRITICAL" for e in events)


def test_orca_3d_velocity_deflection():
    """Verify reciprocal ORCA 3D velocity deflection for head-on trajectories."""
    engine = CollisionAvoidanceEngine(safety_radius=3.6, time_horizon=2.0, max_speed=8.0)

    pos_1 = (-5.0, 0.0, 0.0)
    vel_1 = (4.0, 0.0, 0.0)
    pos_2 = (5.0, 0.0, 0.0)
    vel_2 = (-4.0, 0.0, 0.0)

    v_safe_1 = engine.compute_avoidance_velocity(pos_1, vel_1, [(pos_2, vel_2)])
    v_safe_2 = engine.compute_avoidance_velocity(pos_2, vel_2, [(pos_1, vel_1)])

    assert abs(v_safe_1[1]) > 0.1
    assert abs(v_safe_2[1]) > 0.1
