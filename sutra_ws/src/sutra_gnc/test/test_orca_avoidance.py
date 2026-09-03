#!/usr/bin/env python3
"""
Test Suite: ORCA 3D Collision Avoidance (Subsystem A - Gate G5)
===============================================================
Verifies 3D Optimal Reciprocal Collision Avoidance (ORCA) algorithms
for a 5-drone swarm ring crossing scenario and head-on avoidance.

Safety Gate G5: Inter-drone safety clearance >= 2.80m (2 * safety_radius=1.40m).
"""

import math
import pytest
import rclpy
from sutra_gnc.orca_avoidance import Orca3DSolver, ORCAAvoidanceNode


@pytest.fixture(scope="module", autouse=True)
def init_rclpy():
    if not rclpy.ok():
        rclpy.init()
    yield
    if rclpy.ok():
        rclpy.shutdown()


def test_orca_3d_solver_parameters():
    solver = Orca3DSolver(safety_radius=1.40, time_horizon=5.0, max_speed=3.0)
    assert solver.safety_radius == 1.40
    assert solver.time_horizon == 5.0
    assert solver.max_speed == 3.0
    min_clearance = 2.0 * solver.safety_radius
    assert pytest.approx(min_clearance, 1e-5) == 2.80


def test_5_drone_ring_crossing_clearance():
    """
    Simulates a 5-drone ring crossing maneuver.
    Drones are initially placed on a ring of radius R = 10.0m facing inward.
    Asserts that calculated ORCA avoidance velocities maintain inter-drone safety clearance >= 2.80m (Gate G5).
    """
    solver = Orca3DSolver(safety_radius=1.40, time_horizon=5.0, max_speed=3.0)
    num_drones = 5
    drones = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]
    ring_radius = 10.0
    target_altitude = 5.0
    pref_speed = 2.0

    positions = {}
    velocities = {}
    pref_velocities = {}

    for i, drone in enumerate(drones):
        theta = i * (2.0 * math.pi / num_drones)
        px = ring_radius * math.cos(theta)
        py = ring_radius * math.sin(theta)
        pz = target_altitude

        positions[drone] = [px, py, pz]
        vx = -pref_speed * math.cos(theta)
        vy = -pref_speed * math.sin(theta)
        vz = 0.0
        velocities[drone] = [vx, vy, vz]
        pref_velocities[drone] = (vx, vy, vz)

    dt = 0.05
    simulation_steps = 200
    min_distance_observed = float("inf")

    for step in range(simulation_steps):
        next_velocities = {}
        for drone_i in drones:
            pos_i = tuple(positions[drone_i])
            vel_i = tuple(velocities[drone_i])
            pref_i = pref_velocities[drone_i]

            neighbors = [
                (tuple(positions[drone_j]), tuple(velocities[drone_j]))
                for drone_j in drones
                if drone_j != drone_i
            ]

            safe_vel = solver.compute_avoidance_velocity(pos_i, vel_i, pref_i, neighbors)
            next_velocities[drone_i] = safe_vel

        # Integrate positions and update velocities
        for drone_i in drones:
            velocities[drone_i] = list(next_velocities[drone_i])
            positions[drone_i][0] += velocities[drone_i][0] * dt
            positions[drone_i][1] += velocities[drone_i][1] * dt
            positions[drone_i][2] += velocities[drone_i][2] * dt

        # Verify pairwise distance clearance at each time step
        for i in range(num_drones):
            for j in range(i + 1, num_drones):
                d1 = drones[i]
                d2 = drones[j]
                dx = positions[d1][0] - positions[d2][0]
                dy = positions[d1][1] - positions[d2][1]
                dz = positions[d1][2] - positions[d2][2]
                dist = math.sqrt(dx * dx + dy * dy + dz * dz)

                if dist < min_distance_observed:
                    min_distance_observed = dist

    # Assert Gate G5 compliance: minimum inter-drone distance >= 2.80m
    assert min_distance_observed >= 2.80, (
        f"Gate G5 Breach! Min inter-drone distance reached {min_distance_observed:.3f}m < 2.80m"
    )


def test_orca_head_on_avoidance():
    """
    Tests pairwise head-on collision trajectory between 2 drones.
    Asserts that ORCA adjusts velocities away from direct head-on path.
    """
    solver = Orca3DSolver(safety_radius=1.40, time_horizon=5.0, max_speed=3.0)

    pos_a = (-5.0, 0.0, 5.0)
    vel_a = (2.0, 0.0, 0.0)
    pref_a = (2.0, 0.0, 0.0)

    pos_b = (5.0, 0.0, 5.0)
    vel_b = (-2.0, 0.0, 0.0)

    neighbors_for_a = [(pos_b, vel_b)]
    safe_vel_a = solver.compute_avoidance_velocity(pos_a, vel_a, pref_a, neighbors_for_a)

    # Avoidance velocity must introduce lateral (y or z) evasion component or reduce forward speed
    y_deflection = abs(safe_vel_a[1])
    z_deflection = abs(safe_vel_a[2])
    speed_a = math.sqrt(safe_vel_a[0]**2 + safe_vel_a[1]**2 + safe_vel_a[2]**2)

    assert y_deflection > 1e-3 or z_deflection > 1e-3 or safe_vel_a[0] < pref_a[0]
    assert speed_a <= solver.max_speed


def test_orca_avoidance_node_init():
    node = ORCAAvoidanceNode()
    assert node.safety_radius == 1.40
    assert len(node.drones) == 5
    assert "uav_alpha" in node.drones
    node.destroy_node()
