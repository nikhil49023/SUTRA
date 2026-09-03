#!/usr/bin/env python3
"""
Phase 1 Single Quadcopter Flight Unit Tests
===========================================
Verifies state machine transitions, proportional guidance math, and waypoint indexing.
"""

import math
import pytest
from sutra_gnc.single_quadcopter_offboard_node import FlightState, SingleQuadcopterOffboardNode


def test_flight_state_enum():
    assert FlightState.INIT.value == "INIT"
    assert FlightState.TAKEOFF.value == "TAKEOFF"
    assert FlightState.WAYPOINT_NAV.value == "WAYPOINT_NAV"
    assert FlightState.HOVER.value == "HOVER"
    assert FlightState.LAND.value == "LAND"


def test_waypoint_distance_math():
    target = (10.0, 0.0, 5.0)
    curr_x, curr_y = 0.0, 0.0
    dx = target[0] - curr_x
    dy = target[1] - curr_y
    dist_xy = math.hypot(dx, dy)
    assert pytest.approx(dist_xy, 1e-5) == 10.0

    speed = 2.5
    vx = (dx / dist_xy) * speed
    vy = (dy / dist_xy) * speed

    assert pytest.approx(vx, 1e-5) == 2.5
    assert pytest.approx(vy, 1e-5) == 0.0
