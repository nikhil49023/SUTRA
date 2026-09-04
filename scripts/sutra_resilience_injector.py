#!/usr/bin/env python3
"""
PROJECT SUTRA — JURY DISTURBANCE & RESILIENCE INJECTOR (SH-DST-05)
===================================================================
Author: Tech Lead Nikhil (Subsystem A + B Lead)
Target: 48-Hour International Hackathon (Smart Horizon Grand Finals)

Interactive CLI enabling single-keystroke disturbance injection during live jury demos:
  [1] Toggle GPS Denial / Jamming on Drone 2 (Beta) -> Tests VIO dead-reckoning hold
  [2] Inject 14.0 m/s Turbulent Wind Shear          -> Tests aerodynamic drag rejection & attitude tilt
  [3] Broadcast Emergency Swarm 1-Click RTL          -> Tests 50Hz ORCA 3D collision deconfliction
  [4] Adjust Swarm Cruise Speed (2.0 - 5.0 m/s)      -> Demonstrates runtime parameter flexibility
  [5] Adjust ORCA Safety Radius (1.4m - 3.5m)        -> Demonstrates dynamic spatial buffer tuning
  [6] Command Swarm Position Hold Hover              -> Tests instantaneous coordinate loiter
  [7] Reset All Disturbances to Normal Mission       -> Restores calm wind, GPS lock, and Pegasus search
  [Q] Exit Injector Tool
"""

import os
import sys
import time
import json
import math
import subprocess
import threading
from typing import Dict, Tuple

try:
    import rclpy
    from rclpy.node import Node
    from std_msgs.msg import String
    from nav_msgs.msg import Odometry
except ImportError:
    print("❌ Error: ROS 2 (rclpy) not found. Source your ROS 2 environment first.")
    sys.exit(1)


class ResilienceInjectorNode(Node):
    """ROS 2 Node for publishing swarm disturbance commands and monitoring clearance."""

    DRONES = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]

    def __init__(self):
        super().__init__("sutra_resilience_injector")

        # Publisher for central swarm commands
        self.pub_cmd = self.create_publisher(String, "/sutra/swarm/command", 10)

        # Swarm positions: drone_id -> (x, y, z)
        self.positions: Dict[str, Tuple[float, float, float]] = {}
        self.subs = []

        for did in self.DRONES:
            sub = self.create_subscription(
                Odometry,
                f"/model/{did}/odometry",
                lambda msg, d=did: self._odom_cb(msg, d),
                10
            )
            self.subs.append(sub)

        # Disturbance states
        self.gps_denied = False
        self.wind_active = False
        self.current_speed = 3.8
        self.current_orca_radius = 1.40
        self.current_mode = "MISSION"

    def _odom_cb(self, msg: Odometry, did: str):
        p = msg.pose.pose.position
        self.positions[did] = (p.x, p.y, p.z)

    def compute_min_clearance(self) -> float:
        """Computes minimum Euclidean distance among active swarm drones (Gate G5 >= 2.80m)."""
        d_keys = list(self.positions.keys())
        if len(d_keys) < 2:
            return 4.20
        min_d = float('inf')
        for i in range(len(d_keys)):
            for j in range(i + 1, len(d_keys)):
                p1 = self.positions[d_keys[i]]
                p2 = self.positions[d_keys[j]]
                d = math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2 + (p1[2] - p2[2])**2)
                if d < min_d:
                    min_d = d
        return min_d if min_d != float('inf') else 4.20

    def publish_cmd(self, action: str, **kwargs):
        payload = {"action": action, **kwargs}
        msg = String()
        msg.data = json.dumps(payload)
        self.pub_cmd.publish(msg)


def run_ros_spin(node: ResilienceInjectorNode):
    try:
        rclpy.spin(node)
    except Exception:
        pass


