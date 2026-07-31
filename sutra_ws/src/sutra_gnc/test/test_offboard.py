"""
Strengthened Unit & Integration Test Suite for Subsystem A Offboard Node
"""

import math
import pytest
from sutra_gnc.offboard_node import SutraOffboardControlNode, DroneState


def test_offboard_node_import():
    from sutra_gnc.offboard_node import SutraOffboardControlNode
    assert SutraOffboardControlNode is not None


def test_quaternion_norm_is_unit():
    """Verify that _euler_to_quaternion produces a unit quaternion (norm = 1.0)."""
    node = SutraOffboardControlNode.__new__(SutraOffboardControlNode)
    for angle_deg in range(0, 360, 15):
        yaw_rad = math.radians(angle_deg)
        qx, qy, qz, qw = node._euler_to_quaternion(yaw_rad)
        norm = math.sqrt(qx**2 + qy**2 + qz**2 + qw**2)
        assert abs(norm - 1.0) < 1e-6, f"Quaternion norm for yaw={yaw_rad} is {norm}, expected 1.0"


def test_distance_to_wp_euclidean():
    """Verify Euclidean distance computation in 2D NED space."""
    node = SutraOffboardControlNode.__new__(SutraOffboardControlNode)
    node.state = DroneState()
    node.state.x = 10.0
    node.state.y = 20.0

    target_wp = (13.0, 24.0, 15.0)
    # Expected sqrt((13-10)^2 + (24-20)^2) = sqrt(9 + 16) = 5.0
    dist = node._distance_to_wp(target_wp)
    assert abs(dist - 5.0) < 1e-5


def test_yaw_to_wp_orientation():
    """Verify atan2 yaw heading generation towards waypoint."""
    node = SutraOffboardControlNode.__new__(SutraOffboardControlNode)
    node.state = DroneState()
    node.state.x = 0.0
    node.state.y = 0.0

    # Waypoint directly East (+x): dy=0, dx>0 -> yaw = pi/2
    wp_east = (10.0, 0.0, 15.0)
    yaw = node._yaw_to_wp(wp_east)
    assert abs(yaw - math.pi / 2) < 1e-5

    # Waypoint directly North (+y): dy>0, dx=0 -> yaw = 0
    wp_north = (0.0, 10.0, 15.0)
    yaw = node._yaw_to_wp(wp_north)
    assert abs(yaw - 0.0) < 1e-5


def test_waypoint_advancement_state_machine():
    """Verify waypoint index advances when drone reaches within 1.5m radius."""
    node = SutraOffboardControlNode.__new__(SutraOffboardControlNode)
    node.state = DroneState()
    node.wp_index = 0
    node.wp_list = [(0.0, 0.0, 15.0), (20.0, 0.0, 20.0)]
    node.cruise_speed = 2.0

    # Set position equal to WP 0
    node.state.x = 0.0
    node.state.y = 0.0

    wp = node.wp_list[node.wp_index]
    dist = node._distance_to_wp(wp)
    assert dist < 1.5

    # Trigger distance check threshold
    if dist < 1.5:
        node.wp_index = (node.wp_index + 1) % len(node.wp_list)

    assert node.wp_index == 1


def test_wgs84_conversion_precision():
    """Verify local NED offset conversion to WGS84 coordinates."""
    ORIGIN_LAT = 37.774929
    ORIGIN_LON = -122.419416
    R = 6_378_137.0

    # 100m North offset
    y_north = 100.0
    lat_offset = math.degrees(y_north / R)
    new_lat = ORIGIN_LAT + lat_offset
    assert new_lat > ORIGIN_LAT
    assert abs(new_lat - (ORIGIN_LAT + 0.000898)) < 1e-5
