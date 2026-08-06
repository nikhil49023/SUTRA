import os
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import DeclareLaunchArgument, ExecuteProcess, LogInfo
from launch.substitutions import LaunchConfiguration

def generate_launch_description():
    """
    Project SUTRA — Gazebo Sim 8 (Harmonic) SITL Digital Twin Launcher
    ===================================================================
    Launches Gazebo Sim 8 Harmonic disaster world (`master_swarm_disaster_world.sdf`)
    and configures ROS 2 Gazebo bridges for telemetry, depth camera, and control.
    """
    world_arg = DeclareLaunchArgument(
        'world',
        default_value='master_swarm_disaster_world.sdf',
        description='Gazebo Sim 8 world file name'
    )

    headless_arg = DeclareLaunchArgument(
        'headless',
        default_value='false',
        description='Run Gazebo in headless mode (-s server only)'
    )

    # Path to world file
    sim_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    world_path = os.path.join(sim_dir, 'worlds', 'master_swarm_disaster_world.sdf')

    # ExecuteProcess for Gazebo Sim 8 (Harmonic) engine
    gazebo_process = ExecuteProcess(
        cmd=['gz', 'sim', '-s', '-r', world_path],
        output='screen'
    )

    # ROS GZ Bridge for Gazebo Sim <-> ROS 2 topics
    ros_gz_bridge_node = Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        name='sutra_ros_gz_bridge',
        output='screen',
        parameters=[{
            'config_file': os.path.join(sim_dir, 'launch', 'ros_gz_bridge.yaml')
        }],
        arguments=[
            '/uav_alpha/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist',
            '/uav_alpha/depth_camera/points@sensor_msgs/msg/PointCloud2[gz.msgs.PointCloudPacked',
            '/camera/visual_odometry/odom@nav_msgs/msg/Odometry[gz.msgs.Odometry'
        ]
    )

    return LaunchDescription([
        world_arg,
        headless_arg,
        LogInfo(msg=f"🌐 LAUNCHING GAZEBO SIM 8 (HARMONIC) DIGITAL TWIN WORLD: {world_path}"),
        gazebo_process,
        ros_gz_bridge_node,
    ])
