#!/usr/bin/env python3
"""
PROJECT SUTRA — SUTRA-FSD Autopilot Test Suite
=============================================
Author: Tech Lead Nikhil (Subsystem A Lead)
Location: sutra_ws/src/sutra_gnc/test/test_sutra_fsd_autopilot.py

Validates:
1. 3D Spatio-Temporal Occupancy Grid point insertion and decay
2. Quintic polynomial C^2 continuity and zero jerk discontinuity
3. Tesla-style cost-volume trajectory ribbon optimization around obstacles
4. Control Barrier Function (CBF) hard safety guarantee under head-on closing
"""

import math
import numpy as np
import pytest

from sutra_gnc.sutra_fsd_occupancy import SutraFsdOccupancyGrid
from sutra_gnc.sutra_fsd_trajectory_planner import SutraFsdTrajectoryPlanner, Quintic1D
from sutra_gnc.sutra_cbf_safety_shield import ControlBarrierSafetyShield


def test_fsd_occupancy_grid_insertion_and_decay():
    """Verify 3D Occupancy Grid correctly registers obstacles and applies temporal decay."""
    grid = SutraFsdOccupancyGrid(grid_dim_xy=32, grid_dim_z=16, resolution=1.0)
    origin = (0.0, 0.0, 4.0)

    # Insert point cloud at (3.0, 0.0, 4.0)
    pts = np.array([[3.0, 0.0, 4.0]], dtype=np.float32)
    grid.insert_point_cloud(pts, origin_pos=origin, confidence=0.90)

    occ = grid.query_point_occupancy(3.0, 0.0, 4.0, origin_pos=origin)
    assert occ >= 0.85, f"Expected high occupancy, got {occ}"

    # Insert peer drone safety bubble at (-4.0, 2.0, 4.0)
    grid.insert_peer_drone_safety_bubble((-4.0, 2.0, 4.0), (0.0, 0.0, 0.0), origin_pos=origin, safety_radius=2.5)
    peer_occ = grid.query_point_occupancy(-4.0, 2.0, 4.0, origin_pos=origin)
    assert peer_occ > 0.50, f"Expected peer safety bubble, got {peer_occ}"

    # Verify temporal decay
    grid.step_temporal_decay()
    occ_after = grid.query_point_occupancy(3.0, 0.0, 4.0, origin_pos=origin)
    assert occ_after < occ, "Temporal decay failed to reduce occupancy"


def test_fsd_quintic_polynomial_spline_continuity():
    """Verify quintic polynomial satisfies C^2 boundary conditions and smooth jerk profile."""
    x0, v0, a0 = 0.0, 1.0, 0.0
    xT, vT, aT = 10.0, 2.0, 0.0
    T = 3.0

    q = Quintic1D(x0, v0, a0, xT, vT, aT, T)

    # Check boundary conditions
    assert abs(q.pos(0.0) - x0) < 1e-4, f"Start pos mismatch: {q.pos(0.0)}"
    assert abs(q.vel(0.0) - v0) < 1e-4, f"Start vel mismatch: {q.vel(0.0)}"
    assert abs(q.accel(0.0) - a0) < 1e-4, f"Start acc mismatch: {q.accel(0.0)}"

    assert abs(q.pos(T) - xT) < 1e-4, f"End pos mismatch: {q.pos(T)}"
    assert abs(q.vel(T) - vT) < 1e-4, f"End vel mismatch: {q.vel(T)}"
    assert abs(q.accel(T) - aT) < 1e-4, f"End acc mismatch: {q.accel(T)}"

    # Check finite jerk
    assert abs(q.jerk(1.5)) < 20.0, "Jerk exceeds physical bounds"


def test_fsd_cost_volume_obstacle_avoidance():
    """Verify planner avoids a 3D obstacle placed in the direct line of sight to goal."""
    grid = SutraFsdOccupancyGrid()
    planner = SutraFsdTrajectoryPlanner(time_horizon=3.0, max_speed=3.0)

    current_pos = (0.0, 0.0, 4.0)
    current_vel = (1.0, 0.0, 0.0)
    current_acc = (0.0, 0.0, 0.0)
    goal_pos = (12.0, 0.0, 4.0)

    # Place heavy obstacle directly in front at (4.0, 0.0, 4.0)
    obst_pts = np.array([
        [4.0, 0.0, 4.0],
        [4.5, 0.0, 4.0],
        [5.0, 0.0, 4.0]
    ], dtype=np.float32)
    grid.insert_point_cloud(obst_pts, current_pos, confidence=1.0)

    best_traj = planner.plan(current_pos, current_vel, current_acc, goal_pos, grid)
    pts = best_traj.sample_positions(num_samples=15)

    # Verify that the trajectory deviates laterally or vertically away from (4.0, 0.0, 4.0)
    mid_pt = pts[len(pts)//2]
    lateral_or_vertical_dev = max(abs(mid_pt[1]), abs(mid_pt[2] - 4.0))
    assert lateral_or_vertical_dev > 0.30, f"Planner failed to detour obstacle: mid_pt={mid_pt}"


def test_cbf_safety_shield_hard_barrier():
    """Verify Control Barrier Function actively intervenes to prevent violation of 2.80m safety radius."""
    shield = ControlBarrierSafetyShield(safety_radius=2.80, max_accel=2.50)

    own_pos = (0.0, 0.0, 4.0)
    own_vel = (2.0, 0.0, 0.0)  # Flying forward at +2 m/s
    desired_acc = (2.0, 0.0, 0.0)  # Wants to accelerate forward into peer!

    # Peer is directly ahead at (3.0, 0.0, 4.0), moving backwards (-1 m/s) -> closing rapidly!
    peer_pos = (3.0, 0.0, 4.0)
    peer_vel = (-1.0, 0.0, 0.0)
    neighbors = [(peer_pos, peer_vel)]

    safe_ax, safe_ay, safe_az = shield.filter_acceleration(own_pos, own_vel, desired_acc, neighbors)

    # CBF must counteract forward acceleration and apply strong braking (negative acceleration along X)
    assert safe_ax < 0.0, f"CBF failed to apply braking: safe_ax={safe_ax}"
    print(f"\n✅ CBF Hard Shield: Desired Accel: {desired_acc[0]} m/s² -> Safe Clamped Accel: {safe_ax:.2f} m/s² (Braking)")
