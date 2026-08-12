#!/usr/bin/env python3
"""
Project SUTRA — 1-Click Single-Drone Flight Simulation Launcher
================================================================
Automates workspace build, environment sourcing, Gazebo process cleanup,
and 3D flight simulation execution.

Usage:
  python3 scripts/run_flight_demo.py
"""

import os
import subprocess
import sys
import time
import webbrowser


def log(msg: str):
    print(f"\030[1;36m[SUTRA DEMO Launcher]\033[0m {msg}")


def main():
    log("🚀 Initializing SUTRA Single-Drone Flight Simulation...")

    # 1. Clean up lingering Gazebo processes to avoid GUI lockouts
    log("🧹 Cleaning up lingering Gazebo/ROS processes...")
    try:
        subprocess.run(["pkill", "-f", "gz sim"], stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
        subprocess.run(["pkill", "-f", "ros_gz_bridge"], stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
        time.sleep(1)
    except Exception:
        pass

    # 2. Build Workspace cleanly
    ws_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sutra_ws"))
    log(f"📦 Building ROS 2 workspace at {ws_dir}...")
    build_res = subprocess.run(["colcon", "build", "--symlink-install"], cwd=ws_dir)

    if build_res.returncode != 0:
        log("❌ Workspace build failed! Please check errors above.")
        sys.exit(1)

    # 3. Formulate Launch Command with sourced environment
    setup_bash = os.path.join(ws_dir, "install", "setup.bash")
    launch_cmd = f"source /opt/ros/jazzy/setup.bash && source '{setup_bash}' && ros2 launch sutra_sim phase1_flight.launch.py headless:=false"

    log("🚁 Launching 3D Gazebo Sim 8 & Dual-Mode Offboard Controller...")
    log("⚡ Press Ctrl+C in this terminal at any time to stop the simulation.")
    print("=" * 80)

    try:
        proc = subprocess.Popen(["bash", "-c", launch_cmd])
        proc.wait()
    except KeyboardInterrupt:
        print("\n")
        log("🛑 Terminating simulation environment...")
        subprocess.run(["pkill", "-f", "gz sim"], stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
        subprocess.run(["pkill", "-f", "ros_gz_bridge"], stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
        log("✅ Simulation stopped cleanly.")


if __name__ == "__main__":
    main()
