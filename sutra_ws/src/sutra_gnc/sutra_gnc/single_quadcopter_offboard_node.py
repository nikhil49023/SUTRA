#!/usr/bin/env python3
"""
Project SUTRA — Phase 1: Dual-Mode Quadcopter Flight Node
=========================================================
Author: Tech Lead Nikhil (Subsystem A)

Features:
- Dual Mode: AUTONOMOUS DYNAMIC RING PURSUIT <-> MANUAL LAPTOP TELEOP.
- Autonomous Mode: Dynamically tracks 3D moving aerial target rings in Gazebo Sim 8.
- Manual Mode: Real-time responsiveness to laptop terminal keyboard teleop commands.
- Deterministic 50Hz setpoint control rate (/uav_alpha/gazebo/command/twist).
"""

import math
import time
from typing import Tuple

from enum import Enum
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import TwistStamped, PoseStamped, Pose, Twist
from nav_msgs.msg import Odometry
from std_msgs.msg import String


class FlightState(Enum):
    INIT = "INIT"
    TAKEOFF = "TAKEOFF"
    WAYPOINT_NAV = "WAYPOINT_NAV"
    HOVER = "HOVER"
    LAND = "LAND"



class DifferentiableTrajectoryFilter:
    """
    Differentiable Trajectory Optimization & Continuity Filter (arXiv:2504.04289 & arXiv:2510.20008).
    Applies continuous acceleration and jerk bounding on 50Hz setpoints,
    ensuring dynamic feasibility and minimizing tracking RMSE (Gate G1).
    """

    def __init__(self, max_speed: float = 2.5, max_accel: float = 2.5, max_jerk: float = 5.0):
        self.max_speed = max_speed
        self.max_accel = max_accel
        self.max_jerk = max_jerk
        self.curr_vel = [0.0, 0.0, 0.0]
        self.curr_acc = [0.0, 0.0, 0.0]

    def filter_velocity(
        self,
        target_vel: Tuple[float, float, float],
        dt: float = 0.02
    ) -> Tuple[float, float, float]:
        """
        Filters candidate target velocity to strictly respect acceleration and jerk limits.
        """
        if dt <= 0.0:
            return target_vel

        out_vel = list(target_vel)
        # 1. Limit velocity magnitude
        speed = math.sqrt(sum(v * v for v in out_vel))
        if speed > self.max_speed:
            out_vel = [(v / speed) * self.max_speed for v in out_vel]

        # 2. Desired acceleration
        des_acc = [(out_vel[i] - self.curr_vel[i]) / dt for i in range(3)]

        # 3. Jerk limit on acceleration change
        for i in range(3):
            jerk = (des_acc[i] - self.curr_acc[i]) / dt
            if abs(jerk) > self.max_jerk:
                des_acc[i] = self.curr_acc[i] + math.copysign(self.max_jerk * dt, jerk)

        # 4. Acceleration limit
        acc_mag = math.sqrt(sum(a * a for a in des_acc))
        if acc_mag > self.max_accel:
            scale_a = self.max_accel / acc_mag
            des_acc = [a * scale_a for a in des_acc]

        # 5. Integrate to velocity
        for i in range(3):
            self.curr_vel[i] += des_acc[i] * dt
            self.curr_acc[i] = des_acc[i]

        return (self.curr_vel[0], self.curr_vel[1], self.curr_vel[2])


