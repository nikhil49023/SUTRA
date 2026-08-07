import os
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, LogInfo
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration

def generate_launch_description():
    """
    Project SUTRA — Master 5-Subsystem Autonomous Swarm Integration Launch File
    =============================================================================
    Launches GNC (A), Comms & SwarmRAFT (B), Perception & Raycasting (C), 
    Gazebo Sim 8 Digital Twin (Sim), and Remote GCS WebSocket Gateway Bridge (D) concurrently.
    """
    sim_mode_arg = DeclareLaunchArgument(
        'sim_mode',
        default_value='true',
        description='Enable Gazebo SITL simulation mode'
    )

    world_arg = DeclareLaunchArgument(
        'world',
        default_value='high_quality_disaster_swarm_world.sdf',
        description='Gazebo Sim 8 world SDF file name'
    )

    ws_port_arg = DeclareLaunchArgument(
        'ws_port',
        default_value='9090',
        description='WebSocket port for remote GCS telemetry connection'
    )

    sim_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))

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
        executable='offboard_node.py',
        name='sutra_offboard_node',
        output='screen',
        parameters=[{
            'cruise_speed': 2.5
        }]
    )

    # 5. Subsystem A (GNC): VIO Localization & Covariance Filter Node
    vio_node = Node(
        package='sutra_gnc',
        executable='vio_localization.py',
        name='sutra_vio_localization',
        output='screen'
    )

    # 6. Subsystem A (GNC): 3D OctoMap Voxel Generator Node
    octomap_node = Node(
        package='sutra_gnc',
        executable='octomap_generator.py',
        name='sutra_octomap_generator',
        output='screen'
    )

    return LaunchDescription([
        sim_mode_arg,
        world_arg,
        ws_port_arg,
        LogInfo(msg="🚀 LAUNCHING PROJECT SUTRA MASTER 5-SUBSYSTEM SWARM PIPELINE (PBR MAX QUALITY STACK)..."),
        gcs_gateway_bridge_node,
        mesh_node,
        detector_node,
        offboard_node,
        vio_node,
        octomap_node,
    ])
