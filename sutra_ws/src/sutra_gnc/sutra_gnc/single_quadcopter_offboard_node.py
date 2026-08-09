#!/usr/bin/env python3
"""
Project SUTRA — Phase 1: Single Quadcopter Autonomous Flight & Navigation Node
================================================================================
Author: Tech Lead Nikhil (Subsystem A)

Features:
- Deterministic 50Hz closed-loop velocity setpoint publishing (TwistStamped).
- Non-blocking state machine FSM: TAKEOFF -> WAYPOINT_NAV -> HOVER -> LAND.
- Proportional guidance law for smooth 3D waypoint navigation.
- Broadcasts /sutra/gnc/uav_alpha/pose_stamped for perception and GCS telemetries.
"""

import math
import time
from enum import Enum
from typing import List, Tuple

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import TwistStamped, PoseStamped, Pose
from sensor_msgs.msg import Imu


class FlightState(Enum):
    INIT = "INIT"
    TAKEOFF = "TAKEOFF"
    WAYPOINT_NAV = "WAYPOINT_NAV"
    HOVER = "HOVER"
    LAND = "LAND"


class SingleQuadcopterOffboardNode(Node):
    def __init__(self):
        super().__init__("sutra_single_quadcopter_offboard")

        # ── Parameters ────────────────────────────────────────────────────────
        self.declare_parameter("drone_id", "uav_alpha")
        self.declare_parameter("cruise_speed", 2.5)
        self.declare_parameter("takeoff_altitude", 5.0)

        self.drone_id = self.get_parameter("drone_id").value
        self.cruise_speed = float(self.get_parameter("cruise_speed").value)
        self.takeoff_alt = float(self.get_parameter("takeoff_altitude").value)

        # ── State Variables ───────────────────────────────────────────────────
        self.state = FlightState.INIT
        self.curr_x = 0.0
        self.curr_y = 0.0
        self.curr_z = 0.0
        self.has_pose = False

        # 3D Mission Waypoints (X, Y, Z in meters)
        self.waypoints: List[Tuple[float, float, float]] = [
            (0.0, 0.0, self.takeoff_alt),
            (10.0, 0.0, self.takeoff_alt),
            (10.0, 10.0, self.takeoff_alt),
            (0.0, 10.0, self.takeoff_alt),
            (0.0, 0.0, self.takeoff_alt),
        ]
        self.current_wp_idx = 0
        self.hover_start_time = 0.0

        # ── Publishers ────────────────────────────────────────────────────────
        self.pub_twist = self.create_publisher(
            TwistStamped, f"/{self.drone_id}/gazebo/command/twist", 10
        )
        self.pub_pose_stamped = self.create_publisher(
            PoseStamped, f"/sutra/gnc/{self.drone_id}/pose_stamped", 10
        )

        # ── Subscriptions ─────────────────────────────────────────────────────
        self.sub_pose = self.create_subscription(
            Pose, f"/model/{self.drone_id}/pose", self._pose_callback, 10
        )
        self.sub_imu = self.create_subscription(
            Imu, f"/{self.drone_id}/imu", self._imu_callback, 10
        )

        # ── 50Hz Control Loop Timer (20ms) ────────────────────────────────────
        self.timer = self.create_timer(0.02, self._control_loop_50hz)

        self.get_logger().info(
            f"🚀 Phase 1 Single Quadcopter Offboard Node Initialized [{self.drone_id}] @ 50Hz"
        )
        self.state = FlightState.TAKEOFF

    def _pose_callback(self, msg: Pose):
        self.curr_x = msg.position.x
        self.curr_y = msg.position.y
        self.curr_z = msg.position.z
        self.has_pose = True

        # Publish PoseStamped for downstream Subsystem C/D nodes
        ps = PoseStamped()
        ps.header.stamp = self.get_clock().now().to_msg()
        ps.header.frame_id = "world"
        ps.pose = msg
        self.pub_pose_stamped.publish(ps)

    def _imu_callback(self, msg: Imu):
        pass  # IMU feedback ready for EKF2 / VIO filtering in Phase 2

    def _control_loop_50hz(self):
        vx, vy, vz = 0.0, 0.0, 0.0

        if self.state == FlightState.TAKEOFF:
            # Ascend to takeoff altitude
            alt_error = self.takeoff_alt - self.curr_z
            if abs(alt_error) < 0.3:
                self.get_logger().info(
                    f"✈️ Takeoff Complete ({self.curr_z:.2f}m). Starting Waypoint Navigation."
                )
                self.state = FlightState.WAYPOINT_NAV
            else:
                vz = max(0.5, min(1.5, alt_error * 0.8))

        elif self.state == FlightState.WAYPOINT_NAV:
            if self.current_wp_idx < len(self.waypoints):
                target = self.waypoints[self.current_wp_idx]
                dx = target[0] - self.curr_x
                dy = target[1] - self.curr_y
                dz = target[2] - self.curr_z
                dist_xy = math.hypot(dx, dy)

                if dist_xy < 0.8:
                    self.get_logger().info(
                        f"🎯 Reached Waypoint {self.current_wp_idx + 1}/{len(self.waypoints)}: {target}"
                    )
                    self.current_wp_idx += 1
                else:
                    speed = min(self.cruise_speed, dist_xy * 1.0)
                    vx = (dx / dist_xy) * speed
                    vy = (dy / dist_xy) * speed
                    vz = dz * 0.5
            else:
                self.get_logger().info("⏸️ All Waypoints Complete. Entering HOVER Mode (5s).")
                self.state = FlightState.HOVER
                self.hover_start_time = time.time()

        elif self.state == FlightState.HOVER:
            if time.time() - self.hover_start_time > 5.0:
                self.get_logger().info("🛬 Hover Complete. Initiating LAND Mode.")
                self.state = FlightState.LAND
            else:
                vx, vy, vz = 0.0, 0.0, 0.0

        elif self.state == FlightState.LAND:
            if self.curr_z <= 0.2:
                self.get_logger().info(f"✅ Landing Complete ({self.curr_z:.2f}m). Flight Mission Success.")
                vx, vy, vz = 0.0, 0.0, 0.0
            else:
                vz = -0.6

        # ── Publish 50Hz Twist Command ────────────────────────────────────────
        cmd = TwistStamped()
        cmd.header.stamp = self.get_clock().now().to_msg()
        cmd.header.frame_id = "base_link"
        cmd.twist.linear.x = vx
        cmd.twist.linear.y = vy
        cmd.twist.linear.z = vz
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
