#!/usr/bin/env python3
"""
Project SUTRA — Subsystem A: Quadcopter Motor Failure Fallback & Spin Stabilization Node
========================================================================================
Author: Tech Lead Nikhil (Subsystem A)

Features:
- Handles Quadcopter single/dual motor thrust failure detection via angular velocity deviation and motor RPM loss.
- Implements active spin stabilization (constant yaw rate damping, roll/pitch level command).
- Controls emergency descent rate at 1.2 m/s.
- Triggers automated Emergency Return-to-Launch (RTL) dispatch when rotor power is degraded or altitude falls below safety threshold.
"""

import json
import math
import time
from typing import Dict, List, Tuple, Optional

import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy
from geometry_msgs.msg import Twist, TwistStamped
from nav_msgs.msg import Odometry
from sensor_msgs.msg import Imu
from std_msgs.msg import String, Float32MultiArray, Bool


class MotorFailureFallbackController:
    """
    Algorithmic controller for motor failure detection, spin stabilization,
    controlled emergency descent, and Emergency Return-To-Launch (RTL) dispatch.
    Enhanced with WaveLander 2-phase decoupled descent control (arXiv:2607.01281):
    - Approach Phase (z > 1.5m): Controlled 1.2 m/s descent with active spin damping.
    - Touchdown Phase (z <= 1.5m): Ground-effect compensated gentle touchdown (0.35 m/s).
    """

    def __init__(
        self,
        drone_id: str = "uav_alpha",
        num_rotors: int = 6,
        descent_rate: float = 1.2,
        safety_altitude_threshold: float = 2.0,
        home_position: Tuple[float, float, float] = (0.0, 0.0, 0.0),
        nominal_rpm: float = 1000.0,
        failure_threshold_rpm: float = 300.0,
        max_yaw_rate_threshold: float = 1.0,
        spin_damping_gain: float = 0.8,
        enable_wavelander_two_phase: bool = True,
        touchdown_altitude_threshold: float = 1.5,
        touchdown_descent_rate: float = 0.35
    ):
        self.drone_id = drone_id
        self.num_rotors = int(num_rotors)
        self.descent_rate = max(0.1, float(descent_rate))  # Controlled 1.2 m/s emergency descent
        self.safety_altitude_threshold = float(safety_altitude_threshold)
        self.home_position = home_position
        self.nominal_rpm = nominal_rpm
        self.failure_threshold_rpm = failure_threshold_rpm
        self.max_yaw_rate_threshold = max_yaw_rate_threshold
        self.spin_damping_gain = spin_damping_gain
        self.enable_wavelander_two_phase = enable_wavelander_two_phase
        self.touchdown_altitude_threshold = touchdown_altitude_threshold
        self.touchdown_descent_rate = touchdown_descent_rate

        # Sensor state variables
        self.current_pose: Tuple[float, float, float] = (0.0, 0.0, 5.0)
        self.current_vel: Tuple[float, float, float] = (0.0, 0.0, 0.0)
        self.angular_vel: Tuple[float, float, float] = (0.0, 0.0, 0.0)  # wx, wy, wz
        self.motor_rpms: List[float] = [nominal_rpm] * self.num_rotors

        # Failure & Safety Flags
        self.single_motor_failure: bool = False
        self.dual_motor_failure: bool = False
        self.failure_detected: bool = False
        self.spin_stabilized: bool = True
        self.emergency_descent_active: bool = False
        self.rtl_triggered: bool = False
        self.geofence_breached: bool = False
        self.home_arrived: bool = False
        self.fault_tolerant_active: bool = False

        self.rotor_power_level: float = 1.0  # 1.0 = 100% nominal power

    def update_imu(self, wx: float, wy: float, wz: float):
        """
        Updates IMU angular velocity reading and checks for severe spin instability.
        """
        self.angular_vel = (float(wx), float(wy), float(wz))
        ang_vel_mag = math.sqrt(wx * wx + wy * wy + wz * wz)

        if abs(wz) > self.max_yaw_rate_threshold or ang_vel_mag > 1.5:
            self.failure_detected = True
            self.spin_stabilized = False
        else:
            self.spin_stabilized = True

    def update_motor_rpms(self, rpms: List[float]):
        """
        Updates motor RPM array and detects single/dual rotor failures.
        Supports Quadcopter (4), Hexacopter (6), or Octacopter (8) airframes.
        """
        if not rpms or len(rpms) < 4:
            return

        n = len(rpms)
        self.num_rotors = n
        self.motor_rpms = [float(r) for r in rpms]
        failed_count = sum(1 for r in self.motor_rpms if r < self.failure_threshold_rpm)

        total_rpm = sum(self.motor_rpms)
        self.rotor_power_level = total_rpm / (float(n) * self.nominal_rpm)

        if failed_count == 1:
            self.single_motor_failure = True
            self.dual_motor_failure = False
            self.failure_detected = True
            if n >= 6:
                # Hexacopter & Octacopter have physical rotor redundancy (retains controlled flight)
                self.fault_tolerant_active = True
                self.spin_stabilized = True
        elif failed_count >= 2:
            self.single_motor_failure = False
            self.dual_motor_failure = True
            self.failure_detected = True
            if n >= 8 and failed_count == 2:
                # Octacopter can tolerate dual motor failure with controlled authority
                self.fault_tolerant_active = True
                self.spin_stabilized = True
            else:
                self.fault_tolerant_active = False
        elif self.rotor_power_level < 0.75:
            self.failure_detected = True
        else:
            self.single_motor_failure = False
            self.dual_motor_failure = False
            self.failure_detected = False
            self.fault_tolerant_active = False

    def update_odometry(self, x: float, y: float, z: float, vx: float = 0.0, vy: float = 0.0, vz: float = 0.0):
        """
        Updates drone 3D position and velocity from odometry.
        Checks altitude safety thresholds and geofence status.
        """
        self.current_pose = (float(x), float(y), float(z))
        self.current_vel = (float(vx), float(vy), float(vz))

        # Check altitude drop or power degradation to trigger RTL
        if self.failure_detected or self.rotor_power_level < 0.75 or z < self.safety_altitude_threshold:
            if not self.rtl_triggered:
                self.trigger_rtl()

        # Check home arrival
        dist_to_home = math.sqrt((x - self.home_position[0])**2 + (y - self.home_position[1])**2)
        if self.rtl_triggered and dist_to_home < 0.5 and z < 0.5:
            self.home_arrived = True

    def trigger_rtl(self):
        """
        Triggers Emergency Return-To-Launch (RTL) mode.
        """
        self.rtl_triggered = True
        self.emergency_descent_active = True

    def compute_fallback_command(self) -> Tuple[float, float, float, float]:
        """
        Computes command twist vector (cmd_vx, cmd_vy, cmd_vz, cmd_yaw_rate).
        - Roll/pitch leveling command for horizontal attitude stabilization
        - Constant yaw rate damping: cmd_yaw_rate = -K_yaw * wz
        - Controlled emergency descent: cmd_vz = -1.2 m/s
        - RTL navigation toward home coordinates
        """
        w_x, w_y, w_z = self.angular_vel
        px, py, pz = self.current_pose
        hx, hy, hz = self.home_position

        # Active spin damping
        cmd_yaw_rate = -self.spin_damping_gain * w_z

        # Controlled emergency descent rate:
        # WaveLander 2-Phase Decoupled Emergency Descent (arXiv:2607.01281)
        if pz > self.touchdown_altitude_threshold:
            cmd_vz = -self.descent_rate  # Phase 1: High-efficiency Approach Descent
        elif pz > 0.1:
            if self.enable_wavelander_two_phase:
                # Phase 2: Ground-effect compensated gentle touchdown
                alpha = max(0.0, min(1.0, (pz - 0.1) / max(0.1, self.touchdown_altitude_threshold - 0.1)))
                cmd_vz = -(self.touchdown_descent_rate + alpha * (self.descent_rate - self.touchdown_descent_rate))
            else:
                cmd_vz = -self.descent_rate
        else:
            cmd_vz = 0.0

        # Roll/Pitch leveling & horizontal navigation
        if self.rtl_triggered and not self.home_arrived:
            dx = hx - px
            dy = hy - py
            dist_horiz = math.sqrt(dx * dx + dy * dy)
            if dist_horiz > 0.1:
                desired_speed = min(2.0, dist_horiz)
                cmd_vx = (dx / dist_horiz) * desired_speed
                cmd_vy = (dy / dist_horiz) * desired_speed
            else:
                cmd_vx = 0.0
                cmd_vy = 0.0
        else:
            # Level roll/pitch horizontal command
            cmd_vx = 0.0
            cmd_vy = 0.0

        return cmd_vx, cmd_vy, cmd_vz, cmd_yaw_rate

    def get_status_summary(self) -> dict:
        """
        Returns JSON-serializable status dictionary with multi-rotor fault-tolerance telemetry.
        """
        if self.home_arrived:
            state = "RTL_ARRIVED"
        elif self.rtl_triggered and self.fault_tolerant_active:
            state = "FAULT_TOLERANT_RTL"
        elif self.rtl_triggered:
            state = "RTL_DISPATCH"
        elif self.failure_detected and not self.spin_stabilized:
            state = "ACTIVE_SPIN_STABILIZATION"
        elif self.failure_detected and self.fault_tolerant_active:
            state = "FAULT_TOLERANT_DEGRADED"
        elif self.failure_detected:
            state = "EMERGENCY_DESCENT"
        else:
            state = "NOMINAL"

        drone_type = "hexacopter" if self.num_rotors == 6 else ("octacopter" if self.num_rotors >= 8 else "quadcopter")

        return {
            "drone_id": self.drone_id,
            "drone_type": drone_type,
            "num_rotors": self.num_rotors,
            "state": state,
            "failure_detected": self.failure_detected,
            "fault_tolerant_active": self.fault_tolerant_active,
            "single_motor_failure": self.single_motor_failure,
            "dual_motor_failure": self.dual_motor_failure,
            "spin_stabilized": self.spin_stabilized,
            "emergency_descent_active": self.emergency_descent_active,
            "rtl_triggered": self.rtl_triggered,
            "rotor_power_level": round(self.rotor_power_level, 3),
            "descent_rate_m_s": self.descent_rate,
            "altitude_m": round(self.current_pose[2], 2)
        }


