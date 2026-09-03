#!/usr/bin/env python3
"""
Test Suite: Quadcopter Wind Gust Response & Position Recovery (Subsystem A)
===========================================================================
Tests quadcopter velocity compensation and position drift recovery under 12.0 m/s wind gusts.
"""

import math
import pytest
import rclpy


class WindDisturbanceSimulator:
    """
    Simulates quadcopter aerodynamic drag and closed-loop position/velocity control
    with integral wind compensation under high-velocity turbulent wind gusts (12.0 m/s peak gust).
    """

    def __init__(
        self,
        target_pos=(10.0, 5.0, 5.0),
        drag_coeff=0.15,
        mass=1.5,
        kp_pos=4.0,
        ki_pos=2.5,
        kd_vel=2.8
    ):
        self.target_pos = list(target_pos)
        self.pos = list(target_pos)
        self.vel = [0.0, 0.0, 0.0]
        self.integral_err = [0.0, 0.0, 0.0]
        self.drag_coeff = drag_coeff
        self.mass = mass
        self.kp_pos = kp_pos
        self.ki_pos = ki_pos
        self.kd_vel = kd_vel

    def step(self, wind_vel: tuple, dt: float) -> tuple:
        """
        Executes one physics & control step under wind disturbance.
        :param wind_vel: (wx, wy, wz) wind velocity vector (m/s)
        :param dt: time step (s)
        :return: (pos, vel, comp_accel)
        """
        wx, wy, wz = wind_vel

        # Relative air velocity
        rel_vx = wx - self.vel[0]
        rel_vy = wy - self.vel[1]
        rel_vz = wz - self.vel[2]

        # Aerodynamic drag acceleration: a_drag = (c_drag / m) * v_rel * |v_rel|
        rel_speed = math.sqrt(rel_vx**2 + rel_vy**2 + rel_vz**2)
        drag_ax = (self.drag_coeff / self.mass) * rel_vx * rel_speed
        drag_ay = (self.drag_coeff / self.mass) * rel_vy * rel_speed
        drag_az = (self.drag_coeff / self.mass) * rel_vz * rel_speed

        # PID Position/Velocity feedback control with Integral Wind Estimation
        err_x = self.target_pos[0] - self.pos[0]
        err_y = self.target_pos[1] - self.pos[1]
        err_z = self.target_pos[2] - self.pos[2]

        self.integral_err[0] += err_x * dt
        self.integral_err[1] += err_y * dt
        self.integral_err[2] += err_z * dt

        ctrl_ax = self.kp_pos * err_x + self.ki_pos * self.integral_err[0] - self.kd_vel * self.vel[0]
        ctrl_ay = self.kp_pos * err_y + self.ki_pos * self.integral_err[1] - self.kd_vel * self.vel[1]
        ctrl_az = self.kp_pos * err_z + self.ki_pos * self.integral_err[2] - self.kd_vel * self.vel[2]

        # Net acceleration
        net_ax = drag_ax + ctrl_ax
        net_ay = drag_ay + ctrl_ay
        net_az = drag_az + ctrl_az

        # Integration
        self.vel[0] += net_ax * dt
        self.vel[1] += net_ay * dt
        self.vel[2] += net_az * dt

        self.pos[0] += self.vel[0] * dt
        self.pos[1] += self.vel[1] * dt
        self.pos[2] += self.vel[2] * dt

        return tuple(self.pos), tuple(self.vel), (ctrl_ax, ctrl_ay, ctrl_az)


@pytest.fixture(scope="module", autouse=True)
def init_rclpy():
    if not rclpy.ok():
        rclpy.init()
    yield
    if rclpy.ok():
        rclpy.shutdown()


def test_wind_gust_magnitude_and_direction():
    """
    Verifies 12.0 m/s wind gust component breakdown at 45-degree horizontal angle.
    """
    magnitude = 12.0
    angle_rad = math.pi / 4.0  # 45 degrees
    wind_x = magnitude * math.cos(angle_rad)
    wind_y = magnitude * math.sin(angle_rad)
    wind_z = 2.5  # Vertical updraft

    computed_mag = math.sqrt(wind_x**2 + wind_y**2)
    assert pytest.approx(computed_mag, 1e-4) == 12.0
    assert pytest.approx(wind_x, 1e-4) == pytest.approx(wind_y, 1e-4)


def test_velocity_compensation_under_12m_s_wind():
    """
    Tests quadcopter velocity compensation under continuous 12.0 m/s wind gusts.
    Verifies that the control acceleration opposes the wind force direction.
    """
    sim = WindDisturbanceSimulator(target_pos=(0.0, 0.0, 5.0))
    wind_12ms = (12.0 * math.cos(math.pi / 4.0), 12.0 * math.sin(math.pi / 4.0), 2.5)

    dt = 0.02
    ctrl_accels = []

    for _ in range(50):  # First 1 second of exposure
        pos, vel, ctrl_accel = sim.step(wind_12ms, dt)
        ctrl_accels.append(ctrl_accel)

    # Final control acceleration in x and y should be negative (opposing positive wind gust)
    final_ax, final_ay, _ = ctrl_accels[-1]

    # Verify controller generates negative opposing thrust/tilt compensation
    assert final_ax < 0.0, f"Control acceleration ax={final_ax:.3f} failed to oppose wind!"
    assert final_ay < 0.0, f"Control acceleration ay={final_ay:.3f} failed to oppose wind!"


def test_position_drift_recovery_after_wind_step():
    """
    Simulates sudden 12.0 m/s wind gust hit and asserts position drift recovery.
    Checks that position error returns to within 0.50m of target waypoint.
    """
    target = (10.0, 10.0, 5.0)
    sim = WindDisturbanceSimulator(target_pos=target)
    wind_12ms = (12.0 * math.cos(math.pi / 4.0), 12.0 * math.sin(math.pi / 4.0), 1.5)

    dt = 0.02
    max_drift_observed = 0.0

    # Step simulation over 10 seconds (500 steps)
    for _ in range(500):
        pos, vel, _ = sim.step(wind_12ms, dt)
        drift = math.sqrt((pos[0] - target[0])**2 + (pos[1] - target[1])**2 + (pos[2] - target[2])**2)
        if drift > max_drift_observed:
            max_drift_observed = drift

    final_pos = sim.pos
    final_drift = math.sqrt((final_pos[0] - target[0])**2 + (final_pos[1] - target[1])**2 + (final_pos[2] - target[2])**2)

    # Initial drift occurred but controller stabilized position drift error < 0.50m
    assert max_drift_observed > 0.10, "Expected initial drift under 12 m/s wind gust"
    assert final_drift < 0.50, f"Position drift recovery failed! Final drift = {final_drift:.3f}m >= 0.50m"
