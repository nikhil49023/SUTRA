import os
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import DeclareLaunchArgument, LogInfo
from launch.substitutions import LaunchConfiguration

def generate_launch_description():
    """
    Project SUTRA — Master 5-Subsystem Autonomous Swarm Integration Launch File
    =============================================================================
    Launches GNC (A), Comms & SwarmRAFT (B), Perception & Raycasting (C), 
    and Remote GCS WebSocket Gateway Bridge (D) concurrently.
    """
    sim_mode_arg = DeclareLaunchArgument(
        'sim_mode',
        default_value='true',
        description='Enable Gazebo SITL simulation mode'
    )

    ws_port_arg = DeclareLaunchArgument(
        'ws_port',
        default_value='9090',
        description='WebSocket port for remote GCS telemetry connection'
    )

    # 1. Subsystem B (Comms): Remote GCS Gateway Bridge Node
    gcs_gateway_bridge_node = Node(
        package='sutra_comms',
        executable='gcs_gateway_bridge',
        name='sutra_gcs_gateway_bridge',
        output='screen',
        parameters=[{
            'port': LaunchConfiguration('ws_port'),
            'host': '0.0.0.0'
        }]
    )

    # 2. Subsystem B (Comms): Swarm Mesh & SwarmRAFT Consensus Node
    mesh_node = Node(
        package='sutra_comms',
        executable='mesh_node',
        name='sutra_mesh_node',
        output='screen',
        parameters=[{
            'sim_mode': LaunchConfiguration('sim_mode')
        }]
    )

    # 3. Subsystem C (Perception): AI Edge Detector & GPS Raycaster Node
    detector_node = Node(
        package='sutra_perception',
        executable='detector_node',
        name='sutra_detector_node',
        output='screen',
        parameters=[{
            'sim_mode': LaunchConfiguration('sim_mode'),
            'yolo_model': 'yolov8n.pt'
        }]
    )

    # 4. Subsystem A (GNC): Offboard Controller Node
    offboard_node = Node(
        package='sutra_gnc',
        executable='offboard_node',
        name='sutra_offboard_node',
        output='screen',
        parameters=[{
            'cruise_speed': 2.5
        }]
    )

    return LaunchDescription([
        sim_mode_arg,
        ws_port_arg,
        LogInfo(msg="🚀 LAUNCHING PROJECT SUTRA MASTER SWARM INTEGRATION PIPELINE..."),
        gcs_gateway_bridge_node,
        mesh_node,
        detector_node,
        offboard_node,
    ])
