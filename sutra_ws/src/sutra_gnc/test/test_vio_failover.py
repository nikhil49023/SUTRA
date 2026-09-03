#!/usr/bin/env python3
"""
Test Suite: VIO EKF2 State Estimator & GPS Failover (Subsystem A)
===================================================================
Verifies VIO EKF2 state estimator in `sutra_gnc.vio_localization`.
Tests GPS signal drop, seamless state transition to VIO_FALLBACK_ACTIVE mode,
and verifies position drift error < 0.5%.
"""

import math
import pytest
import rclpy
from sutra_gnc.vio_localization import VioEKF2Filter, VIOLocalizationNode


@pytest.fixture(scope="module", autouse=True)
def init_rclpy():
    if not rclpy.ok():
        rclpy.init()
    yield
    if rclpy.ok():
        rclpy.shutdown()


def test_vio_ekf2_initialization():
    ekf = VioEKF2Filter()
    assert ekf.state_p == [0.0, 0.0, 0.0]
    assert ekf.state_v == [0.0, 0.0, 0.0]
    assert ekf.state_q == [1.0, 0.0, 0.0, 0.0]
    assert ekf.active_mode == "INITIALIZING"
    assert not ekf.gps_healthy


def test_gps_primary_mode():
    ekf = VioEKF2Filter()
    curr_t = 1000.0

    for i in range(5):
        ekf.update_gps(10.0, 5.0, 2.0, curr_t + i * 0.1)

    mode = ekf.evaluate_health(curr_t + 0.5)

    assert mode == "GPS_PRIMARY"
    assert ekf.gps_healthy
    assert abs(ekf.state_p[0] - 10.0) < 0.2
    assert abs(ekf.state_p[1] - 5.0) < 0.2
    assert abs(ekf.state_p[2] - 2.0) < 0.2


def test_gps_drop_and_vio_failover():
    """
    Simulates a 100m flight path.
    GPS is active during the first 50m (GPS_PRIMARY).
    GPS signal drops for the remaining 50m.
    Asserts state transition to VIO_FALLBACK_ACTIVE mode and position drift error < 0.5%.
    """
    ekf = VioEKF2Filter()
    t0 = 100.0
    dt = 0.02  # 50Hz updates
    speed = 2.0  # 2 m/s

    total_time = 50.0  # 100m total distance
    gps_drop_time = 25.0  # GPS drops after 50m (25s)

    # Phase 1: GPS + VIO fusion (0s to 25s)
    steps_phase1 = int(gps_drop_time / dt)
    for step in range(steps_phase1):
        t = t0 + step * dt
        true_x = step * dt * speed
        true_y = 0.0
        true_z = 5.0

        # IMU prediction
        ekf.predict_imu(0.0, 0.0, 9.81, 0.0, 0.0, 0.0, dt)

        # GPS & VIO updates
        ekf.update_gps(true_x, true_y, true_z, t)
        ekf.update_vio(true_x, true_y, true_z, (1.0, 0.0, 0.0, 0.0), t)

    # Check primary GPS mode at t = 24.5s
    mode_before_drop = ekf.evaluate_health(t0 + 24.5)
    assert mode_before_drop == "GPS_PRIMARY"
    assert ekf.gps_healthy

    # Phase 2: GPS Signal Drop! VIO only (25s to 50s)
    total_steps = int(total_time / dt)
    for step in range(steps_phase1, total_steps):
        t = t0 + step * dt
        true_x = step * dt * speed
        true_y = 0.0
        true_z = 5.0

        ekf.predict_imu(0.0, 0.0, 9.81, 0.0, 0.0, 0.0, dt)

        # NO GPS updates! Only VIO update with minor camera noise (0.005m)
        vio_noisy_x = true_x + 0.005 * math.sin(step * 0.1)
        vio_noisy_y = true_y + 0.005 * math.cos(step * 0.1)
        ekf.update_vio(vio_noisy_x, vio_noisy_y, true_z, (1.0, 0.0, 0.0, 0.0), t)

    # Evaluate health 2 seconds after GPS drop (t = 27s)
    mode_after_drop = ekf.evaluate_health(t0 + 27.0)
    assert mode_after_drop == "VIO_FALLBACK_ACTIVE"
    assert not ekf.gps_healthy

    # Calculate position drift error over 100m total distance
    final_true_x = total_time * speed  # 100.0m
    est_x = ekf.state_p[0]
    est_y = ekf.state_p[1]
    est_z = ekf.state_p[2]

    position_error = math.sqrt((est_x - final_true_x)**2 + (est_y - 0.0)**2 + (est_z - 5.0)**2)
    drift_error_pct = (position_error / final_true_x) * 100.0

    # Assert position drift error < 0.5%
    assert drift_error_pct < 0.5, (
        f"VIO Failover Drift Error Excessive! {drift_error_pct:.3f}% >= 0.5% (Error: {position_error:.3f}m over {final_true_x}m)"
    )


def test_dead_reckoning_fallback():
    ekf = VioEKF2Filter()
    curr_t = 500.0

    # Update VIO in the past (> 1.5s ago) and no GPS
    ekf.update_vio(0.0, 0.0, 0.0, (1.0, 0.0, 0.0, 0.0), curr_t - 2.0)
    mode = ekf.evaluate_health(curr_t)

    assert mode == "DEAD_RECKONING_IMU_ONLY"
    assert not ekf.gps_healthy


def test_vio_localization_node_init():
    node = VIOLocalizationNode()
    assert node.drone_id == "uav_alpha"
    assert node.pub_vio_odom is not None
    assert node.pub_status is not None
    node.destroy_node()
