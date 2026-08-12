#!/usr/bin/env python3
"""
Project SUTRA — Laptop Keyboard Teleop Controller (Phase 1)
===========================================================
Author: Tech Lead Nikhil (Subsystem A)

Reads keyboard inputs directly from the Linux terminal (non-blocking) and sends
real-time flight commands and mode toggle signals to the Gazebo quadcopter.

Controls:
  [W] / [S]     : Forward / Backward (+X / -X)
  [A] / [D]     : Left / Right (+Y / -Y)
  [I] / [K]     : Climb / Descend (+Z / -Z)
  [J] / [L]     : Yaw Left / Yaw Right
  [M]           : Toggle Mode (AUTONOMOUS RING PURSUIT <-> MANUAL TELEOP)
  [SPACE]       : Emergency Hover / Brake
  [Q]           : Quit Teleop
"""

import sys
import select
import termios
import tty

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from std_msgs.msg import String


HELP_MSG = """
🎮 SUTRA LAPTOP KEYBOARD TELEOP CONTROLLER
===========================================
  W / S     : Move Forward / Backward
  A / D     : Move Left / Right
  I / K     : Move Up (Climb) / Down (Descend)
  J / L     : Rotate Yaw Left / Right
  M         : Toggle Mode (AUTONOMOUS PURSUIT <-> MANUAL LAPTOP)
  SPACE     : Emergency Hover / Brake
  Q         : Quit Teleop
===========================================
"""


class LaptopTeleopNode(Node):
    def __init__(self):
        super().__init__("sutra_laptop_teleop")

        self.pub_vel = self.create_publisher(Twist, "/sutra/teleop/cmd_vel", 10)
        self.pub_mode = self.create_publisher(String, "/sutra/teleop/mode", 10)

        self.speed_xy = 2.0
        self.speed_z = 1.0
        self.speed_yaw = 0.8
        self.is_manual_mode = False

        self.get_logger().info("🎮 Laptop Teleop Keyboard Controller Initialized.")

    def run_teleop_loop(self):
        old_settings = termios.tcgetattr(sys.stdin)
        print(HELP_MSG)
        try:
            tty.setraw(sys.stdin.fileno())
            while rclpy.ok():
                if select.select([sys.stdin], [], [], 0.05)[0]:
                    key = sys.stdin.read(1)
                    if key.lower() == "q":
                        print("\nExiting Teleop...")
                        break
                    self._handle_key(key.lower())
                rclpy.spin_once(self, timeout_sec=0.01)
        finally:
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)

    def _handle_key(self, key: str):
        vx, vy, vz, wz = 0.0, 0.0, 0.0, 0.0

        if key == "m":
            self.is_manual_mode = not self.is_manual_mode
            mode_str = "MANUAL_TELEOP" if self.is_manual_mode else "AUTONOMOUS_RING_PURSUIT"
            sys.stdout.write(f"\r\n🔄 FLIGHT MODE SWITCHED TO: [{mode_str}]\r\n")
            sys.stdout.flush()

            msg = String()
            msg.data = mode_str
            self.pub_mode.publish(msg)
            return

        if key == "w":
            vx = self.speed_xy
        elif key == "s":
            vx = -self.speed_xy
        elif key == "a":
            vy = self.speed_xy
        elif key == "d":
            vy = -self.speed_xy
        elif key == "i":
            vz = self.speed_z
        elif key == "k":
            vz = -self.speed_z
        elif key == "j":
            wz = self.speed_yaw
        elif key == "l":
            wz = -self.speed_yaw
        elif key == " ":
            vx, vy, vz, wz = 0.0, 0.0, 0.0, 0.0
            sys.stdout.write("\r\n⚠️ EMERGENCY HOVER BRAKE ACTIVATED\r\n")
            sys.stdout.flush()

        twist = Twist()
        twist.linear.x = vx
        twist.linear.y = vy
        twist.linear.z = vz
        twist.angular.z = wz
        self.pub_vel.publish(twist)


def main(args=None):
    rclpy.init(args=args)
    node = LaptopTeleopNode()
    try:
        node.run_teleop_loop()
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
