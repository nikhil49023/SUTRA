#!/usr/bin/env python3
"""
Test Suite: Quadcopter Motor Failure Fallback & Spin Stabilization (Subsystem A)
=================================================================================
Tests single/dual motor failure detection, active spin damping,
controlled emergency descent rate (1.2 m/s), and automated RTL dispatch.
"""

import math
import pytest
import rclpy
from sutra_gnc.motor_failure_fallback_node import (
    MotorFailureFallbackController,
    MotorFailureFallbackNode
)


@pytest.fixture(scope="module", autouse=True)
def init_rclpy():
    if not rclpy.ok():
        rclpy.init()
    yield
    if rclpy.ok():
        rclpy.shutdown()


def test_single_motor_failure_detection():
    """
    Tests detection of single rotor failure when one motor drops below RPM threshold.
    """
    controller = MotorFailureFallbackController(drone_id="uav_alpha", nominal_rpm=1000.0, failure_threshold_rpm=300.0)

    # Nominal state
    controller.update_motor_rpms([1000.0, 1000.0, 1000.0, 1000.0])
    assert not controller.failure_detected
    assert not controller.single_motor_failure
    assert not controller.dual_motor_failure

    # Single motor failure on Motor 2
    controller.update_motor_rpms([1000.0, 50.0, 1000.0, 1000.0])
    assert controller.failure_detected
    assert controller.single_motor_failure
    assert not controller.dual_motor_failure
    assert controller.rotor_power_level == 0.7625


def test_dual_motor_failure_detection():
    """
    Tests detection of dual rotor failure when two motors lose power.
    """
    controller = MotorFailureFallbackController(drone_id="uav_alpha", nominal_rpm=1000.0, failure_threshold_rpm=300.0)

    controller.update_motor_rpms([50.0, 1000.0, 100.0, 1000.0])
    assert controller.failure_detected
    assert not controller.single_motor_failure
    assert controller.dual_motor_failure
    assert controller.rotor_power_level == 0.5375


def test_spin_stabilization_and_damping():
    """
    Tests active spin stabilization yaw rate damping command under high yaw rotation.
    """
    controller = MotorFailureFallbackController(drone_id="uav_alpha", spin_damping_gain=0.8)

    # High yaw rate perturbation wz = +3.5 rad/s
    controller.update_imu(0.1, 0.1, 3.5)
    assert not controller.spin_stabilized

    cmd_vx, cmd_vy, cmd_vz, cmd_yaw_rate = controller.compute_fallback_command()

    # Damping command must directly oppose positive yaw rate
    expected_damping = -0.8 * 3.5  # -2.8 rad/s
    assert pytest.approx(cmd_yaw_rate, 1e-4) == expected_damping


def test_controlled_emergency_descent_rate():
    """
    Tests controlled 1.2 m/s emergency descent rate execution.
    """
    controller = MotorFailureFallbackController(drone_id="uav_alpha", descent_rate=1.2)

    controller.update_odometry(0.0, 0.0, 10.0, 0.0, 0.0, 0.0)
    cmd_vx, cmd_vy, cmd_vz, cmd_yaw_rate = controller.compute_fallback_command()

    # Controlled emergency descent rate must equal -1.2 m/s
    assert pytest.approx(cmd_vz, 1e-4) == -1.2


def test_automated_rtl_dispatch():
    """
    Tests automated Emergency Return-to-Launch (RTL) dispatch when rotor power is degraded.
    """
    controller = MotorFailureFallbackController(
        drone_id="uav_alpha",
        home_position=(0.0, 0.0, 0.0),
        safety_altitude_threshold=2.0
    )

    controller.update_odometry(15.0, 10.0, 5.0, 0.0, 0.0, 0.0)
    # Rotor power degradation < 75%
    controller.update_motor_rpms([400.0, 400.0, 1000.0, 500.0])  # ~57.5% power

    controller.update_odometry(15.0, 10.0, 5.0, 0.0, 0.0, 0.0)

    assert controller.rtl_triggered
    status = controller.get_status_summary()
    assert status["state"] == "RTL_DISPATCH"
    assert status["rtl_triggered"]

    # Compute fallback command
    cmd_vx, cmd_vy, cmd_vz, cmd_yaw_rate = controller.compute_fallback_command()
    # Horizontal velocity vector should point towards home (0.0, 0.0) from (15.0, 10.0) -> negative vx, vy
    assert cmd_vx < 0.0
    assert cmd_vy < 0.0


def test_motor_failure_fallback_node_init():
    """
    Tests initialization of ROS 2 MotorFailureFallbackNode.
    """
    node = MotorFailureFallbackNode()
    assert node.controller.drone_id == "uav_alpha"
    assert node.controller.descent_rate == 1.2
    assert node.pub_cmd_vel is not None
    assert node.pub_status is not None
    node.destroy_node()


def test_hexacopter_single_motor_failure_tolerance():
    """
    Tests Hexacopter (6-rotor) fault-tolerance: single motor loss retains controlled flight.
    """
    controller = MotorFailureFallbackController(
        drone_id="uav_1",
        num_rotors=6,
        nominal_rpm=1000.0,
        failure_threshold_rpm=300.0
    )

    # 1 motor failure out of 6
    controller.update_motor_rpms([1000.0, 1000.0, 50.0, 1000.0, 1000.0, 1000.0])
    assert controller.failure_detected
    assert controller.single_motor_failure
    assert not controller.dual_motor_failure
    assert controller.fault_tolerant_active
    assert controller.spin_stabilized
    assert pytest.approx(controller.rotor_power_level, 1e-4) == 5050.0 / 6000.0  # 84.17% power remaining

    status = controller.get_status_summary()
    assert status["drone_type"] == "hexacopter"
    assert status["num_rotors"] == 6
    assert status["state"] == "FAULT_TOLERANT_DEGRADED"


def test_octacopter_dual_motor_failure_tolerance():
    """
    Tests Octacopter (8-rotor) fault-tolerance: dual motor loss retains flight authority.
    """
    controller = MotorFailureFallbackController(
        drone_id="uav_alpha",
        num_rotors=8,
        nominal_rpm=1000.0,
        failure_threshold_rpm=300.0
    )

    # 2 motors fail out of 8 (e.g. motors 1 and 4)
    controller.update_motor_rpms([1000.0, 50.0, 1000.0, 1000.0, 80.0, 1000.0, 1000.0, 1000.0])
    assert controller.failure_detected
    assert not controller.single_motor_failure
    assert controller.dual_motor_failure
    assert controller.fault_tolerant_active
    assert controller.spin_stabilized
    assert pytest.approx(controller.rotor_power_level, 1e-4) == 6130.0 / 8000.0  # 76.62% power remaining

    status = controller.get_status_summary()
    assert status["drone_type"] == "octacopter"
    assert status["num_rotors"] == 8
    assert status["fault_tolerant_active"]