class MotorFailureFallbackNode(Node):
    """
    ROS 2 Node for multi-rotor (hexacopter/octacopter/quadcopter) motor failure detection,
    spin stabilization, and emergency descent.
    """

    def __init__(self):
        super().__init__("motor_failure_fallback_node")

        self.declare_parameter("drone_id", "uav_alpha")
        self.declare_parameter("num_rotors", 6)
        self.declare_parameter("descent_rate", 1.2)
        self.declare_parameter("safety_altitude_threshold", 2.0)
        self.declare_parameter("home_x", 0.0)
        self.declare_parameter("home_y", 0.0)
        self.declare_parameter("home_z", 0.0)

        drone_id = self.get_parameter("drone_id").value
        num_rotors = int(self.get_parameter("num_rotors").value)
        descent_rate = float(self.get_parameter("descent_rate").value)
        safety_alt = float(self.get_parameter("safety_altitude_threshold").value)
        hx = float(self.get_parameter("home_x").value)
        hy = float(self.get_parameter("home_y").value)
        hz = float(self.get_parameter("home_z").value)

        self.controller = MotorFailureFallbackController(
            drone_id=drone_id,
            num_rotors=num_rotors,
            descent_rate=descent_rate,
            safety_altitude_threshold=safety_alt,
            home_position=(hx, hy, hz)
        )

        # Publishers
        self.pub_cmd_vel = self.create_publisher(
            Twist, f"/{drone_id}/cmd_vel", 10
        )
        self.pub_gazebo_twist = self.create_publisher(
            TwistStamped, f"/{drone_id}/gazebo/command/twist", 10
        )
        self.pub_status = self.create_publisher(
            String, f"/{drone_id}/rtl_status", 10
        )

        # Sensor Data QoS (Best-Effort) per ros2-gazebo-industry standard
        sensor_qos = QoSProfile(depth=5, reliability=ReliabilityPolicy.BEST_EFFORT)

        # Subscriptions
        self.sub_odom = self.create_subscription(
            Odometry, f"/{drone_id}/odometry", self._odom_cb, sensor_qos
        )
        self.sub_odom_fallback = self.create_subscription(
            Odometry, f"/model/{drone_id}/odometry", self._odom_cb, sensor_qos
        )
        self.sub_imu = self.create_subscription(
            Imu, f"/{drone_id}/imu", self._imu_cb, sensor_qos
        )
        self.sub_motor_rpm = self.create_subscription(
            Float32MultiArray, f"/{drone_id}/motor_rpm", self._motor_rpm_cb, 10
        )
        self.sub_rtl_trigger = self.create_subscription(
            String, f"/{drone_id}/rtl_trigger", self._rtl_trigger_cb, 10
        )

        # 50Hz Control Loop Timer
        self.timer = self.create_timer(0.02, self._control_loop)
        self.get_logger().info(
            f"🚁 Motor Failure Fallback Node Initialized [{drone_id}] | Emergency Descent Rate: {descent_rate:.1f} m/s"
        )

    def _odom_cb(self, msg: Odometry):
        p = msg.pose.pose.position
        v = msg.twist.twist.linear
        self.controller.update_odometry(p.x, p.y, p.z, v.x, v.y, v.z)

    def _imu_cb(self, msg: Imu):
        w = msg.angular_velocity
        self.controller.update_imu(w.x, w.y, w.z)

    def _motor_rpm_cb(self, msg: Float32MultiArray):
        self.controller.update_motor_rpms(list(msg.data))

    def _rtl_trigger_cb(self, msg: String):
        if "RTL" in msg.data.upper() or "TRIGGER" in msg.data.upper():
            self.controller.trigger_rtl()

    def _control_loop(self):
        cmd_vx, cmd_vy, cmd_vz, cmd_yaw_rate = self.controller.compute_fallback_command()

        twist = Twist()
        twist.linear.x = cmd_vx
        twist.linear.y = cmd_vy
        twist.linear.z = cmd_vz
        twist.angular.z = cmd_yaw_rate

        self.pub_cmd_vel.publish(twist)

        # Publish TwistStamped for Gazebo Sim bridge
        ts_msg = TwistStamped()
        ts_msg.header.stamp = self.get_clock().now().to_msg()
        ts_msg.header.frame_id = "base_link"
        ts_msg.twist = twist
        self.pub_gazebo_twist.publish(ts_msg)

        status_dict = self.controller.get_status_summary()
        status_msg = String()
        status_msg.data = json.dumps(status_dict)
        self.pub_status.publish(status_msg)


def main(args=None):
    rclpy.init(args=args)
    node = MotorFailureFallbackNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
