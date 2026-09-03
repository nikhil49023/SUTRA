#!/usr/bin/env python3
"""
Project SUTRA — 5-Drone Sandbox Swarm Launch
=============================================
Launches Gazebo Sim 8 with 5 X3 UAVs in an open sandbox arena.
Each drone follows a deterministic looping waypoint route — the routes
are designed so their planned trajectories cross each other (Pegasus
star pattern), but the inline ORCA avoidance in each node ensures no
physical drone-drone collision (Gate G5: ≥ 3.5m clearance).

Usage:
  ros2 launch sutra_sim sandbox_swarm.launch.py
  ros2 launch sutra_sim sandbox_swarm.launch.py headless:=true
"""

import os
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import (
    DeclareLaunchArgument,
    ExecuteProcess,
    LogInfo,
    TimerAction,
    GroupAction,
)
from launch.substitutions import LaunchConfiguration
from launch.conditions import IfCondition, UnlessCondition


DRONE_IDS = [
    "uav_alpha",
    "uav_beta",
    "uav_gamma",
    "uav_delta",
    "uav_epsilon",
]

# Cruise speeds staggered slightly to desynchronise waypoint arrival times
# and reduce simultaneous crossing events
CRUISE_SPEEDS = {
    "uav_alpha":   3.8,
    "uav_beta":    4.2,
    "uav_gamma":   3.5,
    "uav_delta":   4.0,
    "uav_epsilon": 3.2,
}

# Takeoff altitude for each drone — must match the first waypoint Z in the route
TAKEOFF_ALTS = {
    "uav_alpha":   5.0,
    "uav_beta":    6.5,
    "uav_gamma":   4.0,
    "uav_delta":   7.0,
    "uav_epsilon": 5.8,
}


def generate_launch_description():
    sim_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    models_dir = os.path.join(sim_dir, "models")
    world_path = os.path.join(sim_dir, "worlds", "sandbox_swarm_world.sdf")

    # ── Environment ───────────────────────────────────────────────────────────
    cyclonedds_path = os.path.realpath(
        os.path.join(sim_dir, "..", "..", "cyclonedds.xml")
    )
    if os.path.exists(cyclonedds_path):
        os.environ["CYCLONEDDS_URI"] = f"file://{cyclonedds_path}"

    os.environ["GZ_IP"] = "127.0.0.1"
    os.environ["GZ_PARTITION"] = "sutra_sandbox"

    resource_paths = (
        f"{sim_dir}:{models_dir}:"
        + os.environ.get("GZ_SIM_RESOURCE_PATH", "")
    )
    os.environ["GZ_SIM_RESOURCE_PATH"] = resource_paths
    os.environ["IGN_GAZEBO_RESOURCE_PATH"] = resource_paths

    # ── Launch Arguments ──────────────────────────────────────────────────────
    headless_arg = DeclareLaunchArgument(
        "headless",
        default_value="false",
        description="Run Gazebo headless (no GUI)",
    )

    # ── Gazebo Sim 8 ─────────────────────────────────────────────────────────
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

    # ── ROS 2 ↔ Gazebo Bridge — one topic block per drone ────────────────────
    def bridge_args_for(drone_id: str) -> list:
        return [
            # Velocity (ROS 2 → Gazebo)
            f"/{drone_id}/gazebo/command/twist"
            f"@geometry_msgs/msg/TwistStamped]gz.msgs.Twist",
            # Odometry (Gazebo → ROS 2)
            f"/model/{drone_id}/odometry"
            f"@nav_msgs/msg/Odometry[gz.msgs.Odometry",
            # Pose (Gazebo → ROS 2)
            f"/model/{drone_id}/pose"
            f"@geometry_msgs/msg/Pose[gz.msgs.Pose",
            # IMU (Gazebo → ROS 2)
            f"/{drone_id}/imu"
            f"@sensor_msgs/msg/Imu[gz.msgs.IMU",
            # Barometer (Gazebo → ROS 2)
            f"/{drone_id}/air_pressure"
            f"@sensor_msgs/msg/FluidPressure[gz.msgs.FluidPressure",
            # Magnetometer (Gazebo → ROS 2)
            f"/{drone_id}/magnetometer"
            f"@sensor_msgs/msg/MagneticField[gz.msgs.Magnetometer",
            # GNSS / NavSat (Gazebo → ROS 2)
            f"/{drone_id}/navsat"
            f"@sensor_msgs/msg/NavSatFix[gz.msgs.NavSat",
            # LiDAR (Gazebo → ROS 2)
            f"/{drone_id}/lidar/points"
            f"@sensor_msgs/msg/PointCloud2[gz.msgs.PointCloudPacked",
            # Downward Rangefinder / Altimeter (Gazebo → ROS 2)
            f"/{drone_id}/rangefinder/distance"
            f"@sensor_msgs/msg/LaserScan[gz.msgs.LaserScan",
        ]

    all_bridge_args = (
        ["/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock"]
        + [arg for did in DRONE_IDS for arg in bridge_args_for(did)]
    )

    ros_gz_bridge = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        name="sutra_sandbox_ros_gz_bridge",
        output="screen",
        arguments=all_bridge_args,
        parameters=[{"use_sim_time": True}],
    )

    # ── One flight controller node per drone ──────────────────────────────────
    def flight_node(drone_id: str) -> Node:
        return Node(
            package="sutra_gnc",
            executable="swarm_fixed_path_node.py",
            name=f"sutra_path_{drone_id}",
            output="screen",
            parameters=[{
                "drone_id": drone_id,
                "cruise_speed": CRUISE_SPEEDS[drone_id],
                "takeoff_altitude": TAKEOFF_ALTS[drone_id],
                "waypoint_radius": 2.5,
                "orca_radius": 3.5,
                "max_acceleration": 2.5,
                "use_sim_time": True,
            }],
        )

    flight_nodes = [flight_node(did) for did in DRONE_IDS]

    # ── Staggered startup ─────────────────────────────────────────────────────
    # Bridge waits 2s for Gazebo to initialise
    delayed_bridge = TimerAction(period=2.0, actions=[ros_gz_bridge])
    # Flight nodes wait another 3s for bridge to be ready (total 5s from Gazebo start)
    delayed_flights = TimerAction(period=5.0, actions=flight_nodes)

    return LaunchDescription([
        headless_arg,
        LogInfo(msg=(
            "\n"
            "┌──────────────────────────────────────────────────────────────────┐\n"
            "│  🚁 SUTRA — 5-Drone Sandbox Swarm Simulation                    │\n"
            "│  World   : sandbox_swarm_world.sdf (80m × 80m open arena)       │\n"
            "│  Drones  : alpha | beta | gamma | delta | epsilon               │\n"
            "│  Pattern : Pegasus star — planned paths cross, ORCA avoids      │\n"
            "│  ORCA    : 3.5m avoidance radius | Gate G5 ≥ 3.5m clearance    │\n"
            "│  Physics : DART 1ms | RTF ≥ 0.99 | No wind                     │\n"
            "│  Bridge  : starts @ t+2s | Flight nodes start @ t+5s           │\n"
            "└──────────────────────────────────────────────────────────────────┘\n"
        )),
        gazebo_gui,
        gazebo_headless,
        delayed_bridge,
        delayed_flights,
    ])
