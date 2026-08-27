#!/usr/bin/env python3
"""
Project SUTRA — 5-Drone SORCA 3D Ring Crossing Gazebo Simulation Launch
=======================================================================
Author: Tech Lead Nikhil (Subsystem A Lead)

Launches:
1. Gazebo Sim 8 with ring_crossing_arena.sdf (5 X3 UAVs on R=12m perimeter).
2. ros_gz_bridge for Odometry, 50Hz Twists, IMU, Barometer, Mag, GPS, Rangefinder, RGB & FLIR Thermal.
3. Subsystem A ORCA 3D Collision Avoidance Node (orca_avoidance_node) with SORCA 50Hz smoothing.

Usage:
  ros2 launch sutra_sim ring_crossing_gazebo.launch.py
  ros2 launch sutra_sim ring_crossing_gazebo.launch.py headless:=true
"""

import os
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import (
    DeclareLaunchArgument,
    ExecuteProcess,
    LogInfo,
    TimerAction,
    GroupAction,
)
from launch.substitutions import LaunchConfiguration
from launch.conditions import IfCondition, UnlessCondition


DRONE_IDS = [
    "uav_alpha",
    "uav_beta",
    "uav_gamma",
    "uav_delta",
    "uav_epsilon",
]


def generate_launch_description():
    sim_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    models_dir = os.path.join(sim_dir, "models")
    world_path = os.path.join(sim_dir, "worlds", "ring_crossing_arena.sdf")

    # ── Environment ───────────────────────────────────────────────────────────
    cyclonedds_path = os.path.realpath(
        os.path.join(sim_dir, "..", "..", "cyclonedds.xml")
    )
    if os.path.exists(cyclonedds_path):
        os.environ["CYCLONEDDS_URI"] = f"file://{cyclonedds_path}"

    os.environ["GZ_IP"] = "127.0.0.1"
    os.environ["GZ_PARTITION"] = "sutra_ring_crossing"

    resource_paths = (
        f"{sim_dir}:{models_dir}:{os.path.join(sim_dir, 'worlds')}:"
        + os.environ.get("GZ_SIM_RESOURCE_PATH", "")
    )
    os.environ["GZ_SIM_RESOURCE_PATH"] = resource_paths
    os.environ["IGN_GAZEBO_RESOURCE_PATH"] = resource_paths

    # ── Launch Arguments ──────────────────────────────────────────────────────
    headless_arg = DeclareLaunchArgument(
        "headless",
        default_value="false",
        description="Run Gazebo headless (no 3D GUI window)",
    )

    # ── Gazebo Sim 8 Process ─────────────────────────────────────────────────
    gazebo_gui = ExecuteProcess(
        cmd=["gz", "sim", "-r", world_path],
        output="screen",
        condition=UnlessCondition(LaunchConfiguration("headless")),
    )
    gazebo_headless = ExecuteProcess(
        cmd=["gz", "sim", "-r", "-s", world_path],
        output="screen",
        condition=IfCondition(LaunchConfiguration("headless")),
    )

    # ── ROS 2 ↔ Gazebo Bridge Configuration ──────────────────────────────────
    def bridge_args_for(drone_id: str) -> list:
        return [
            # 50Hz Odometry Downlink
            f"/model/{drone_id}/odometry@nav_msgs/msg/Odometry[gz.msgs.Odometry",
            # 50Hz Velocity Command Uplink (TwistStamped)
            f"/{drone_id}/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist",
            # 50Hz Velocity Command Uplink (Twist)
            f"/{drone_id}/cmd_vel@geometry_msgs/msg/Twist]gz.msgs.Twist",
            # Full 9-DOF Sensor Suite
            f"/{drone_id}/imu@sensor_msgs/msg/Imu[gz.msgs.IMU",
            f"/{drone_id}/air_pressure@sensor_msgs/msg/FluidPressure[gz.msgs.FluidPressure",
            f"/{drone_id}/magnetometer@sensor_msgs/msg/MagneticField[gz.msgs.Magnetometer",
            f"/{drone_id}/navsat@sensor_msgs/msg/NavSatFix[gz.msgs.NavSat",
            f"/{drone_id}/rangefinder/distance@sensor_msgs/msg/LaserScan[gz.msgs.LaserScan",
            # Cameras
            f"/{drone_id}/camera/image_raw@sensor_msgs/msg/Image[gz.msgs.Image",
            f"/{drone_id}/thermal_camera/image_raw@sensor_msgs/msg/Image[gz.msgs.Image",
        ]

    all_bridge_args = (
        ["/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock"]
        + [arg for did in DRONE_IDS for arg in bridge_args_for(did)]
    )

    ros_gz_bridge = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        name="sutra_ring_crossing_bridge",
        output="screen",
        arguments=all_bridge_args,
        parameters=[{"use_sim_time": True}],
    )

    # ── One Flight Controller Node Per Drone (50Hz Setpoints + ORCA 3D Avoidance) ──
    TAKEOFF_ALTS = {
        "uav_alpha":   4.0,
        "uav_beta":    4.6,
        "uav_gamma":   3.5,
        "uav_delta":   4.3,
        "uav_epsilon": 3.8,
    }

    def flight_node(drone_id: str) -> Node:
        return Node(
            package="sutra_gnc",
            executable="swarm_fixed_path_node.py",
            name=f"sutra_ring_path_{drone_id}",
            output="screen",
            parameters=[{
                "drone_id": drone_id,
                "route_mode": "ring_crossing",
                "cruise_speed": 3.0,
                "takeoff_altitude": TAKEOFF_ALTS.get(drone_id, 4.0),
                "waypoint_radius": 2.2,
                "orca_radius": 1.40,  # Gate G5: >= 2.80m clearance barrier
                "max_acceleration": 2.0,
                "use_sim_time": True,
            }],
        )

    flight_nodes = [flight_node(did) for did in DRONE_IDS]

    # Delay ROS 2 bridge & flight nodes to synchronize with Gazebo server
    delayed_bridge = TimerAction(
        period=2.0,
        actions=[
            LogInfo(msg="🚀 Starting Gazebo bridge..."),
            ros_gz_bridge,
        ],
    )
    delayed_flights = TimerAction(
        period=4.0,
        actions=[
            LogInfo(msg="🚁 Starting 5-Drone Ring Crossing Flight Controllers (ORCA 3D)..."),
            *flight_nodes,
        ],
    )

    return LaunchDescription([
        headless_arg,
        LogInfo(msg="===================================================================="),
        LogInfo(msg="🚁 SUTRA 5-DRONE SORCA 3D RING CROSSING GAZEBO SIMULATION LAUNCH"),
        LogInfo(msg="   Gate G5 Target: Inter-Drone Clearance >= 2.80m (Hard Min >= 2.0m)"),
        LogInfo(msg="===================================================================="),
        gazebo_gui,
        gazebo_headless,
        delayed_bridge,
        delayed_flights,
    ])
