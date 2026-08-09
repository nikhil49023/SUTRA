#!/usr/bin/env python3
"""
Project SUTRA — Phase 1: Single Quadcopter Autonomous Flight Launch
===================================================================
Launches Gazebo Sim 8 with single quadcopter (uav_alpha) in phase1_quadcopter_world.sdf,
bridges ROS 2 telemetry/control topics, and executes the Phase 1 Offboard Flight Controller.
"""

import os
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import DeclareLaunchArgument, ExecuteProcess, LogInfo, TimerAction
from launch.substitutions import LaunchConfiguration
from launch.conditions import IfCondition, UnlessCondition


def generate_launch_description():
    sim_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    world_path = os.path.join(sim_dir, "worlds", "phase1_quadcopter_world.sdf")

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

    # ── ROS 2 <-> Gazebo Sim Bridge for uav_alpha ──────────────────────────────
    ros_gz_bridge_node = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        name="sutra_phase1_ros_gz_bridge",
        output="screen",
        arguments=[
            # Velocity Command: ROS 2 -> Gazebo
            "/uav_alpha/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist",
            # Pose Telemetry: Gazebo -> ROS 2
            "/model/uav_alpha/pose@geometry_msgs/msg/Pose[gz.msgs.Pose",
            # IMU Telemetry: Gazebo -> ROS 2
            "/uav_alpha/imu@sensor_msgs/msg/Imu[gz.msgs.IMU",
        ],
        parameters=[{"use_sim_time": True}],
    )

    # ── Phase 1 Offboard Controller Node ──────────────────────────────────────
    offboard_node = Node(
        package="sutra_gnc",
        executable="single_quadcopter_offboard_node.py",
        name="sutra_phase1_offboard_uav_alpha",
        output="screen",
        parameters=[{
            "drone_id": "uav_alpha",
            "cruise_speed": 2.5,
            "takeoff_altitude": 5.0,
            "use_sim_time": True,
        }],
    )

    delayed_bridge = TimerAction(period=2.0, actions=[ros_gz_bridge_node])
    delayed_controller = TimerAction(period=4.0, actions=[offboard_node])

    return LaunchDescription([
        headless_arg,
        LogInfo(msg="🚁 PHASE 1: SINGLE QUADCOPTER AUTONOMOUS FLIGHT LAUNCH (uav_alpha)"),
        gazebo_gui,
        gazebo_headless,
        delayed_bridge,
        delayed_controller,
    ])
