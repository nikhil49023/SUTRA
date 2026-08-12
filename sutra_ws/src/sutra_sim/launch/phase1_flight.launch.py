#!/usr/bin/env python3
"""
Project SUTRA — Phase 1: Interactive Flight & Dynamic Ring Pursuit Launch
========================================================================
Launches Gazebo Sim 8 with uav_alpha and phase1_quadcopter_world.sdf,
bridges ROS 2 telemetry/control topics, animates the dynamic 3D moving target ring,
and starts the Dual-Mode Offboard Pursuit Controller.
"""

import os
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import DeclareLaunchArgument, ExecuteProcess, LogInfo, TimerAction
from launch.substitutions import LaunchConfiguration
from launch.conditions import IfCondition, UnlessCondition


def generate_launch_description():
    sim_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    models_dir = os.path.join(sim_dir, "models")
    world_path = os.path.join(sim_dir, "worlds", "phase1_quadcopter_world.sdf")

    # Set Gazebo resource paths for 3D model meshes
    resource_paths = f"{sim_dir}:{models_dir}:" + os.environ.get("GZ_SIM_RESOURCE_PATH", "")
    os.environ["GZ_SIM_RESOURCE_PATH"] = resource_paths
    os.environ["IGN_GAZEBO_RESOURCE_PATH"] = resource_paths


    headless_arg = DeclareLaunchArgument(
        "headless",
        default_value="false",
        description="Run Gazebo headless (true for server only, false for GUI)",
    )

    # ── Gazebo Sim 8 Engine ───────────────────────────────────────────────────
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

    # ── ROS 2 <-> Gazebo Sim Bridge ───────────────────────────────────────────
    ros_gz_bridge_node = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        name="sutra_phase1_ros_gz_bridge",
        output="screen",
        arguments=[
            # Simulation Clock: Gazebo -> ROS 2
            "/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock",
            # Velocity Command: ROS 2 -> Gazebo
            "/uav_alpha/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist",
            # Odometry Telemetry: Gazebo -> ROS 2
            "/model/uav_alpha/odometry@nav_msgs/msg/Odometry[gz.msgs.Odometry",
            # Pose Telemetry: Gazebo -> ROS 2
            "/model/uav_alpha/pose@geometry_msgs/msg/Pose[gz.msgs.Pose",
            # IMU Telemetry: Gazebo -> ROS 2
            "/uav_alpha/imu@sensor_msgs/msg/Imu[gz.msgs.IMU",
            # Target Ring Pose: ROS 2 -> Gazebo
            "/model/ring_target/pose@geometry_msgs/msg/Pose]gz.msgs.Pose",
        ],
        parameters=[{"use_sim_time": True}],
    )

    # ── Moving Target Ring Animation Node ──────────────────────────────────────
    target_ring_node = Node(
        package="sutra_gnc",
        executable="moving_target_ring_node.py",
        name="sutra_moving_target_ring",
        output="screen",
    )

    # ── Phase 1 Dual-Mode Offboard Controller Node ────────────────────────────
    offboard_node = Node(
        package="sutra_gnc",
        executable="single_quadcopter_offboard_node.py",
        name="sutra_phase1_offboard_uav_alpha",
        output="screen",
        parameters=[{
            "drone_id": "uav_alpha",
            "cruise_speed": 3.0,
            "takeoff_altitude": 5.0,
            "use_sim_time": True,
        }],
    )

    delayed_bridge = TimerAction(period=2.0, actions=[ros_gz_bridge_node])
    delayed_nodes = TimerAction(period=4.0, actions=[target_ring_node, offboard_node])

    return LaunchDescription([
        headless_arg,
        LogInfo(
            msg=(
                "🚁 PHASE 1: DYNAMIC AERIAL RING PURSUIT & LAPTOP TELEOP SIMULATION LAUNCH\n"
                "   UAV Target: uav_alpha\n"
                "   Target Ring: Dynamic 3D Moving Path\n"
                "   Mode: AUTONOMOUS_RING_PURSUIT (Switch to MANUAL with laptop_teleop_node.py)\n"
            )
        ),
        gazebo_gui,
        gazebo_headless,
        delayed_bridge,
        delayed_nodes,
    ])
