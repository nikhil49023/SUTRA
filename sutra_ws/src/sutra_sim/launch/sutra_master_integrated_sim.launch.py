#!/usr/bin/env python3
"""
Project SUTRA — Master Tri-Subsystem Integrated Simulation Launcher
===================================================================
Author: Tech Lead Nikhil (Tech Architect & Subsystem A + B Lead ⚡)

Location: sutra_ws/src/sutra_sim/launch/sutra_master_integrated_sim.launch.py

Orchestrates full Software-In-The-Loop (SITL) multi-drone simulation bringing together:
- Subsystem A (GNC): Parallel Sim Manager, ORCA 3D Avoidance, OctoMap Grid, Coordinated Swarm Search
- Subsystem B (Comms): 802.11s Mesh Node, Deep JSCC Neural Compression, GCS Gateway Bridge
- Subsystem C (Perception): Tri-Modal Detector & WGS84 Geolocation Engine
- Gazebo Sim 8 Digital Twin World & ROS 2 <-> Gazebo Sim Multi-UAV Topic Bridge
"""

import os
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess, LogInfo, OpaqueFunction, TimerAction
from launch.conditions import IfCondition, UnlessCondition
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def launch_setup(context, *args, **kwargs):
    sim_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    models_dir = os.path.join(sim_dir, "models")
    worlds_dir = os.path.join(sim_dir, "worlds")

    # Set Gazebo resource paths for 3D model meshes & SDFormat worlds
    resource_paths = f"{sim_dir}:{models_dir}:{worlds_dir}:" + os.environ.get("GZ_SIM_RESOURCE_PATH", "")
    os.environ["GZ_SIM_RESOURCE_PATH"] = resource_paths
    os.environ["IGN_GAZEBO_RESOURCE_PATH"] = resource_paths

    world_arg = context.perform_substitution(LaunchConfiguration('world'))
    headless_str = context.perform_substitution(LaunchConfiguration('headless'))
    sim_mode_str = context.perform_substitution(LaunchConfiguration('sim_mode'))
    is_headless = headless_str.lower() in ['true', '1', 'yes']

    if not world_arg.endswith('.sdf'):
        world_path = os.path.join(worlds_dir, f"{world_arg}.sdf")
    else:
        world_path = os.path.join(worlds_dir, world_arg)

    if not os.path.exists(world_path):
        world_path = os.path.join(worlds_dir, "master_swarm_disaster_world.sdf")
        if not os.path.exists(world_path):
            world_path = os.path.join(worlds_dir, "phase1_quadcopter_world.sdf")

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
            f"/{d}/camera/image_raw@sensor_msgs/msg/Image[gz.msgs.Image",
            f"/{d}/thermal_camera/image_raw@sensor_msgs/msg/Image[gz.msgs.Image",
        ])

    # ── ROS 2 <-> Gazebo Sim Bridge ───────────────────────────────────────────
    ros_gz_bridge_node = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        name="sutra_master_ros_gz_bridge",
        output="screen",
        arguments=bridge_args,
        parameters=[{"use_sim_time": True}],
    )

    # ── Subsystem A Nodes (GNC & Flight Control) ──────────────────────────────
    parallel_sim_manager = Node(
        package="sutra_gnc",
        executable="parallel_sim_manager.py",
        name="sutra_parallel_sim_manager",
        output="screen",
        parameters=[{"use_sim_time": True, "num_workers": 4, "target_rate_hz": 50.0}],
    )

    orca_avoidance_node = Node(
        package="sutra_gnc",
        executable="orca_avoidance.py",
        name="sutra_orca_avoidance",
        output="screen",
        parameters=[{"use_sim_time": True}],
    )

    octomap_generator_node = Node(
        package="sutra_gnc",
        executable="octomap_generator.py",
        name="sutra_octomap_generator",
        output="screen",
        parameters=[{"use_sim_time": True}],
    )

    coordinated_search_node = Node(
        package="sutra_gnc",
        executable="coordinated_swarm_search_node.py",
        name="sutra_coordinated_swarm_search",
        output="screen",
        parameters=[{"use_sim_time": True}],
    )

    # ── Subsystem B Nodes (Comms & Simulation) ────────────────────────────────
    mesh_node = Node(
        package="sutra_comms",
        executable="mesh_node.py",
        name="sutra_mesh_node",
        output="screen",
        parameters=[{"use_sim_time": True}],
    )

    jscc_node = Node(
        package="sutra_comms",
        executable="perceptron_jscc",
        name="sutra_perceptron_jscc",
        output="screen",
        parameters=[{"use_sim_time": True}],
    )

    gcs_bridge_node = Node(
        package="sutra_comms",
        executable="gcs_gateway_bridge.py",
        name="sutra_gcs_gateway_bridge",
        output="screen",
        parameters=[{"use_sim_time": True, "ws_port": 9090}],
    )

    # ── Subsystem C Node (Perception) ─────────────────────────────────────────
    detector_node = Node(
        package="sutra_perception",
        executable="detector_node",
        name="sutra_detector_node",
        output="screen",
        parameters=[{
            "sim_mode": sim_mode_str.lower() in ['true', '1', 'yes'],
            "use_sim_time": True,
            "fusion_hz": 10.0,
            "drone_alt_m": 30.0,
        }],
    )

    nodes_to_launch = [
        LogInfo(msg=f"🚁 LAUNCHING SUTRA MASTER TRI-SUBSYSTEM INTEGRATED SIMULATION | World: {os.path.basename(world_path)}"),
        gazebo_process,
        TimerAction(period=2.0, actions=[ros_gz_bridge_node]),
        TimerAction(period=3.5, actions=[parallel_sim_manager, mesh_node, jscc_node, gcs_bridge_node]),
        TimerAction(period=4.5, actions=[detector_node, orca_avoidance_node, octomap_generator_node, coordinated_search_node]),
    ]

    return nodes_to_launch


def generate_launch_description():
    world_arg = DeclareLaunchArgument(
        'world',
        default_value='master_swarm_disaster_world',
        description='World file name inside sutra_sim/worlds/'
    )
    headless_arg = DeclareLaunchArgument(
        'headless',
        default_value='false',
        description='Run Gazebo headless (true for server only, false for GUI)'
    )
    sim_mode_arg = DeclareLaunchArgument(
        'sim_mode',
        default_value='true',
        description='Run perception in SITL sim mode with sensor injection fallback'
    )

    return LaunchDescription([
        world_arg,
        headless_arg,
        sim_mode_arg,
        OpaqueFunction(function=launch_setup),
    ])
