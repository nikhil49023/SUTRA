#!/usr/bin/env python3
"""
PROJECT SUTRA — Gazebo Forest Canopy SAR Simulation & GCS WORLD 2 Live Bridge
=============================================================================
Author: Tech Lead Nikhil (Tech Architect & Subsystem A + B Lead ⚡)

Orchestrates:
1. Gazebo Sim 8 with photorealistic forest canopy disaster world (forest_canopy_sar_world.sdf)
2. ROS 2 <-> Gazebo Sim image_bridge for all 5 UAV cameras (RGB & FLIR Thermal)
3. ROS 2 <-> Gazebo Sim parameter_bridge for 50Hz ground truth & VIO odometry
4. SUTRA GCS Gateway Bridge (:8080 MJPEG & :8765 WebSocket forwarder) tagged for WORLD 2
5. Automatic camera alignment and process lifecycle management
"""

import argparse
import os
import signal
import subprocess
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
SUTRA_SIM_DIR = os.path.join(PROJECT_ROOT, "sutra_ws", "src", "sutra_sim")
SUTRA_COMMS_DIR = os.path.join(PROJECT_ROOT, "sutra_ws", "src", "sutra_comms")
WORLD_SDF = os.path.join(SUTRA_SIM_DIR, "worlds", "forest_canopy_sar_world.sdf")

procs = []

def cleanup(signum=None, frame=None):
    print("\n🛑 Shutting down Gazebo Forest Canopy SAR stack...")
    for p in reversed(procs):
        try:
            if p.poll() is None:
                p.terminate()
                p.wait(timeout=2.0)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def main():
    parser = argparse.ArgumentParser(description="Launch SUTRA Gazebo Forest Canopy World & GCS Bridge")
    parser.add_argument("--headless", action="store_true", help="Run Gazebo in headless mode (no GUI)")
    parser.add_argument("--display", default=os.getenv("DISPLAY", ":1"), help="X11 Display to use (default: :1)")
    args = parser.parse_args()

    print("=" * 78)
    print("🌲 PROJECT SUTRA — FOREST CANOPY SAR SIMULATION & GCS WORLD 2 PIPELINE")
    print("=" * 78)
    print(f"📍 World Model       : {WORLD_SDF}")
    print(f"🖥️  Display          : {args.display} {'(Headless)' if args.headless else '(GUI active)'}")
    print("🚁 UAV Fleet         : 5x SUTRA Pegasus (uav_alpha .. uav_epsilon -> UAV-1 .. UAV-5)")
    print("📡 Target GCS World  : WORLD 2 (sutra_gcs :8765 & :8080)")
    print("=" * 78)

    env = os.environ.copy()
    env.pop("GTK_PATH", None)
    env.pop("GTK_IM_MODULE", None)
    env.pop("LOCPATH", None)
    env.pop("GIO_MODULE_DIR", None)

    env["DISPLAY"] = args.display
    env["GZ_PARTITION"] = "sutra_sim"
    env["GZ_SIM_RESOURCE_PATH"] = f"{SUTRA_SIM_DIR}:{SUTRA_SIM_DIR}/models:{SUTRA_SIM_DIR}/worlds:{env.get('GZ_SIM_RESOURCE_PATH', '')}"
    env["IGN_GAZEBO_RESOURCE_PATH"] = env["GZ_SIM_RESOURCE_PATH"]
    env["SDF_PATH"] = f"{SUTRA_SIM_DIR}/models:{env.get('SDF_PATH', '')}"
    env["SUTRA_WORLD_ID"] = "WORLD_2"
    env["SUTRA_GCS_WS_URL"] = "ws://127.0.0.1:8765"

    # Add workspace and comms to PYTHONPATH
    sys_path_dirs = [
        os.path.join(SUTRA_COMMS_DIR, "sutra_comms"),
        SUTRA_COMMS_DIR,
        os.path.join(PROJECT_ROOT, "sutra_ws", "src"),
    ]
    env["PYTHONPATH"] = ":".join(sys_path_dirs) + ":" + env.get("PYTHONPATH", "")

    # 1. Launch Gazebo Sim 8
    gz_cmd = ["gz", "sim", "-r"]
    if args.headless:
        gz_cmd.append("-s")
    gz_cmd.append(WORLD_SDF)

    print("\n▶️  [1/4] Starting Gazebo Sim 8 Engine...")
    gz_proc = subprocess.Popen(gz_cmd, env=env)
    procs.append(gz_proc)

    time.sleep(4.0)
    if gz_proc.poll() is not None:
        print("❌ Gazebo failed to start. Exiting.")
        cleanup()

    # 2. Launch ROS 2 <-> Gazebo image_bridge
    drones = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]
    img_topics = []
    for d in drones:
        img_topics.append(f"/{d}/camera/image_raw")
        img_topics.append(f"/{d}/thermal_camera/image_raw")

    print("▶️  [2/4] Starting ros_gz_image bridge (10x camera channels)...")
    img_bridge_cmd = ["ros2", "run", "ros_gz_image", "image_bridge"] + img_topics
    img_proc = subprocess.Popen(img_bridge_cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    procs.append(img_proc)

    # 3. Launch ROS 2 <-> Gazebo parameter_bridge for odometry
    odom_args = []
    for d in drones:
        odom_args.append(f"/model/{d}/odometry@nav_msgs/msg/Odometry[gz.msgs.Odometry")
        odom_args.append(f"/{d}/imu@sensor_msgs/msg/Imu[gz.msgs.IMU")
        odom_args.append(f"/{d}/rangefinder/distance@sensor_msgs/msg/LaserScan[gz.msgs.LaserScan")

    print("▶️  [3/4] Starting ros_gz_bridge parameter bridge (odometry, IMU, depth)...")
    odom_bridge_cmd = ["ros2", "run", "ros_gz_bridge", "parameter_bridge"] + odom_args
    odom_proc = subprocess.Popen(odom_bridge_cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    procs.append(odom_proc)

    # 4. Launch SUTRA GCS Gateway Bridge
    print("▶️  [4/4] Starting SUTRA GCS Gateway Bridge (WORLD_2 -> ws://127.0.0.1:8765 & http://0.0.0.0:8080)...")
    gateway_bridge_path = os.path.join(SUTRA_COMMS_DIR, "sutra_comms", "gcs_gateway_bridge.py")
    gw_proc = subprocess.Popen([sys.executable, gateway_bridge_path], env=env)
    procs.append(gw_proc)

    print("\n" + "=" * 78)
    print("✅ GAZEBO FOREST CANOPY WORLD & GCS WORLD 2 PIPELINE IS FULLY ACTIVE!")
    print("   - Gazebo Sim 8: Running photorealistic canopy disaster world")
    print("   - Camera Feeds: 5x RGB + 5x FLIR Thermal streaming via ROS 2")
    print("   - Deep JSCC   : Compressing frames and forwarding to GCS on ws://127.0.0.1:8765")
    print("   - GCS UI      : Open http://localhost:5173/?world=WORLD_2")
    print("=" * 78 + "\n")

    try:
        while True:
            time.sleep(1.0)
            for p in procs:
                if p.poll() is not None and p == gz_proc:
                    print("⚠️ Gazebo process exited.")
                    cleanup()
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()
