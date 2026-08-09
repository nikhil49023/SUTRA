import os
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess, LogInfo
from launch.substitutions import LaunchConfiguration

def generate_launch_description():
    """
    SUTRA Subsystem A: PX4 MicroXRCE-DDS Communications Bridge Launcher
    ====================================================================
    Launches the MicroXRCEAgent process on UDP port 8888 for PX4 SITL/hardware DDS bridge.
    Establishes real-time DDS topic bridging for VehicleVisualOdometry, OffboardControlMode, and TrajectorySetpoint.
    """
    port_arg = DeclareLaunchArgument(
        'port',
        default_value='8888',
        description='UDP port for MicroXRCEAgent DDS bridge connection'
    )

    baud_arg = DeclareLaunchArgument(
        'baud',
        default_value='921600',
        description='Serial baud rate for physical flight controller connection'
    )

    transport_arg = DeclareLaunchArgument(
        'transport',
        default_value='udp4',
        description='Transport protocol: udp4, udp6, serial, or ptymux'
    )

    port = LaunchConfiguration('port')
    transport = LaunchConfiguration('transport')

    # ExecuteProcess for MicroXRCEAgent DDS bridge
    micro_xrce_agent = ExecuteProcess(
        cmd=['MicroXRCEAgent', transport, '-p', port],
        output='screen'
    )

    return LaunchDescription([
        port_arg,
        baud_arg,
        transport_arg,
        LogInfo(msg="📡 LAUNCHING SUTRA PX4 MICRO-XRCE-DDS BRIDGE AGENT ON UDP PORT 8888..."),
        micro_xrce_agent
    ])
