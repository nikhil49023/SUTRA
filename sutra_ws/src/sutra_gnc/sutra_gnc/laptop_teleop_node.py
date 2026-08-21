#!/usr/bin/env python3
"""
Project SUTRA — Laptop Keyboard Teleop Controller (Phase 1)
===========================================================
Author: Tech Lead Nikhil (Subsystem A Lead ⚡)

Direct, zero-lag keyboard teleoperation node for Gazebo Sim quadcopters.
Reads keyboard keystrokes directly from the terminal (raw mode) and streams
50Hz TwistStamped commands directly to Gazebo and the flight controller.

Controls:
  [W] / [S]     : Move Forward / Backward (Body Frame)
  [A] / [D]     : Move Left / Right (Strafe)
  [I] / [K]     : Climb Up / Descend Down
  [J] / [L]     : Rotate Yaw Left / Yaw Right
  [SPACE] / [X] : Emergency Hover Brake (Zero All Velocities)
  [M]           : Toggle Flight Mode (MANUAL TELEOP <-> AUTONOMOUS RING PURSUIT)
  [+] / [-]     : Increase / Decrease Velocity Scale
  [Q]           : Quit Teleop
"""

import sys
import select
import termios
import tty
import time
import math

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist, TwistStamped
from nav_msgs.msg import Odometry
from std_msgs.msg import String


HELP_MSG = """
╔═══════════════════════════════════════════════════════════════════════╗
║             🎮 SUTRA UAV DIRECT KEYBOARD CONTROLLER                   ║
╠═══════════════════════════════════════════════════════════════════════╣
║   [W] / [S]     : Move Forward / Backward (Body Heading)              ║
║   [A] / [D]     : Move Left / Right (Strafe)                          ║
║   [I] / [K]     : Climb Up / Descend Down                             ║
║   [J] / [L]     : Rotate Yaw Left / Yaw Right                         ║
║   [SPACE] / [X] : Emergency Hover / Full Stop                         ║
║   [M]           : Toggle Mode (MANUAL <-> AUTONOMOUS PURSUIT)         ║
║   [+] / [-]     : Increase / Decrease Velocity Limit                  ║
║   [Q]           : Quit Teleop                                         ║
╚═══════════════════════════════════════════════════════════════════════╝
"""


