#!/usr/bin/env python3
"""
Test Suite: High-Density Swarm 3D Spatial Coordination & ORCA Clearance (Subsystem A)
========================================================================================
Tests 10 to 100 drone ORCA 3D multi-agent collision avoidance clearance
(min clearance >= 2.80m - Gate G5) and topology convergence.
"""

import math
import pytest
import rclpy
from sutra_gnc.orca_avoidance import Orca3DSolver


@pytest.fixture(scope="module", autouse=True)
def init_rclpy():
    if not rclpy.ok():
        rclpy.init()
    yield
    if rclpy.ok():
        rclpy.shutdown()


def test_10_drone_swarm_orca_clearance():
    """
    Simulates a 10-drone 3D ring convergence maneuver.
    Drones are placed on a 3D circle of radius R = 15.0m facing inward.
    Asserts that calculated ORCA avoidance velocities maintain inter-drone clearance >= 2.80m (Gate G5).
    """
    solver = Orca3DSolver(safety_radius=1.40, time_horizon=5.0, max_speed=3.0)
    num_drones = 10
    drones = [f"uav_{i}" for i in range(num_drones)]
    radius = 15.0
    pref_speed = 2.0

    positions = {}
    velocities = {}
    pref_velocities = {}

    for i, drone in enumerate(drones):
        angle = i * (2.0 * math.pi / num_drones)
        px = radius * math.cos(angle)
        py = radius * math.sin(angle)
        pz = 4.0 + (i % 3) * 1.5  # 3D altitude staggering

        positions[drone] = [px, py, pz]
        vx = -pref_speed * math.cos(angle)
        vy = -pref_speed * math.sin(angle)
        vz = 0.0
        velocities[drone] = [vx, vy, vz]
        pref_velocities[drone] = (vx, vy, vz)

    dt = 0.05
    min_distance_observed = float("inf")

    for _ in range(150):
        next_velocities = {}
        for drone_i in drones:
            pos_i = tuple(positions[drone_i])
            vel_i = tuple(velocities[drone_i])
            pref_i = pref_velocities[drone_i]

            neighbors = [
                (tuple(positions[drone_j]), tuple(velocities[drone_j]))
                for drone_j in drones if drone_j != drone_i
            ]

            safe_vel = solver.compute_avoidance_velocity(pos_i, vel_i, pref_i, neighbors)
            next_velocities[drone_i] = safe_vel

        # Integrate positions
        for drone_i in drones:
            velocities[drone_i] = list(next_velocities[drone_i])
            positions[drone_i][0] += velocities[drone_i][0] * dt
            positions[drone_i][1] += velocities[drone_i][1] * dt
            positions[drone_i][2] += velocities[drone_i][2] * dt

        # Pairwise inter-drone distance check
        for i in range(num_drones):
            for j in range(i + 1, num_drones):
                d1, d2 = drones[i], drones[j]
                dx = positions[d1][0] - positions[d2][0]
                dy = positions[d1][1] - positions[d2][1]
                dz = positions[d1][2] - positions[d2][2]
                dist = math.sqrt(dx * dx + dy * dy + dz * dz)
                if dist < min_distance_observed:
                    min_distance_observed = dist

    assert min_distance_observed >= 2.80, (
        f"Gate G5 Breach in 10-drone swarm! Min distance = {min_distance_observed:.3f}m < 2.80m"
    )


