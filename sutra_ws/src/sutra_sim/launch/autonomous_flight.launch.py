#!/usr/bin/env python3
"""
Project SUTRA — Autonomous 5-Drone Swarm Flight Launch
=====================================================
Launches Gazebo Sim 8 (Harmonic) with 5 autonomous drones (uav_alpha, uav_beta,
uav_gamma, uav_delta, uav_epsilon) in the empty_flight world.
Each drone is commanded by its own sutra_offboard_control node in 3D swarm formation.
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

    headless_arg = DeclareLaunchArgument(
        "headless",
        default_value="false",
        description="Run Gazebo headless (true for server only, false for GUI)",
    )

    world_path = os.path.join(sim_dir, "worlds", "empty_flight.sdf")

    # ── Gazebo Sim 8 ──────────────────────────────────────────────────────────
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

    # ── ROS ↔ Gazebo Bridge (All 5 Swarm Drones) ───────────────────────────────
    ros_gz_bridge = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        name="sutra_swarm_ros_gz_bridge",
        output="screen",
        arguments=[
            # Velocity commands: ROS -> Gazebo
            "/uav_alpha/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist",
            "/uav_beta/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist",
            "/uav_gamma/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist",
            "/uav_delta/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist",
            "/uav_epsilon/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist",
            # Pose telemetry: Gazebo -> ROS
            "/model/uav_alpha/pose@geometry_msgs/msg/Pose[gz.msgs.Pose",
            "/model/uav_beta/pose@geometry_msgs/msg/Pose[gz.msgs.Pose",
            "/model/uav_gamma/pose@geometry_msgs/msg/Pose[gz.msgs.Pose",
            "/model/uav_delta/pose@geometry_msgs/msg/Pose[gz.msgs.Pose",
            "/model/uav_epsilon/pose@geometry_msgs/msg/Pose[gz.msgs.Pose",
            # IMUs
            "/uav_alpha/imu@sensor_msgs/msg/Imu[gz.msgs.IMU",
            "/uav_beta/imu@sensor_msgs/msg/Imu[gz.msgs.IMU",
            "/uav_gamma/imu@sensor_msgs/msg/Imu[gz.msgs.IMU",
            "/uav_delta/imu@sensor_msgs/msg/Imu[gz.msgs.IMU",
            "/uav_epsilon/imu@sensor_msgs/msg/Imu[gz.msgs.IMU",
        ],
        parameters=[{"use_sim_time": True}],
    )

    # ── 5 Swarm Drone Offboard Controllers (Subsystem A) ──────────────────────
    swarm_drones = [
        {"id": "uav_alpha",   "start_x": 0.0,   "start_y": 0.0,   "start_z": 0.0,  "speed": 2.5},
        {"id": "uav_beta",    "start_x": 10.0,  "start_y": 10.0,  "start_z": 3.0,  "speed": 2.8},
        {"id": "uav_gamma",   "start_x": -10.0, "start_y": 10.0,  "start_z": -1.0, "speed": 2.2},
        {"id": "uav_delta",   "start_x": 15.0,  "start_y": -10.0, "start_z": 7.0,  "speed": 3.0},
        {"id": "uav_epsilon", "start_x": -15.0, "start_y": -10.0, "start_z": 10.0, "speed": 2.0},
    ]

    controller_nodes = [
        Node(
            package="sutra_gnc",
            executable="offboard_node.py",
            name=f"sutra_offboard_{d['id']}",
            output="screen",
            parameters=[{
                "drone_id": d["id"],
                "start_x": d["start_x"],
                "start_y": d["start_y"],
                "start_z": d["start_z"],
                "cruise_speed": d["speed"],
                "use_sim_time": True,
            }],
        )
        for d in swarm_drones
    ]

    delayed_bridge = TimerAction(period=3.0, actions=[ros_gz_bridge])
    delayed_controllers = TimerAction(period=5.0, actions=controller_nodes)

    return LaunchDescription(
        [
            headless_arg,
            LogInfo(
                msg=(
                    "🚁 PROJECT SUTRA — 5-DRONE AUTONOMOUS SWARM FLIGHT LAUNCH\n"
                    "   Drones: uav_alpha, uav_beta, uav_gamma, uav_delta, uav_epsilon\n"
                    "   World : empty_flight.sdf (5 VelocityControl Multicopters)\n"
                )
            ),
            gazebo_gui,
            gazebo_headless,
            delayed_bridge,
            delayed_controllers,
        ]
    )
