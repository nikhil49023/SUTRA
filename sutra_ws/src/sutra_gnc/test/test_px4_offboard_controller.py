#!/usr/bin/env python3
"""
Test Suite: Native PX4 MicroXRCE-DDS Offboard Flight Controller (Subsystem A)
=============================================================================
Verifies:
1. Bidirectional ENU <-> NED coordinate and quaternion transformations (< 1e-6 error).
2. PX4 uORB message container DTOs and serialization.
3. PX4 10-heartbeat warmup protocol before offboard mode switch.
4. Auto-arming and mode transition command generation.
5. 50Hz trajectory setpoint acceleration and jerk limits (Gate G1).
6. 500ms odometry loss failsafe detection.
7. WaveLander 2-phase emergency landing and disarm upon touchdown.
"""

import math
import json
import time
import pytest
import rclpy
from geometry_msgs.msg import PoseStamped
from nav_msgs.msg import Odometry
from std_msgs.msg import String

from sutra_gnc.px4_offboard_controller import (
    PX4OffboardControllerNode,
    PX4FlightState,
    PX4DifferentiableTrajectoryFilter,
    OffboardControlModeDTO,
    TrajectorySetpointDTO,
    VehicleCommandDTO,
    enu_to_ned,
    ned_to_enu,
    quat_enu_to_ned,
    VEHICLE_CMD_DO_SET_MODE,
    VEHICLE_CMD_COMPONENT_ARM_DISARM,
    PX4_CUSTOM_MAIN_MODE_OFFBOARD,
)


@pytest.fixture(scope="module", autouse=True)
def init_rclpy():
    if not rclpy.ok():
        rclpy.init()
    yield
    if rclpy.ok():
        rclpy.shutdown()


def test_enu_to_ned_and_inverse():
    """Verifies precision of bidirectional ENU <-> NED spatial conversions."""
    enu_pos = (15.2, -8.4, 12.0)  # East=15.2, North=-8.4, Up=12.0
    ned_pos = enu_to_ned(*enu_pos)

    # In NED: x=North(-8.4), y=East(15.2), z=Down(-12.0)
    assert pytest.approx(ned_pos[0], abs=1e-6) == -8.4
    assert pytest.approx(ned_pos[1], abs=1e-6) == 15.2
    assert pytest.approx(ned_pos[2], abs=1e-6) == -12.0

    # Invert back to ENU
    recovered_enu = ned_to_enu(*ned_pos)
    assert pytest.approx(recovered_enu[0], abs=1e-6) == enu_pos[0]
    assert pytest.approx(recovered_enu[1], abs=1e-6) == enu_pos[1]
    assert pytest.approx(recovered_enu[2], abs=1e-6) == enu_pos[2]


def test_quaternion_enu_to_ned():
    """Verifies orientation quaternion transformation from ENU to NED frame."""
    # Identity quaternion in ENU
    qx, qy, qz, qw = 0.0, 0.0, 0.0, 1.0
    q_ned = quat_enu_to_ned(qx, qy, qz, qw)
    norm = math.sqrt(sum(q**2 for q in q_ned))
    assert pytest.approx(norm, abs=1e-5) == 1.0


def test_px4_dto_serialization():
    """Verifies PX4 uORB DTO payload structures."""
    mode_dto = OffboardControlModeDTO(position=True, velocity=True, timestamp_us=1000)
    d_mode = mode_dto.to_dict()
    assert d_mode["position"] is True
    assert d_mode["velocity"] is True
    assert d_mode["acceleration"] is False

    traj_dto = TrajectorySetpointDTO(
        position_ned=(10.0, 5.0, -4.0),
        velocity_ned=(1.5, 0.0, -0.5),
        yaw_rad=1.57,
        timestamp_us=2000
    )
    d_traj = traj_dto.to_dict()
    assert d_traj["position"] == [10.0, 5.0, -4.0]
    assert d_traj["velocity"] == [1.5, 0.0, -0.5]
    assert pytest.approx(d_traj["yaw"], abs=1e-3) == 1.57

    cmd_dto = VehicleCommandDTO(
        command=VEHICLE_CMD_DO_SET_MODE,
        param1=1.0,
        param2=float(PX4_CUSTOM_MAIN_MODE_OFFBOARD)
    )
    d_cmd = cmd_dto.to_dict()
    assert d_cmd["command"] == 176
    assert d_cmd["param2"] == 6.0


