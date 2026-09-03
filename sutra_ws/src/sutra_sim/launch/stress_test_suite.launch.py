#!/usr/bin/env python3
"""
Project SUTRA — Scenario-Based Gazebo Sim 8 Stress Test Suite Master Launcher
===========================================================================
Location: sutra_ws/src/sutra_sim/launch/stress_test_suite.launch.py

Launches Gazebo Sim 8 GUI/Headless engine, sets GZ_SIM_RESOURCE_PATH, bridges
ROS 2 <-> Gazebo Sim topics via parameter_bridge, and starts scenario-specific
GNC nodes.

Supported Scenarios:
- orca_swarm
- wind
- gps_denied
- octomap
- motor_failure
- huge_swarm
- back_to_base

Usage:
  ros2 launch sutra_sim stress_test_suite.launch.py scenario:=huge_swarm
  ros2 launch sutra_sim stress_test_suite.launch.py scenario:=motor_failure
  ros2 launch sutra_sim stress_test_suite.launch.py scenario:=wind headless:=true
"""

import os
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess, LogInfo, OpaqueFunction, TimerAction
from launch.conditions import IfCondition, UnlessCondition
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from ament_index_python.packages import get_package_share_directory


def launch_setup(context, *args, **kwargs):
    scenario_str = context.perform_substitution(LaunchConfiguration('scenario'))
    headless_str = context.perform_substitution(LaunchConfiguration('headless'))
    is_headless = headless_str.lower() in ['true', '1', 'yes']

    sim_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    models_dir = os.path.join(sim_dir, "models")
    worlds_dir = os.path.join(sim_dir, "worlds")

    # Set Gazebo resource paths for 3D model meshes
    resource_paths = f"{sim_dir}:{models_dir}:{worlds_dir}:" + os.environ.get("GZ_SIM_RESOURCE_PATH", "")
    os.environ["GZ_SIM_RESOURCE_PATH"] = resource_paths
    os.environ["IGN_GAZEBO_RESOURCE_PATH"] = resource_paths

    world_map = {
        'orca_swarm': os.path.join(worlds_dir, 'stress_swarm_orca_crossing.sdf'),
        'wind': os.path.join(worlds_dir, 'stress_wind_turbulent_world.sdf'),
        'gps_denied': os.path.join(worlds_dir, 'stress_gps_denied_canyon.sdf'),
        'octomap': os.path.join(worlds_dir, 'stress_high_density_octomap.sdf'),
        'motor_failure': os.path.join(worlds_dir, 'stress_motor_failure.sdf'),
        'huge_swarm': os.path.join(worlds_dir, 'stress_huge_swarm_coordination.sdf'),
        'back_to_base': os.path.join(worlds_dir, 'stress_swarm_orca_crossing.sdf'),
        'coordinated_search': os.path.join(worlds_dir, 'stress_coordinated_search.sdf'),
    }

    world_path = world_map.get(scenario_str, world_map['orca_swarm'])

    # ── Gazebo Sim 8 Engine Process ───────────────────────────────────────────
    gz_cmd = ["gz", "sim", "-r"]
    if is_headless:
        gz_cmd.append("-s")
    gz_cmd.append(world_path)

    gazebo_process = ExecuteProcess(
        cmd=gz_cmd,
        output="screen",
    )

    drones = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]
    bridge_args = ["/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock"]
    for d in drones:
        bridge_args.extend([
            f"/{d}/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist",
            f"/model/{d}/odometry@nav_msgs/msg/Odometry[gz.msgs.Odometry",
            f"/model/{d}/pose@geometry_msgs/msg/Pose[gz.msgs.Pose",
            f"/{d}/imu@sensor_msgs/msg/Imu[gz.msgs.IMU",
            f"/{d}/lidar/points@sensor_msgs/msg/PointCloud2[gz.msgs.PointCloudPacked",
        ])

    # ── ROS 2 <-> Gazebo Sim Bridge ───────────────────────────────────────────
    ros_gz_bridge_node = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        name="sutra_stress_ros_gz_bridge",
        output="screen",
        arguments=bridge_args,
        parameters=[{"use_sim_time": True}],
    )

    # ── ROS 2 Subsystem A Nodes ───────────────────────────────────────────────
    stress_manager_node = Node(
        package='sutra_gnc',
        executable='stress_test_manager.py',
        name='stress_test_manager',
        output='screen',
        parameters=[{"use_sim_time": True}],
    )

    nodes_to_launch = [
        LogInfo(msg=f"🚁 LAUNCHING SUTRA SIMULATION SCENARIO: [{scenario_str.upper()}] | World: {os.path.basename(world_path)} | Headless: {is_headless}"),
        gazebo_process,
        TimerAction(period=2.0, actions=[ros_gz_bridge_node]),
        TimerAction(period=3.5, actions=[stress_manager_node]),
    ]

    # Scenario-specific nodes
    if scenario_str in ['orca_swarm', 'huge_swarm', 'back_to_base']:
        orca_node = Node(
            package='sutra_gnc',
            executable='orca_avoidance.py',
            name='orca_avoidance_node',
            output='screen',
            parameters=[{"use_sim_time": True}],
        )
        nodes_to_launch.append(TimerAction(period=4.0, actions=[orca_node]))

    if scenario_str in ['motor_failure', 'back_to_base']:
        motor_fallback_node = Node(
            package='sutra_gnc',
            executable='motor_failure_fallback_node.py',
            name='motor_failure_fallback_node',
            output='screen',
            parameters=[{"use_sim_time": True}],
        )
        nodes_to_launch.append(TimerAction(period=4.0, actions=[motor_fallback_node]))

    if scenario_str in ['octomap', 'gps_denied', 'huge_swarm']:
        octomap_node = Node(
            package='sutra_gnc',
            executable='octomap_generator.py',
            name='octomap_generator_node',
            output='screen',
            parameters=[{"use_sim_time": True}],
        )
        nodes_to_launch.append(TimerAction(period=4.0, actions=[octomap_node]))

    if scenario_str == 'coordinated_search':
        mesh_node = Node(
            package='sutra_comms',
            executable='mesh_node.py',
            name='sutra_mesh_node',
            output='screen',
            parameters=[{"use_sim_time": True}],
        )
        orca_node = Node(
            package='sutra_gnc',
            executable='orca_avoidance.py',
            name='orca_avoidance_node',
            output='screen',
            parameters=[{"use_sim_time": True}],
        )
        coordinated_search_node = Node(
            package='sutra_gnc',
            executable='coordinated_swarm_search_node.py',
            name='coordinated_swarm_search_node',
            output='screen',
            parameters=[{"use_sim_time": True}],
        )
        nodes_to_launch.append(TimerAction(period=4.0, actions=[mesh_node, orca_node, coordinated_search_node]))

    return nodes_to_launch


def generate_launch_description():
    scenario_arg = DeclareLaunchArgument(
        'scenario',
        default_value='orca_swarm',
        description='Stress scenario name: [orca_swarm, wind, gps_denied, octomap, motor_failure, huge_swarm, back_to_base, coordinated_search]'
    )

    headless_arg = DeclareLaunchArgument(
        'headless',
        default_value='false',
        description='Run Gazebo headless (true for server only, false for GUI)'
    )

    return LaunchDescription([
        scenario_arg,
        headless_arg,
        OpaqueFunction(function=launch_setup),
    ])
