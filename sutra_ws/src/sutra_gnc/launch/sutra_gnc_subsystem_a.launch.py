import os
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, LogInfo
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration

def generate_launch_description():
    """
    SUTRA Subsystem A: Master GNC & Flight Control Subsystem Launcher
    ==================================================================
    Launches the complete 4-node Subsystem A stack:
      1. offboard_node.py (PX4 trajectory dispatcher & FSM with VIO failsafe)
      2. vio_localization.py (VIO EKF2 filter & status stream)
      3. octomap_generator.py (3D Voxel OctoMap occupancy grid)
      4. orca_avoidance.py (ORCA 3D reciprocal collision avoidance solver - Gate G5)
    """
    gnc_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))

    # 1. Offboard Node
    offboard_node = Node(
        package='sutra_gnc',
        executable='offboard_node.py',
        name='sutra_offboard_node',
        output='screen'
    )

    # 2. VIO Localization Node
    vio_node = Node(
        package='sutra_gnc',
        executable='vio_localization.py',
        name='sutra_vio_localization',
        output='screen'
    )

    # 3. OctoMap Generator Node
    octomap_node = Node(
        package='sutra_gnc',
        executable='octomap_generator.py',
        name='sutra_octomap_generator',
        output='screen'
    )

    # 4. ORCA Avoidance Node
    orca_node = Node(
        package='sutra_gnc',
        executable='orca_avoidance.py',
        name='sutra_orca_avoidance',
        output='screen'
    )

    return LaunchDescription([
        LogInfo(msg="🚁 LAUNCHING COMPLETE SUTRA SUBSYSTEM A (GNC & FLIGHT CONTROL) STACK..."),
        offboard_node,
        vio_node,
        octomap_node,
        orca_node
    ])