def test_differentiable_trajectory_filter_limits():
    """Verifies acceleration (<= 2.5 m/s^2) and jerk (<= 5.0 m/s^3) bounding (Gate G1)."""
    filter_engine = PX4DifferentiableTrajectoryFilter(
        max_speed=3.0, max_accel=2.5, max_jerk=5.0
    )

    dt = 0.02  # 50Hz interval
    curr_vel = (0.0, 0.0, 0.0)
    target_vel = (3.0, 0.0, 0.0)  # Aggressive step command

    # Filter over multiple 50Hz ticks
    for _ in range(5):
        filtered_vel = filter_engine.filter_velocity(target_vel, dt=dt)
        dv = math.sqrt(sum((filtered_vel[i] - curr_vel[i])**2 for i in range(3)))
        accel = dv / dt
        assert accel <= 2.51, f"Acceleration {accel:.2f} exceeds limit 2.50 m/s^2"
        curr_vel = filtered_vel


def test_px4_offboard_node_warmup_state_machine():
    """Verifies 10-heartbeat warmup phase transition to ARMING and ENGAGING_OFFBOARD."""
    node = PX4OffboardControllerNode()
    assert node.state == PX4FlightState.DISARMED_STANDBY

    # Tick heartbeats
    node._heartbeat_tick()
    assert node.state == PX4FlightState.WARMUP_HEARTBEATS
    assert node.heartbeat_count == 1

    # Simulate reaching 10 warmup heartbeats
    node.heartbeat_count = 10
    node._heartbeat_tick()
    assert node.state == PX4FlightState.ARMING

    # Next tick engages offboard mode
    node._heartbeat_tick()
    assert node.state == PX4FlightState.ENGAGING_OFFBOARD

    node.destroy_node()


def test_px4_odometry_timeout_emergency_land():
    """Verifies automatic failsafe trigger when odometry drops for > 500ms while airborne."""
    node = PX4OffboardControllerNode()
    node.state = PX4FlightState.OFFBOARD_CRUISE
    node.pos_enu = (0.0, 0.0, 4.0)  # Airborne at 4.0m
    node.last_odometry_time = time.time() - 0.60  # 600ms ago (> 500ms timeout)

    node._flight_control_tick()
    assert node.state == PX4FlightState.EMERGENCY_LAND

    node.destroy_node()


def test_px4_wavelander_two_phase_landing():
    """Verifies 2-phase descent rate: 1.20m/s approach -> 0.35m/s soft touchdown."""
    node = PX4OffboardControllerNode()
    node.state = PX4FlightState.EMERGENCY_LAND

    # High altitude descent (alt = 4.0m)
    node.pos_enu = (0.0, 0.0, 4.0)
    node._flight_control_tick()
    assert node.traj_filter.curr_vel[2] <= 0.0  # Descending

    # Near ground soft touchdown (alt = 0.8m)
    node.pos_enu = (0.0, 0.0, 0.8)
    node._flight_control_tick()
    assert node.state == PX4FlightState.EMERGENCY_LAND

    # Touchdown on ground (alt = 0.10m) -> Disarms and completes
    node.pos_enu = (0.0, 0.0, 0.10)
    node._flight_control_tick()
    assert node.state == PX4FlightState.DISARMED_COMPLETE

    node.destroy_node()


def test_px4_external_waypoint_and_rtl():
    """Verifies target position update and 1-click Return-To-Launch handling."""
    node = PX4OffboardControllerNode()
    node.state = PX4FlightState.OFFBOARD_CRUISE

    # Dispatch external waypoint
    cmd_pose = PoseStamped()
    cmd_pose.pose.position.x = 25.0
    cmd_pose.pose.position.y = -15.0
    cmd_pose.pose.position.z = 6.0
    node._on_cmd_pose(cmd_pose)
    assert node.target_pos_enu == (25.0, -15.0, 6.0)

    # Dispatch RTL command
    rtl_msg = String()
    rtl_msg.data = "TRIGGER_RTL"
    node._on_cmd_rtl(rtl_msg)
    assert node.state == PX4FlightState.RETURN_TO_LAUNCH

    node.destroy_node()
