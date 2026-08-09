import os
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import DeclareLaunchArgument, LogInfo
from launch.substitutions import LaunchConfiguration


def generate_launch_description():
    """
    Project SUTRA — Subsystem A Isolated Autonomous Target Pursuit Launcher
    ======================================================================
    Launches Subsystem A VIO Localization, OctoMap Generator, NMPC Target Pursuit Controller,
    and 50Hz Offboard Node in isolated simulation mode.
    """
    drone_id_arg = DeclareLaunchArgument(
        'drone_id',
        default_value='uav_alpha',
        description='UAV Drone Agent Identifier'
    )

    pattern_arg = DeclareLaunchArgument(
        'sim_target_pattern',
        default_value='LEMNISCATE_8',
        description='Simulated Target Trajectory Pattern (CIRCLE, LEMNISCATE_8, WAYPOINT_PATH)'
    )

    drone_id = LaunchConfiguration('drone_id')
    pattern = LaunchConfiguration('sim_target_pattern')

    # 1. VIO Localization Node (Factor Graph + IMU Debiasing)
    vio_node = Node(
        package='sutra_gnc',
        executable='vio_localization.py',
        name='sutra_vio_localization',
        output='screen'
    )

    # 2. OctoMap 3D Voxel Generator Node (Geometric Downsampling)
    octomap_node = Node(
        package='sutra_gnc',
        executable='octomap_generator.py',
        name='sutra_octomap_generator',
        output='screen'
    )

    # 3. Offboard Control Node (50Hz Setpoint Engine)
    offboard_node = Node(
        package='sutra_gnc',
        executable='offboard_node.py',
        name='sutra_offboard_node',
        output='screen',
        parameters=[{
            'drone_id': drone_id,
            'cruise_speed': 3.0,
            'safety_buffer_m': 3.0
        }]
    )

    # 4. Dynamic Target Pursuit Node (NMPC Predictive Lead-Point Pursuit)
    target_tracker_node = Node(
        package='sutra_gnc',
        executable='target_tracker_node.py',
        name='sutra_target_tracker',
        output='screen',
        parameters=[{
            'drone_id': drone_id,
            'standoff_dist_m': 4.0,
            'standoff_alt_m': 8.0,
            'sim_target_pattern': pattern
        }]
    )

    return LaunchDescription([
        drone_id_arg,
        pattern_arg,
        LogInfo(msg="🎯 LAUNCHING SUBSYSTEM A ISOLATED AUTONOMOUS TARGET PURSUIT STACK..."),
        vio_node,
        octomap_node,
        offboard_node,
        target_tracker_node,
    ])
