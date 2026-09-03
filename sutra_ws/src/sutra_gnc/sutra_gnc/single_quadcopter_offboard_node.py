#!/usr/bin/env python3
"""
Project SUTRA — Phase 1: Butter-Smooth Dual-Mode Quadcopter Flight Node
=======================================================================
Author: Tech Lead Nikhil (Subsystem A Lead ⚡)

Features:
- Butter-smooth S-curve trajectory optimization (Linear Accel <= 2.0 m/s^2, Angular Accel <= 2.5 rad/s^2).
- Continuous momentum, aerodynamic glide damping, and altitude stabilization.
- Smooth yaw heading alignment with zero angular snap.
- Dual Mode: AUTONOMOUS DYNAMIC RING PURSUIT <-> SMOOTH MANUAL TELEOP.
- Deterministic 50Hz setpoint control rate (/uav_alpha/gazebo/command/twist).
"""

import math
import time
from typing import Tuple
from enum import Enum

import rclpy
from rclpy.executors import ExternalShutdownException
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
from geometry_msgs.msg import TwistStamped, PoseStamped, Pose, Twist
from nav_msgs.msg import Odometry
from std_msgs.msg import String


class FlightState(Enum):
    INIT = "INIT"
    TAKEOFF = "TAKEOFF"
    WAYPOINT_NAV = "WAYPOINT_NAV"
    HOVER = "HOVER"
    LAND = "LAND"


class ButterSmoothTrajectoryFilter:
    """
    Continuous S-curve trajectory and angular rate smoothing filter.
    Eliminates all robotic jerky snaps, providing cinematic, fluid quadcopter dynamics.
    """
    def __init__(
        self,
        max_speed: float = 3.0,
        max_accel: float = 2.0,
        max_jerk: float = 4.0,
        max_yaw_rate: float = 1.2,
        max_yaw_accel: float = 2.5
    ):
        self.max_speed = max_speed
        self.max_accel = max_accel
        self.max_jerk = max_jerk
        self.max_yaw_rate = max_yaw_rate
        self.max_yaw_accel = max_yaw_accel

        self.curr_vel = [0.0, 0.0, 0.0]
        self.curr_acc = [0.0, 0.0, 0.0]
        self.curr_wz = 0.0

    def filter_linear(
        self,
        target_vel: Tuple[float, float, float],
        dt: float = 0.02
    ) -> Tuple[float, float, float]:
        if dt <= 0.0:
            return target_vel

        out_vel = list(target_vel)
        speed = math.sqrt(sum(v * v for v in out_vel))
        if speed > self.max_speed:
            out_vel = [(v / speed) * self.max_speed for v in out_vel]

        des_acc = [(out_vel[i] - self.curr_vel[i]) / dt for i in range(3)]

        # Apply continuous jerk limiting
        for i in range(3):
            jerk = (des_acc[i] - self.curr_acc[i]) / dt
            if abs(jerk) > self.max_jerk:
                des_acc[i] = self.curr_acc[i] + math.copysign(self.max_jerk * dt, jerk)

        # Apply acceleration magnitude clamping
        acc_mag = math.sqrt(sum(a * a for a in des_acc))
        if acc_mag > self.max_accel:
            scale_a = self.max_accel / acc_mag
            des_acc = [a * scale_a for a in des_acc]

        # Integrate smoothly
        for i in range(3):
            self.curr_vel[i] += des_acc[i] * dt
            self.curr_acc[i] = des_acc[i]

        return (self.curr_vel[0], self.curr_vel[1], self.curr_vel[2])

    filter_velocity = filter_linear

    def filter_angular(self, target_wz: float, dt: float = 0.02) -> float:
        if dt <= 0.0:
            return target_wz

        clamped_wz = max(-self.max_yaw_rate, min(self.max_yaw_rate, target_wz))
        des_alpha = (clamped_wz - self.curr_wz) / dt
        if abs(des_alpha) > self.max_yaw_accel:
            des_alpha = math.copysign(self.max_yaw_accel, des_alpha)

        self.curr_wz += des_alpha * dt
        return self.curr_wz


DifferentiableTrajectoryFilter = ButterSmoothTrajectoryFilter