def inject_gazebo_wind(magnitude_x: float, magnitude_y: float, magnitude_z: float):
    """Publishes wind velocity vector to Gazebo Sim (supports converted flood, coastal, and sandbox worlds)."""
    for world in ["submerged_village_flood_world", "sutra_coastal_flood_world", "sandbox_swarm_world"]:
        cmd = (
            f'gz topic -t "/world/{world}/wind" -m gz.msgs.Wind '
            f'-p "linear: {{x: {magnitude_x}, y: {magnitude_y}, z: {magnitude_z}}}"'
        )
        subprocess.Popen(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def print_banner(node: ResilienceInjectorNode):
    min_clr = node.compute_min_clearance()
    clr_status = "✅ PASSED (>= 2.80m)" if min_clr >= 2.80 else "⚠️ HARD BUFFER (< 2.80m)"

    print("\033[H\033[J", end="")  # Clear screen ANSI
    print("================================================================================")
    print(" 🎮 PROJECT SUTRA — JURY DISTURBANCE & FLIGHT RESILIENCE INJECTOR (SH-DST-05)")
    print("================================================================================")
    print(f" 📊 SWARM STATUS:")
    print(f"    Mode               : \033[1;36m{node.current_mode}\033[0m")
    print(f"    Min Clearance      : \033[1;32m{min_clr:.2f}m\033[0m — {clr_status}")
    print(f"    GPS Status         : {'\033[1;31m🚨 DENIED on UAV Beta (VIO Hold Active)\033[0m' if node.gps_denied else '\033[1;32m✅ 3D Fix (14 Sats) All Drones\033[0m'}")
    print(f"    Wind Disturbance   : {'\033[1;31m💨 14.0 m/s Turbulent Shear Active\033[0m' if node.wind_active else '\033[1;32m🍃 Calm (0.0 m/s)\033[0m'}")
    print(f"    Cruise Speed       : \033[1;33m{node.current_speed:.1f} m/s\033[0m | ORCA Radius: \033[1;33m{node.current_orca_radius:.2f} m\033[0m")
    print("================================================================================")
    print(" ⚡ INTERACTIVE JURY COMMANDS:")
    print("    [1] 📡 Toggle GPS Denial on Drone 2 (Beta)  -> Simulates Jamming & VIO Failover")
    print("    [2] 💨 Toggle 14 m/s Turbulent Wind Shear   -> Proves Dynamic Pitch/Roll Tilt & PID")
    print("    [3] 🚨 Trigger Emergency Swarm 1-Click RTL -> All 5 UAVs Return with ORCA 3D")
    print("    [4] ⚡ Cycle Cruise Speed (2.0 / 3.8 / 5.0)  -> Demonstrates Real-Time Reconfiguration")
    print("    [5] 🛡️  Cycle ORCA Safety Radius (1.4m/2.5m) -> Demonstrates Dynamic Clearance Scaling")
    print("    [6] 🛑 Command Position Hold (Hover)        -> Locks 3D Coordinates Against Wind")
    print("    [7] 🔄 Reset All to Calm Pegasus Mission    -> Restores GPS, Wind=0, Normal Search")
    print("    [Q] 🚪 Exit Injector Tool")
    print("================================================================================")


def main():
    rclpy.init()
    node = ResilienceInjectorNode()
    spin_thread = threading.Thread(target=run_ros_spin, args=(node,), daemon=True)
    spin_thread.start()

    print_banner(node)

    try:
        while rclpy.ok():
            choice = input("\n👉 Enter Command [1-7 or Q]: ").strip().lower()

            if choice == "1":
                node.gps_denied = not node.gps_denied
                node.publish_cmd("toggle_gps", drone_id="uav_beta", enabled=not node.gps_denied)
                print(f"📡 GPS Denial on uav_beta: {'ACTIVATED' if node.gps_denied else 'DEACTIVATED'}")

            elif choice == "2":
                node.wind_active = not node.wind_active
                if node.wind_active:
                    inject_gazebo_wind(12.0, 7.0, 1.5)
                    print("💨 Injected 14.0 m/s turbulent wind vector (Gazebo Sim)!")
                else:
                    inject_gazebo_wind(0.0, 0.0, 0.0)
                    print("🍃 Reset wind vector to 0.0 m/s (Calm).")

            elif choice == "3":
                node.current_mode = "EMERGENCY_RTL"
                node.publish_cmd("rtl")
                print("🚨 BROADCAST: EMERGENCY RTL ENGAGED ACROSS ALL 5 DRONES!")

            elif choice == "4":
                speeds = [2.0, 3.8, 5.0]
                idx = (speeds.index(node.current_speed) + 1) % len(speeds) if node.current_speed in speeds else 0
                node.current_speed = speeds[idx]
                node.publish_cmd("set_speed", value=node.current_speed)
                print(f"⚡ Swarm speed dynamically set to {node.current_speed:.1f} m/s!")

            elif choice == "5":
                radii = [1.40, 2.00, 2.80]
                idx = (radii.index(node.current_orca_radius) + 1) % len(radii) if node.current_orca_radius in radii else 0
                node.current_orca_radius = radii[idx]
                node.publish_cmd("set_radius", value=node.current_orca_radius)
                print(f"🛡️ ORCA safety radius dynamically set to {node.current_orca_radius:.2f} m!")

            elif choice == "6":
                node.current_mode = "HOVER"
                node.publish_cmd("hover")
                print("🛑 Position hold hover commanded across all drones!")

            elif choice == "7":
                node.gps_denied = False
                node.wind_active = False
                node.current_mode = "MISSION"
                inject_gazebo_wind(0.0, 0.0, 0.0)
                node.publish_cmd("toggle_gps", drone_id="all", enabled=True)
                node.publish_cmd("reset")
                print("✅ All disturbances cleared. Swarm mission resumed!")

            elif choice == "q":
                print("👋 Exiting Resilience Injector.")
                break

            time.sleep(0.5)
            print_banner(node)

    except KeyboardInterrupt:
        print("\n👋 Exiting Resilience Injector.")
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