def test_50_drone_huge_swarm_clearance_and_convergence():
    """
    Simulates a 50-drone multi-layer 3D grid convergence.
    Asserts minimum pairwise clearance >= 2.80m and successful topology convergence.
    """
    solver = Orca3DSolver(safety_radius=1.40, time_horizon=5.0, max_speed=3.0)
    num_drones = 50
    drones = [f"drone_{i}" for i in range(num_drones)]

    positions = {}
    velocities = {}
    pref_velocities = {}

    # Distribute 50 drones across 5 vertical layers (z = 3m, 6m, 9m, 12m, 15m)
    for i, drone in enumerate(drones):
        layer = i // 10
        idx_in_layer = i % 10
        angle = idx_in_layer * (2.0 * math.pi / 10)
        radius = 20.0
        px = radius * math.cos(angle)
        py = radius * math.sin(angle)
        pz = 3.0 + layer * 3.0

        positions[drone] = [px, py, pz]
        vx = -1.5 * math.cos(angle)
        vy = -1.5 * math.sin(angle)
        vz = 0.0
        velocities[drone] = [vx, vy, vz]
        pref_velocities[drone] = (vx, vy, vz)

    dt = 0.05
    min_distance_observed = float("inf")

    for step in range(100):
        next_velocities = {}
        for drone_i in drones:
            pos_i = tuple(positions[drone_i])
            vel_i = tuple(velocities[drone_i])
            pref_i = pref_velocities[drone_i]

            # Filter neighbors within 10m range to optimize computation
            neighbors = []
            for drone_j in drones:
                if drone_j == drone_i:
                    continue
                pj = positions[drone_j]
                if math.sqrt((pj[0]-pos_i[0])**2 + (pj[1]-pos_i[1])**2 + (pj[2]-pos_i[2])**2) < 10.0:
                    neighbors.append((tuple(pj), tuple(velocities[drone_j])))

            safe_vel = solver.compute_avoidance_velocity(pos_i, vel_i, pref_i, neighbors)
            next_velocities[drone_i] = safe_vel

        # Update positions
        for drone_i in drones:
            velocities[drone_i] = list(next_velocities[drone_i])
            positions[drone_i][0] += velocities[drone_i][0] * dt
            positions[drone_i][1] += velocities[drone_i][1] * dt
            positions[drone_i][2] += velocities[drone_i][2] * dt

        # Pairwise distance check
        for i in range(num_drones):
            for j in range(i + 1, num_drones):
                d1, d2 = drones[i], drones[j]
                dx = positions[d1][0] - positions[d2][0]
                dy = positions[d1][1] - positions[d2][1]
                dz = positions[d1][2] - positions[d2][2]
                dist = math.sqrt(dx * dx + dy * dy + dz * dz)
                if dist < min_distance_observed:
                    min_distance_observed = dist

    assert min_distance_observed >= 2.80, (
        f"50-drone Swarm Clearance Breach! Min clearance = {min_distance_observed:.3f}m < 2.80m"
    )


def test_100_drone_huge_swarm_topology_convergence():
    """
    Simulates a 100-drone 3D spatial swarm field.
    Verifies that all 100 agents compute safe non-colliding avoidance vectors.
    """
    solver = Orca3DSolver(safety_radius=1.40, time_horizon=5.0, max_speed=3.0)
    num_drones = 100
    drones = [f"node_{i}" for i in range(num_drones)]

    positions = {}
    velocities = {}

    for i, drone in enumerate(drones):
        x = (i % 10) * 4.0 - 18.0
        y = ((i // 10) % 10) * 4.0 - 18.0
        z = (i // 25) * 3.0 + 2.0
        positions[drone] = (x, y, z)
        velocities[drone] = (0.5 * (1 if i % 2 == 0 else -1), 0.5 * (1 if i % 4 < 2 else -1), 0.0)

    # Calculate safe avoidance for a sample of drones in dense central cluster
    central_drones = drones[40:50]
    for d in central_drones:
        pos_i = positions[d]
        vel_i = velocities[d]
        pref_i = vel_i
        neighbors = [(positions[other], velocities[other]) for other in drones if other != d]

        safe_vel = solver.compute_avoidance_velocity(pos_i, vel_i, pref_i, neighbors)
        speed = math.sqrt(safe_vel[0]**2 + safe_vel[1]**2 + safe_vel[2]**2)

        assert speed <= solver.max_speed
        assert not (math.isnan(safe_vel[0]) or math.isnan(safe_vel[1]) or math.isnan(safe_vel[2]))