class SingleQuadcopterOffboardNode(Node):
    def __init__(self):
        super().__init__("sutra_single_quadcopter_offboard")

        # ── Parameters ────────────────────────────────────────────────────────
        self.declare_parameter("drone_id", "uav_alpha")
        self.declare_parameter("cruise_speed", 2.5)
        self.declare_parameter("takeoff_altitude", 4.0)
        self.declare_parameter("initial_mode", "MANUAL_TELEOP")

        self.drone_id = str(self.get_parameter("drone_id").value)
        self.cruise_speed = float(self.get_parameter("cruise_speed").value)
        self.takeoff_alt = float(self.get_parameter("takeoff_altitude").value)
        self.flight_mode = str(self.get_parameter("initial_mode").value)

        # Butter-Smooth Trajectory Filter
        self.traj_filter = ButterSmoothTrajectoryFilter(
            max_speed=self.cruise_speed,
            max_accel=2.0,
            max_jerk=4.0,
            max_yaw_rate=1.2,
            max_yaw_accel=2.5
        )

        # ── Flight State ──────────────────────────────────────────────────────
        self.curr_x = 0.0
        self.curr_y = 0.0
        self.curr_z = 0.0
        self.curr_yaw = 0.0
        self.has_pose = False

        # Moving Target Ring Pose
        self.ring_x = 8.0
        self.ring_y = 0.0
        self.ring_z = 4.0
        self.has_target = False

        # Manual Teleop Buffer & Glide Smoothing
        self.manual_target_vx = 0.0
        self.manual_target_vy = 0.0
        self.manual_target_vz = 0.0
        self.manual_target_wz = 0.0
        self.last_teleop_time = 0.0

        # ── Publishers ────────────────────────────────────────────────────────
        self.pub_twist = self.create_publisher(
            TwistStamped, f"/{self.drone_id}/gazebo/command/twist", 10
        )
        self.pub_pose_stamped = self.create_publisher(
            PoseStamped, f"/sutra/gnc/{self.drone_id}/pose_stamped", 10
        )

        # ── Subscriptions ─────────────────────────────────────────────────────
        self.sub_odom = self.create_subscription(
            Odometry, f"/model/{self.drone_id}/odometry", self._odom_callback, 10
        )
        self.sub_pose = self.create_subscription(
            Pose, f"/model/{self.drone_id}/pose", self._pose_callback, 10
        )
        self.sub_target_ring = self.create_subscription(
            PoseStamped, "/sutra/target_ring/pose", self._target_ring_callback, 10
        )
        self.sub_teleop_cmd = self.create_subscription(
            Twist, "/sutra/teleop/cmd_vel", self._teleop_cmd_callback, 10
        )
        self.sub_teleop_mode = self.create_subscription(
            String, "/sutra/teleop/mode", self._teleop_mode_callback, 10
        )
        self.sub_rtl = self.create_subscription(
            String, "/sutra/cmd/rtl", self._rtl_command_callback, 10
        )

        # ── 50Hz Deterministic Control Timer (20ms) ───────────────────────────
        self.timer = self.create_timer(0.02, self._control_loop_50hz)

        self.get_logger().info(
            f"🚀 SUTRA Butter-Smooth Quadcopter Flight Node Initialized [{self.drone_id}] in [{self.flight_mode}] @ 50Hz"
        )

    def _rtl_command_callback(self, msg: String):
        try:
            import json
            cmd_data = json.loads(msg.data)
            target_drone = cmd_data.get("drone_id", "ALL")
            if target_drone in ("ALL", self.drone_id):
                self.flight_mode = "EMERGENCY_RTL"
                self.get_logger().warn(f"🚨 EMERGENCY RTL ACTIVATED FOR {self.drone_id}!")
        except Exception as e:
            self.get_logger().error(f"Error handling RTL command: {e}")

    def _odom_callback(self, msg: Odometry):
        p = msg.pose.pose.position
        q = msg.pose.pose.orientation
        self.curr_x = p.x
        self.curr_y = p.y
        self.curr_z = p.z
        self.curr_yaw = math.atan2(
            2.0 * (q.w * q.z + q.x * q.y),
            1.0 - 2.0 * (q.y * q.y + q.z * q.z)
        )
        self.has_pose = True

    def _pose_callback(self, msg: Pose):
        if not self.has_pose:
            self.curr_x = msg.position.x
            self.curr_y = msg.position.y
            self.curr_z = msg.position.z
            qz = msg.orientation.z
            qw = msg.orientation.w
            self.curr_yaw = math.atan2(2.0 * (qw * qz), 1.0 - 2.0 * (qz * qz))

        ps = PoseStamped()
        ps.header.stamp = self.get_clock().now().to_msg()
        ps.header.frame_id = "world"
        ps.pose = msg
        self.pub_pose_stamped.publish(ps)

    def _target_ring_callback(self, msg: PoseStamped):
        self.ring_x = msg.pose.position.x
        self.ring_y = msg.pose.position.y
        self.ring_z = msg.pose.position.z
        self.has_target = True

    def _teleop_cmd_callback(self, msg: Twist):
        self.manual_target_vx = msg.linear.x
        self.manual_target_vy = msg.linear.y
        self.manual_target_vz = msg.linear.z
        self.manual_target_wz = msg.angular.z
        self.last_teleop_time = time.time()

    def _teleop_mode_callback(self, msg: String):
        self.flight_mode = msg.data
        self.get_logger().info(f"🔄 Mode Switch Event: [{self.flight_mode}]")

    def _control_loop_50hz(self):
        raw_vx, raw_vy, raw_vz, raw_wz = 0.0, 0.0, 0.0, 0.0

        if self.flight_mode == "EMERGENCY_RTL":
            dx = 0.0 - self.curr_x
            dy = 0.0 - self.curr_y
            dz = self.takeoff_alt - self.curr_z
            dist_2d = math.sqrt(dx * dx + dy * dy)
            if dist_2d > 0.5:
                raw_vx = (dx / dist_2d) * min(self.cruise_speed, dist_2d)
                raw_vy = (dy / dist_2d) * min(self.cruise_speed, dist_2d)
                raw_vz = min(1.0, max(-1.0, dz))
            else:
                raw_vx, raw_vy = 0.0, 0.0
                raw_vz = -0.8 if self.curr_z > 0.2 else 0.0

        elif self.flight_mode == "MANUAL_TELEOP":
            # Direct heading-referenced manual control with glide coasting
            cy = math.cos(self.curr_yaw)
            sy = math.sin(self.curr_yaw)

            # Check if teleop input was received within last 0.5s
            if (time.time() - self.last_teleop_time) < 0.5:
                body_vx = self.manual_target_vx
                body_vy = self.manual_target_vy
                raw_vz = self.manual_target_vz
                raw_wz = self.manual_target_wz

                raw_vx = body_vx * cy - body_vy * sy
                raw_vy = body_vx * sy + body_vy * cy
            else:
                # Aerodynamic coast to gentle hover
                raw_vx, raw_vy, raw_vz, raw_wz = 0.0, 0.0, 0.0, 0.0

        else:
            # ── AUTONOMOUS DYNAMIC AERIAL RING PURSUIT MODE ───────────────────
            if self.curr_z < (self.takeoff_alt - 0.5):
                raw_vz = min(1.2, (self.takeoff_alt - self.curr_z) * 1.0)
            else:
                dx = self.ring_x - self.curr_x
                dy = self.ring_y - self.curr_y
                dz = self.ring_z - self.curr_z
                dist_3d = math.sqrt(dx * dx + dy * dy + dz * dz)

                if dist_3d > 0.1:
                    speed = min(self.cruise_speed, dist_3d * 1.2)
                    raw_vx = (dx / dist_3d) * speed
                    raw_vy = (dy / dist_3d) * speed
                    raw_vz = (dz / dist_3d) * speed

                    # Butter-smooth yaw alignment with target heading
                    target_yaw = math.atan2(dy, dx)
                    yaw_err = target_yaw - self.curr_yaw
                    yaw_err = math.atan2(math.sin(yaw_err), math.cos(yaw_err))
                    raw_wz = max(-1.0, min(1.0, yaw_err * 1.5))

        # ── Apply S-Curve Continuous Filtering ────────────────────────────────
        smooth_vx, smooth_vy, smooth_vz = self.traj_filter.filter_linear(
            (raw_vx, raw_vy, raw_vz), dt=0.02
        )
        smooth_wz = self.traj_filter.filter_angular(raw_wz, dt=0.02)

        # ── Publish 50Hz Twist Command ────────────────────────────────────────
        cmd = TwistStamped()
        cmd.header.stamp = self.get_clock().now().to_msg()
        cmd.header.frame_id = "base_link"
        cmd.twist.linear.x = float(smooth_vx)
        cmd.twist.linear.y = float(smooth_vy)
        cmd.twist.linear.z = float(smooth_vz)
        cmd.twist.angular.z = float(smooth_wz)
        self.pub_twist.publish(cmd)


def main(args=None):
    rclpy.init(args=args)
    node = SingleQuadcopterOffboardNode()
    try:
        rclpy.spin(node)
    except (KeyboardInterrupt, ExternalShutdownException):
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