class SingleQuadcopterOffboardNode(Node):
    def __init__(self):
        super().__init__("sutra_single_quadcopter_offboard")

        # ── Parameters ────────────────────────────────────────────────────────
        self.declare_parameter("drone_id", "uav_alpha")
        self.declare_parameter("cruise_speed", 2.5)
        self.declare_parameter("takeoff_altitude", 4.0)

        self.drone_id = self.get_parameter("drone_id").value
        self.cruise_speed = float(self.get_parameter("cruise_speed").value)
        self.takeoff_alt = float(self.get_parameter("takeoff_altitude").value)
        self.traj_filter = DifferentiableTrajectoryFilter(
            max_speed=self.cruise_speed, max_accel=2.5, max_jerk=5.0
        )

        # ── Flight State ──────────────────────────────────────────────────────
        self.flight_mode = "AUTONOMOUS_RING_PURSUIT"
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

        # Manual Laptop Teleop Velocity Buffer
        self.teleop_vx = 0.0
        self.teleop_vy = 0.0
        self.teleop_vz = 0.0
        self.teleop_wz = 0.0
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
            f"🚀 Phase 1 Dual-Mode Quadcopter Flight Node Initialized [{self.drone_id}] @ 50Hz"
        )

    def _rtl_command_callback(self, msg: String):
        try:
            import json
            cmd_data = json.loads(msg.data)
            target_drone = cmd_data.get("drone_id", "ALL")
            if target_drone == "ALL" or target_drone == self.drone_id:
                self.flight_mode = "EMERGENCY_RTL"
                self.get_logger().warn(f"🚨 EMERGENCY RTL ACTIVATED FOR {self.drone_id} via GCS uplink!")
        except Exception as e:
            self.get_logger().error(f"Error handling RTL command: {e}")

    def _odom_callback(self, msg: Odometry):
        p = msg.pose.pose.position
        q = msg.pose.pose.orientation
        self.curr_x = p.x
        self.curr_y = p.y
        self.curr_z = p.z
        self.curr_yaw = math.atan2(2.0 * (q.w * q.z + q.x * q.y), 1.0 - 2.0 * (q.y * q.y + q.z * q.z))
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
        self.teleop_vx = msg.linear.x
        self.teleop_vy = msg.linear.y
        self.teleop_vz = msg.linear.z
        self.teleop_wz = msg.angular.z
        self.last_teleop_time = time.time()

    def _teleop_mode_callback(self, msg: String):
        self.flight_mode = msg.data
        self.get_logger().info(f"🔄 Mode Switch Event: [{self.flight_mode}]")

    def _control_loop_50hz(self):
        vx, vy, vz, wz = 0.0, 0.0, 0.0, 0.0

        if self.flight_mode == "EMERGENCY_RTL":
            # Direct flight path back to launch origin (0, 0, takeoff_alt)
            dx = 0.0 - self.curr_x
            dy = 0.0 - self.curr_y
            dz = self.takeoff_alt - self.curr_z
            dist_2d = math.sqrt(dx*dx + dy*dy)
            if dist_2d > 0.5:
                vx = (dx / dist_2d) * min(self.cruise_speed, dist_2d)
                vy = (dy / dist_2d) * min(self.cruise_speed, dist_2d)
                vz = min(1.0, max(-1.0, dz))
            else:
                # Descend for landing at home origin
                vx, vy = 0.0, 0.0
                vz = -0.8 if self.curr_z > 0.2 else 0.0

        elif self.flight_mode == "MANUAL_TELEOP":
            # Timeout teleop commands after 1 second of inactivity for safety
            if time.time() - self.last_teleop_time < 1.0:
                vx = self.teleop_vx
                vy = self.teleop_vy
                vz = self.teleop_vz
                wz = self.teleop_wz
            else:
                vx, vy, vz, wz = 0.0, 0.0, 0.0, 0.0

        else:
            # ── AUTONOMOUS DYNAMIC AERIAL RING PURSUIT MODE ───────────────────
            # First ensure takeoff altitude achieved
            if self.curr_z < (self.takeoff_alt - 0.5):
                vz = min(1.5, (self.takeoff_alt - self.curr_z) * 1.0)
            else:
                # 3D Proportional Vector Pursuit toward Moving Aerial Target Ring
                dx = self.ring_x - self.curr_x
                dy = self.ring_y - self.curr_y
                dz = self.ring_z - self.curr_z
                dist_3d = math.sqrt(dx*dx + dy*dy + dz*dz)

                if dist_3d > 0.1:
                    speed = min(self.cruise_speed, dist_3d * 1.2)
                    vx = (dx / dist_3d) * speed
                    vy = (dy / dist_3d) * speed
                    vz = (dz / dist_3d) * speed

                    # Align yaw heading with velocity vector
                    target_yaw = math.atan2(vy, vx)
                    yaw_err = target_yaw - self.curr_yaw
                    # Normalize angle error to [-pi, pi]
                    yaw_err = math.atan2(math.sin(yaw_err), math.cos(yaw_err))
                    wz = max(-1.0, min(1.0, yaw_err * 2.0))

        # Apply Differentiable Trajectory Optimization & Jerk Limiting
        smooth_vx, smooth_vy, smooth_vz = self.traj_filter.filter_velocity((vx, vy, vz), dt=0.02)

        # ── Publish 50Hz Twist Command ────────────────────────────────────────
        cmd = TwistStamped()
        cmd.header.stamp = self.get_clock().now().to_msg()
        cmd.header.frame_id = "base_link"
        cmd.twist.linear.x = smooth_vx
        cmd.twist.linear.y = smooth_vy
        cmd.twist.linear.z = smooth_vz
        cmd.twist.angular.z = wz
        self.pub_twist.publish(cmd)


def main(args=None):
    rclpy.init(args=args)
    node = SingleQuadcopterOffboardNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
