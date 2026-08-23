#!/usr/bin/env python3
"""
Project SUTRA — Subsystem A + B Integrated Sandbox Swarm Launch
================================================================
Full A+B integration stack:

  SUBSYSTEM A (GNC):
    • 5× swarm_fixed_path_node.py       — Pegasus fixed-route autopilots
    • coordinated_swarm_search_node.py  — Mission planner (sector search
                                          → survivor orbit retask on Raft event)
    • sutra_rviz_bridge.py              — TF + RViz2 marker publisher

  SUBSYSTEM B (Comms):
    • mesh_node.py (SutraMeshNode)      — 802.11s mesh + SwarmRAFT engine
                                          + Deep JSCC pipeline

  INFRASTRUCTURE:
    • Gazebo Sim 8                      — sandbox_swarm_world.sdf (80m arena)
    • ros_gz_bridge                     — all 5 drone topics
    • RViz2                             — sutra_swarm_rviz.rviz config

Data flow:
  mesh_node → /sutra/swarm/raft_consensus → coordinated_swarm_search_node
  coordinated_swarm_search_node → /sutra/gnc/search_status → sutra_rviz_bridge
  sutra_rviz_bridge → /tf + /sutra/gnc/phase_markers + /sutra/comms/raft_markers
  swarm_fixed_path_node × 5 → /sutra/swarm/path_markers → sutra_rviz_bridge

Usage:
  ros2 launch sutra_sim sandbox_swarm_ab_integrated.launch.py
  ros2 launch sutra_sim sandbox_swarm_ab_integrated.launch.py headless:=true
"""

import os
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import (
    DeclareLaunchArgument,
    ExecuteProcess,
    LogInfo,
    TimerAction,
)
from launch.substitutions import LaunchConfiguration
from launch.conditions import IfCondition, UnlessCondition


DRONE_IDS = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]

CRUISE_SPEEDS = {
    "uav_alpha":   3.8,
    "uav_beta":    4.2,
    "uav_gamma":   3.5,
    "uav_delta":   4.0,
    "uav_epsilon": 3.2,
}
TAKEOFF_ALTS = {
    "uav_alpha":   5.0,
    "uav_beta":    6.5,
    "uav_gamma":   4.0,
    "uav_delta":   7.0,
    "uav_epsilon": 5.8,
}


