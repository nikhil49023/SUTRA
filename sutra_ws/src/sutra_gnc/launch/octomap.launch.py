import os
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import DeclareLaunchArgument, LogInfo
from launch.substitutions import LaunchConfiguration

def generate_launch_description():
    """
    SUTRA Subsystem A: OctoMap 3D Voxel Grid Occupancy Generator Launcher
    =====================================================================
    Launches the 3D voxel occupancy generator (0.10m resolution) parsing PointCloud2 streams,
    decaying dynamic obstacles via log-odds, and publishing MarkerArray streams to 3D GIS GCS & RViz.
    """
    resolution_arg = DeclareLaunchArgument(
        'resolution',
        default_value='0.10',
        description='Voxel resolution size in meters (0.10m)'
    )

    frame_id_arg = DeclareLaunchArgument(
        'frame_id',
        default_value='map',
        description='Global coordinate frame ID'
    )

    octomap_node = Node(
        package='sutra_gnc',
        executable='octomap_generator.py',
        name='sutra_octomap_generator',
        output='screen',
        parameters=[{
            'resolution': LaunchConfiguration('resolution'),
            'frame_id': LaunchConfiguration('frame_id'),
            'max_range': 30.0,
            'min_range': 0.25,
            'prob_hit': 0.70,
            'prob_miss': 0.40,
            'threshold_occupancy': 0.50
        }],
        remappings=[
            ('/cloud_in', '/uav_alpha/depth_camera/points'),
            ('/octomap_markers', '/sutra/gnc/octomap_markers')
        ]
    )

    return LaunchDescription([
        resolution_arg,
        frame_id_arg,
        LogInfo(msg="🧊 LAUNCHING SUTRA 3D VOXEL OCTOMAP GENERATOR NODE (0.10m RESOLUTION)..."),
        octomap_node
    ])
