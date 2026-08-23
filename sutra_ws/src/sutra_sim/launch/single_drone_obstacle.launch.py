#!/usr/bin/env python3
"""
Project SUTRA — Single Drone Obstacle Course Launch
====================================================
Launches Gazebo Sim 8 with ONE drone (uav_alpha) inside a 50m × 50m
obstacle-course arena featuring concrete pillars, brick corridor walls,
steel cross-beams, rubble mounds, and slalom gate posts.

Usage:
  # GUI (default) — full 3D view:
  ros2 launch sutra_sim single_drone_obstacle.launch.py

  # Autonomous ring-pursuit mode:
  ros2 launch sutra_sim single_drone_obstacle.launch.py mode:=AUTONOMOUS_RING_PURSUIT

  # Headless server only (no GUI):
  ros2 launch sutra_sim single_drone_obstacle.launch.py headless:=true
"""

import os
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import (
    DeclareLaunchArgument,
    ExecuteProcess,
    LogInfo,
    TimerAction,
)
from launch.substitutions import LaunchConfiguration
from launch.conditions import IfCondition, UnlessCondition


def generate_launch_description():
    sim_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    models_dir = os.path.join(sim_dir, "models")
    world_path = os.path.join(sim_dir, "worlds", "single_drone_obstacle_world.sdf")

    # ── Environment: CycloneDDS + Gazebo Transport ────────────────────────────
    cyclonedds_path = os.path.join(
        os.path.dirname(sim_dir),          # sutra_ws/src/
        "..", "..", "cyclonedds.xml"        # sutra_ws/cyclonedds.xml
    )
    cyclonedds_path = os.path.realpath(cyclonedds_path)
    if os.path.exists(cyclonedds_path):
        os.environ["CYCLONEDDS_URI"] = f"file://{cyclonedds_path}"

    os.environ["GZ_IP"] = "127.0.0.1"
    os.environ["GZ_PARTITION"] = "sutra_obstacle_sim"

    # Model mesh resolution path (X3 UAV Collada meshes)
    resource_paths = (
        f"{sim_dir}:{models_dir}:"
        + os.environ.get("GZ_SIM_RESOURCE_PATH", "")
    )
    os.environ["GZ_SIM_RESOURCE_PATH"] = resource_paths
    os.environ["IGN_GAZEBO_RESOURCE_PATH"] = resource_paths

    # ── Launch Arguments ──────────────────────────────────────────────────────
    headless_arg = DeclareLaunchArgument(
        "headless",
        default_value="false",
        description="Run Gazebo headless (true = server only, false = GUI)",
    )
    mode_arg = DeclareLaunchArgument(
        "mode",
        default_value="AUTONOMOUS_RING_PURSUIT",
        description="Flight mode: MANUAL_TELEOP | AUTONOMOUS_RING_PURSUIT",
    )

    # ── Gazebo Sim 8 ─────────────────────────────────────────────────────────
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

    # ── ROS 2 ↔ Gazebo Bridge ─────────────────────────────────────────────────
    ros_gz_bridge = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        name="sutra_obstacle_ros_gz_bridge",
        output="screen",
        arguments=[
            # Simulation clock
            "/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock",
            # Velocity command (ROS 2 → Gazebo)
            "/uav_alpha/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist",
            # Odometry (Gazebo → ROS 2)
            "/model/uav_alpha/odometry@nav_msgs/msg/Odometry[gz.msgs.Odometry",
            # Pose (Gazebo → ROS 2)
            "/model/uav_alpha/pose@geometry_msgs/msg/Pose[gz.msgs.Pose",
            # IMU (Gazebo → ROS 2)
            "/uav_alpha/imu@sensor_msgs/msg/Imu[gz.msgs.IMU",
            # GPU LiDAR PointCloud2 (Gazebo → ROS 2)
            "/uav_alpha/lidar/points@sensor_msgs/msg/PointCloud2[gz.msgs.PointCloudPacked",
            # RGB Camera (Gazebo → ROS 2)
            "/uav_alpha/camera/image_raw@sensor_msgs/msg/Image[gz.msgs.Image",
            # Thermal Camera (Gazebo → ROS 2)
            "/uav_alpha/thermal/image_raw@sensor_msgs/msg/Image[gz.msgs.Image",
            # Checkpoint ring pose (ROS 2 → Gazebo)
            "/model/ring_target/pose@geometry_msgs/msg/Pose]gz.msgs.Pose",
        ],
        parameters=[{"use_sim_time": True}],
    )

    # ── Moving Target Ring Node (animates the glowing beacon) ─────────────────
    target_ring_node = Node(
        package="sutra_gnc",
        executable="moving_target_ring_node.py",
        name="sutra_obstacle_ring",
        output="screen",
        parameters=[{
            # Constrain checkpoints to safely inside the 25m perimeter walls
            # Leave 5m margin → ±20m in XY, 3.5–6.5m in Z (below 4m beams ±buffer)
            "arena_x_min": -20.0,
            "arena_x_max":  20.0,
            "arena_y_min": -20.0,
            "arena_y_max":  20.0,
            "arena_z_min":  3.5,
            "arena_z_max":  6.5,
            "min_distance_between_rings": 6.0,
        }],
    )

    # ── Single Drone Offboard Controller ─────────────────────────────────────
    offboard_node = Node(
        package="sutra_gnc",
        executable="single_quadcopter_offboard_node.py",
        name="sutra_obstacle_uav_alpha",
        output="screen",
        parameters=[{
            "drone_id": "uav_alpha",
            "cruise_speed": 2.5,          # Slower speed — obstacle course
            "takeoff_altitude": 3.5,       # Below the 3.2m steel beam → 4m safe
            "initial_mode": LaunchConfiguration("mode"),
            "use_sim_time": True,
        }],
    )

    # ── Staggered startup (Gazebo → Bridge → Nodes) ───────────────────────────
    delayed_bridge = TimerAction(period=2.0, actions=[ros_gz_bridge])
    delayed_nodes  = TimerAction(period=4.0, actions=[target_ring_node, offboard_node])

    return LaunchDescription([
        headless_arg,
        mode_arg,
        LogInfo(msg=(
            "\n"
            "┌─────────────────────────────────────────────────────────────┐\n"
            "│  🚁 SUTRA — Single Drone Obstacle Course Simulation         │\n"
            "│  World  : single_drone_obstacle_world.sdf                   │\n"
            "│  Drone  : uav_alpha (X3 UAV, spawns at origin 0,0,0.2)     │\n"
            "│  Sensors: GPU-LiDAR 360° | RGB 1280×720 | Thermal 640×480  │\n"
            "│  Obs    : 8 Pillars | S-Walls | Steel Beams | Rubble |     │\n"
            "│           3 Slalom Gates | Raised Landing Platform          │\n"
            "│  Physics: DART 1ms | RTF ≥ 0.99 | Wind 2.5 m/s            │\n"
            "│  Mode   : AUTONOMOUS_RING_PURSUIT (default)                 │\n"
            "└─────────────────────────────────────────────────────────────┘\n"
        )),
        gazebo_gui,
        gazebo_headless,
        delayed_bridge,
        delayed_nodes,
    ])