def generate_launch_description():
    sim_dir    = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    models_dir = os.path.join(sim_dir, "models")
    world_path = os.path.join(sim_dir, "worlds", "sandbox_swarm_world.sdf")
    rviz_cfg   = os.path.join(sim_dir, "config", "sutra_swarm_rviz.rviz")

    # ── Environment ───────────────────────────────────────────────────────────
    cyclone = os.path.realpath(os.path.join(sim_dir, "..", "..", "cyclonedds.xml"))
    if os.path.exists(cyclone):
        os.environ["CYCLONEDDS_URI"] = f"file://{cyclone}"
    os.environ["GZ_IP"]        = "127.0.0.1"
    os.environ["GZ_PARTITION"] = "sutra_sandbox_ab"

    rp = f"{sim_dir}:{models_dir}:" + os.environ.get("GZ_SIM_RESOURCE_PATH", "")
    os.environ["GZ_SIM_RESOURCE_PATH"]  = rp
    os.environ["IGN_GAZEBO_RESOURCE_PATH"] = rp

    # ── Arguments ─────────────────────────────────────────────────────────────
    headless_arg = DeclareLaunchArgument(
        "headless", default_value="false",
        description="Run Gazebo headless (no GUI)")

    no_rviz_arg = DeclareLaunchArgument(
        "no_rviz", default_value="false",
        description="Skip RViz2 launch (useful for headless CI runs)")

    # ── Gazebo Sim 8 ─────────────────────────────────────────────────────────
    gazebo_gui = ExecuteProcess(
        cmd=["gz", "sim", "-r", world_path],
        output="screen",
        condition=UnlessCondition(LaunchConfiguration("headless")))

    gazebo_headless = ExecuteProcess(
        cmd=["gz", "sim", "-r", "-s", world_path],
        output="screen",
        condition=IfCondition(LaunchConfiguration("headless")))

    # ── ROS 2 ↔ Gazebo Bridge ─────────────────────────────────────────────────
    def bridge_args_for(did: str) -> list:
        return [
            f"/{did}/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist",
            f"/model/{did}/odometry@nav_msgs/msg/Odometry[gz.msgs.Odometry",
            f"/model/{did}/pose@geometry_msgs/msg/Pose[gz.msgs.Pose",
            f"/{did}/imu@sensor_msgs/msg/Imu[gz.msgs.IMU",
            f"/{did}/lidar/points@sensor_msgs/msg/PointCloud2[gz.msgs.PointCloudPacked",
        ]

    bridge_args = (
        ["/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock"]
        + [a for did in DRONE_IDS for a in bridge_args_for(did)]
    )

    ros_gz_bridge = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        name="sutra_sandbox_ab_bridge",
        output="screen",
        arguments=bridge_args,
        parameters=[{"use_sim_time": True}])

    # ── SUBSYSTEM A: 5× Fixed-Path Autopilots ─────────────────────────────────
    def flight_node(did: str) -> Node:
        return Node(
            package="sutra_gnc",
            executable="swarm_fixed_path_node.py",
            name=f"sutra_path_{did}",
            output="screen",
            parameters=[{
                "drone_id":         did,
                "cruise_speed":     CRUISE_SPEEDS[did],
                "takeoff_altitude": TAKEOFF_ALTS[did],
                "waypoint_radius":  2.5,
                "orca_radius":      3.5,
                "max_acceleration": 2.5,
                "use_sim_time":     True,
            }])

    flight_nodes = [flight_node(did) for did in DRONE_IDS]

    # ── SUBSYSTEM A: Coordinated Swarm Search & Mission Planner ──────────────
    coordinated_search_node = Node(
        package="sutra_gnc",
        executable="coordinated_swarm_search_node.py",
        name="sutra_coordinated_search",
        output="screen",
        parameters=[{
            "max_speed":           3.0,
            "orbit_radius":        10.0,
            "min_orbit_alt":       3.5,
            "max_orbit_alt":       6.0,
            "waypoint_reach_dist": 2.0,
            "use_sim_time":        True,
        }])

    # ── SUBSYSTEM A: RViz2 Bridge (TF + markers) ──────────────────────────────
    rviz_bridge_node = Node(
        package="sutra_gnc",
        executable="sutra_rviz_bridge.py",
        name="sutra_rviz_bridge",
        output="screen",
        parameters=[{"use_sim_time": True}])

    # ── SUBSYSTEM B: SwarmRAFT Mesh Node ─────────────────────────────────────
    mesh_node = Node(
        package="sutra_comms",
        executable="mesh_node.py",
        name="sutra_mesh_node",
        output="screen",
        parameters=[{"use_sim_time": True}])

    # ── RViz2 ─────────────────────────────────────────────────────────────────
    rviz2_node = Node(
        package="rviz2",
        executable="rviz2",
        name="sutra_rviz2",
        output="screen",
        arguments=["-d", rviz_cfg],
        condition=UnlessCondition(LaunchConfiguration("no_rviz")),
        parameters=[{"use_sim_time": True}])

    # ── Staggered Startup Sequence ────────────────────────────────────────────
    # t=0s  : Gazebo starts
    # t=2s  : ROS-Gz bridge (waits for Gazebo to load world)
    # t=4s  : Sub-B mesh_node (needs bridge for odometry topics)
    # t=5s  : Sub-A flight nodes + coordinated search + RViz bridge
    # t=5.5s: RViz2 (everything publishing by now)

    delayed_bridge     = TimerAction(period=2.0,  actions=[ros_gz_bridge])
    delayed_subB       = TimerAction(period=4.0,  actions=[mesh_node])
    delayed_subA       = TimerAction(period=5.0,  actions=[
                             *flight_nodes,
                             coordinated_search_node,
                             rviz_bridge_node])
    delayed_rviz       = TimerAction(period=5.5,  actions=[rviz2_node])

    return LaunchDescription([
        headless_arg,
        no_rviz_arg,
        LogInfo(msg=(
            "\n"
            "┌────────────────────────────────────────────────────────────────────┐\n"
            "│  🚁 SUTRA — Subsystem A + B Integrated Sandbox Swarm              │\n"
            "│                                                                    │\n"
            "│  SUBSYSTEM A (GNC):                                                │\n"
            "│    • 5× swarm_fixed_path_node  — Pegasus crossing routes          │\n"
            "│    • coordinated_swarm_search  — sector search + orbit retask     │\n"
            "│    • sutra_rviz_bridge         — TF + phase/ORCA markers          │\n"
            "│                                                                    │\n"
            "│  SUBSYSTEM B (Comms):                                              │\n"
            "│    • mesh_node (SwarmRAFT + 802.11s + Deep JSCC)                  │\n"
            "│       → publishes /sutra/swarm/raft_consensus                     │\n"
            "│       → coordinated_search triggers orbit on SURVIVOR_GPS         │\n"
            "│                                                                    │\n"
            "│  VISUALISATION:                                                    │\n"
            "│    • RViz2 — Pegasus path lines | ORCA bubbles | Raft badge       │\n"
            "│    • Gazebo Sim 8 — 80m open sandbox, 5 X3 UAVs                  │\n"
            "│                                                                    │\n"
            "│  A+B INTEGRATION TEST:                                             │\n"
            "│    ros2 topic pub --once /sutra/perception/targets std_msgs/msg/String \\ │\n"
            "│      '{\"data\": \"{\\\"targets\\\":[{\\\"id\\\":\\\"T1\\\",\\\"label\\\":\\\"Survivor\\\",\\\"confidence\\\":0.97,\\\"x\\\":15.0,\\\"y\\\":5.0,\\\"z\\\":0.0}]}\"}'  │\n"
            "│                                                                    │\n"
            "└────────────────────────────────────────────────────────────────────┘\n"
        )),
        gazebo_gui,
        gazebo_headless,
        delayed_bridge,
        delayed_subB,
        delayed_subA,
        delayed_rviz,
    ])