class DirectLaptopTeleopNode(Node):
    def __init__(self):
        super().__init__("sutra_laptop_teleop")

        self.declare_parameter("drone_id", "uav_alpha")
        self.drone_id = str(self.get_parameter("drone_id").value)

        # ── Publishers ────────────────────────────────────────────────────────
        # 1. Direct Gazebo bridge command (zero middleman lag)
        self.pub_direct_twist = self.create_publisher(
            TwistStamped, f"/{self.drone_id}/gazebo/command/twist", 10
        )
        # 2. Standard teleop topic
        self.pub_vel = self.create_publisher(Twist, "/sutra/teleop/cmd_vel", 10)
        # 3. Flight mode topic
        self.pub_mode = self.create_publisher(String, "/sutra/teleop/mode", 10)

        # ── Subscriptions ─────────────────────────────────────────────────────
        self.sub_odom = self.create_subscription(
            Odometry, f"/model/{self.drone_id}/odometry", self._odom_callback, 10
        )

        self.speed_xy = 2.5
        self.speed_z = 1.5
        self.speed_yaw = 1.2
        self.is_manual_mode = True

        self.body_vx = 0.0
        self.body_vy = 0.0
        self.body_vz = 0.0
        self.body_wz = 0.0
        self.curr_yaw = 0.0
        self.last_key_time = time.time()

        # 50Hz continuous high-rate control loop
        self.timer = self.create_timer(0.02, self._control_loop_50hz)

        # Broadcast manual mode on launch
        self.broadcast_mode("MANUAL_TELEOP")
        self.get_logger().info(f"🎮 Direct Laptop Teleop Initialized for [{self.drone_id}] @ 50Hz")

    def _odom_callback(self, msg: Odometry):
        q = msg.pose.pose.orientation
        self.curr_yaw = math.atan2(
            2.0 * (q.w * q.z + q.x * q.y),
            1.0 - 2.0 * (q.y * q.y + q.z * q.z)
        )

    def broadcast_mode(self, mode_str: str):
        msg = String()
        msg.data = mode_str
        self.pub_mode.publish(msg)

    def _control_loop_50hz(self):
        if not self.is_manual_mode:
            return

        # Key decay if idle for > 0.35s (tap-and-hold responsiveness)
        if time.time() - self.last_key_time > 0.35:
            self.body_vx *= 0.7
            self.body_vy *= 0.7
            self.body_vz *= 0.7
            self.body_wz *= 0.7
            if abs(self.body_vx) < 0.05: self.body_vx = 0.0
            if abs(self.body_vy) < 0.05: self.body_vy = 0.0
            if abs(self.body_vz) < 0.05: self.body_vz = 0.0
            if abs(self.body_wz) < 0.05: self.body_wz = 0.0

        # Transform body frame velocity to world frame based on current yaw heading
        cy = math.cos(self.curr_yaw)
        sy = math.sin(self.curr_yaw)
        world_vx = self.body_vx * cy - self.body_vy * sy
        world_vy = self.body_vx * sy + self.body_vy * cy
        world_vz = self.body_vz
        world_wz = self.body_wz

        # Publish direct TwistStamped to Gazebo
        ts = TwistStamped()
        ts.header.stamp = self.get_clock().now().to_msg()
        ts.header.frame_id = "base_link"
        ts.twist.linear.x = float(world_vx)
        ts.twist.linear.y = float(world_vy)
        ts.twist.linear.z = float(world_vz)
        ts.twist.angular.z = float(world_wz)
        self.pub_direct_twist.publish(ts)

        # Publish standard Twist
        tw = Twist()
        tw.linear.x = float(self.body_vx)
        tw.linear.y = float(self.body_vy)
        tw.linear.z = float(self.body_vz)
        tw.angular.z = float(self.body_wz)
        self.pub_vel.publish(tw)

    def run_teleop_loop(self):
        old_settings = termios.tcgetattr(sys.stdin)
        print(HELP_MSG)
        sys.stdout.write("🚀 [MANUAL CONTROL ACTIVE] Press W/A/S/D to fly, I/K for climb, SPACE for brake.\r\n")
        sys.stdout.flush()

        try:
            tty.setraw(sys.stdin.fileno())
            while rclpy.ok():
                if select.select([sys.stdin], [], [], 0.02)[0]:
                    key = sys.stdin.read(1)
                    if key.lower() == "q":
                        print("\r\nExiting Direct Teleop...\r\n")
                        break
                    self._handle_key(key.lower())
                rclpy.spin_once(self, timeout_sec=0.01)
        finally:
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)

    def _handle_key(self, key: str):
        now = time.time()
        self.last_key_time = now

        if key == "m":
            self.is_manual_mode = not self.is_manual_mode
            mode_str = "MANUAL_TELEOP" if self.is_manual_mode else "AUTONOMOUS_RING_PURSUIT"
            sys.stdout.write(f"\r\n🔄 MODE SWITCH: [{mode_str}]\r\n")
            sys.stdout.flush()
            self.broadcast_mode(mode_str)
            return

        if key == "+":
            self.speed_xy = min(8.0, self.speed_xy + 0.5)
            sys.stdout.write(f"\r\n⚡ XY Speed: {self.speed_xy:.1f} m/s\r\n")
            sys.stdout.flush()
            return
        elif key == "-":
            self.speed_xy = max(0.5, self.speed_xy - 0.5)
            sys.stdout.write(f"\r\n🐢 XY Speed: {self.speed_xy:.1f} m/s\r\n")
            sys.stdout.flush()
            return

        if key == "w":
            self.body_vx = self.speed_xy
            sys.stdout.write("\r⬆️  FORWARD  ")
        elif key == "s":
            self.body_vx = -self.speed_xy
            sys.stdout.write("\r⬇️  BACKWARD ")
        elif key == "a":
            self.body_vy = self.speed_xy
            sys.stdout.write("\r⬅️  STRAFE-L ")
        elif key == "d":
            self.body_vy = -self.speed_xy
            sys.stdout.write("\r➡️  STRAFE-R ")
        elif key == "i":
            self.body_vz = self.speed_z
            sys.stdout.write("\r⏫ CLIMB    ")
        elif key == "k":
            self.body_vz = -self.speed_z
            sys.stdout.write("\r⏬ DESCEND  ")
        elif key == "j":
            self.body_wz = self.speed_yaw
            sys.stdout.write("\r🔄 YAW-LEFT ")
        elif key == "l":
            self.body_wz = -self.speed_yaw
            sys.stdout.write("\r🔄 YAW-RIGHT")
        elif key in (" ", "x"):
            self.body_vx = 0.0
            self.body_vy = 0.0
            self.body_vz = 0.0
            self.body_wz = 0.0
            sys.stdout.write("\r🛑 FULL STOP")

        sys.stdout.flush()


def main(args=None):
    rclpy.init(args=args)
    node = DirectLaptopTeleopNode()
    try:
        node.run_teleop_loop()
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
