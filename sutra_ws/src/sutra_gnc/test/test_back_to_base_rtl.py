#!/usr/bin/env python3
"""
Test Suite: Emergency Return-To-Launch (RTL) & Geofence Safety Landing (Subsystem A)
====================================================================================
Tests 1-click Emergency Return-To-Launch trajectory generation,
geofence breach safety landing, and home coordinate arrival precision.
"""

import math
from typing import List, Tuple
import pytest
import rclpy


class EmergencyRTLPlanner:
    """
    Emergency Return-To-Launch (RTL) Trajectory Generator and Geofence Safety Land Controller.
    """

    def __init__(
        self,
        home_pos: Tuple[float, float, float] = (0.0, 0.0, 0.0),
        max_geofence_radius: float = 50.0,
        max_altitude: float = 20.0,
        cruise_altitude: float = 5.0,
        target_speed: float = 2.0,
        descent_rate: float = 1.2
    ):
        self.home_pos = home_pos
        self.max_geofence_radius = max_geofence_radius
        self.max_altitude = max_altitude
        self.cruise_altitude = cruise_altitude
        self.target_speed = target_speed
        self.descent_rate = descent_rate

    def check_geofence_breach(self, pos: Tuple[float, float, float]) -> bool:
        """
        Returns True if drone position breaches radial geofence boundary or max altitude.
        """
        px, py, pz = pos
        radial_dist = math.sqrt(px * px + py * py)
        return radial_dist > self.max_geofence_radius or pz > self.max_altitude

    def generate_rtl_trajectory(
        self,
        start_pos: Tuple[float, float, float],
        dt: float = 0.1
    ) -> List[Tuple[float, float, float]]:
        """
        Generates discrete 3D trajectory waypoints from start_pos to home_pos.
        3-Phase RTL:
        Phase 1: Climb/adjust to safe cruise altitude
        Phase 2: Horizontal flight to home (x=0, y=0)
        Phase 3: Vertical descent at 1.2 m/s to ground landing
        """
        waypoints = [start_pos]
        curr_x, curr_y, curr_z = start_pos
        hx, hy, hz = self.home_pos

        target_cruise_z = max(curr_z, self.cruise_altitude)

        # Phase 1: Altitude Adjustment
        while abs(curr_z - target_cruise_z) > 0.05:
            step_z = 1.0 * dt if curr_z < target_cruise_z else -1.0 * dt
            curr_z += step_z
            waypoints.append((curr_x, curr_y, curr_z))

        # Phase 2: Horizontal Navigation to Home
        while True:
            dx = hx - curr_x
            dy = hy - curr_y
            dist_horiz = math.sqrt(dx * dx + dy * dy)
            if dist_horiz < 0.1:
                curr_x, curr_y = hx, hy
                waypoints.append((curr_x, curr_y, curr_z))
                break

            step_dist = self.target_speed * dt
            if step_dist >= dist_horiz:
                curr_x, curr_y = hx, hy
            else:
                curr_x += (dx / dist_horiz) * step_dist
                curr_y += (dy / dist_horiz) * step_dist
            waypoints.append((curr_x, curr_y, curr_z))

        # Phase 3: Vertical Descent to Home Land Position
        while curr_z > hz + 0.05:
            curr_z -= self.descent_rate * dt
            if curr_z < hz:
                curr_z = hz
            waypoints.append((curr_x, curr_y, curr_z))

        return waypoints

    def execute_geofence_safety_land(
        self,
        current_pos: Tuple[float, float, float]
    ) -> Tuple[float, float, float, float]:
        """
        Computes safety land command twist (vx=0, vy=0, vz=-1.2, yaw_rate=0) on geofence breach.
        """
        return 0.0, 0.0, -self.descent_rate, 0.0


@pytest.fixture(scope="module", autouse=True)
def init_rclpy():
    if not rclpy.ok():
        rclpy.init()
    yield
    if rclpy.ok():
        rclpy.shutdown()


def test_1click_rtl_trajectory_generation():
    """
    Tests 1-click Emergency Return-To-Launch trajectory generation from arbitrary start point.
    """
    planner = EmergencyRTLPlanner(home_pos=(0.0, 0.0, 0.0), cruise_altitude=5.0)
    start = (30.0, -40.0, 2.0)

    trajectory = planner.generate_rtl_trajectory(start)

    assert len(trajectory) > 10
    assert trajectory[0] == start
    assert pytest.approx(trajectory[-1][0], 1e-3) == 0.0
    assert pytest.approx(trajectory[-1][1], 1e-3) == 0.0
    assert pytest.approx(trajectory[-1][2], 1e-3) == 0.0


def test_geofence_breach_detection_and_safety_landing():
    """
    Tests geofence breach detection (> 50.0m radius or > 20.0m altitude) and safety landing trigger.
    """
    planner = EmergencyRTLPlanner(max_geofence_radius=50.0, max_altitude=20.0)

    # Within geofence
    pos_nominal = (30.0, 20.0, 10.0)  # radius = sqrt(900+400) = 36.05m < 50m
    assert not planner.check_geofence_breach(pos_nominal)

    # Radial breach (45.0, 30.0, 10.0) -> radius = 54.08m > 50m
    pos_radial_breach = (45.0, 30.0, 10.0)
    assert planner.check_geofence_breach(pos_radial_breach)

    # Altitude breach (10.0, 10.0, 25.0) -> z = 25m > 20m
    pos_alt_breach = (10.0, 10.0, 25.0)
    assert planner.check_geofence_breach(pos_alt_breach)

    # Verify safety landing command
    vx, vy, vz, yaw_rate = planner.execute_geofence_safety_land(pos_radial_breach)
    assert vx == 0.0
    assert vy == 0.0
    assert vz == -1.2
    assert yaw_rate == 0.0


def test_home_coordinate_arrival_precision():
    """
    Simulates drone navigating generated 1-click RTL trajectory and verifies home arrival precision < 0.20m.
    """
    planner = EmergencyRTLPlanner(home_pos=(0.0, 0.0, 0.0))
    start_pos = (-25.0, 35.0, 8.0)

    trajectory = planner.generate_rtl_trajectory(start_pos, dt=0.05)
    final_wp = trajectory[-1]

    arrival_error = math.sqrt(final_wp[0]**2 + final_wp[1]**2 + final_wp[2]**2)
    assert arrival_error < 0.20, f"RTL Arrival Error excessive! {arrival_error:.3f}m >= 0.20m"
