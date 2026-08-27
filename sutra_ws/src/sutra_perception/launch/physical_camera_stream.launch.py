#!/usr/bin/env python3
"""
Project SUTRA — Physical Payload Camera & Perception Launch File
================================================================
Launches the physical camera streamer and the Tri-Modal Perception node
for physical drone hardware operations.

Usage:
  # Launch with USB/V4L2 camera (/dev/video0):
  ros2 launch sutra_perception physical_camera_stream.launch.py visual_source_type:=v4l2 visual_source_path:=/dev/video0

  # Launch with RTSP IP gimbal camera:
  ros2 launch sutra_perception physical_camera_stream.launch.py visual_source_type:=rtsp visual_source_path:=rtsp://192.168.1.100:8554/live

  # Launch in synthetic hardware test mode (bench testing):
  ros2 launch sutra_perception physical_camera_stream.launch.py visual_source_type:=synthetic_test
"""

import os
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description() -> LaunchDescription:
    # ── Launch Arguments ──────────────────────────────────────────────────────
    drone_id_arg = DeclareLaunchArgument(
        "drone_id",
        default_value="uav_alpha",
        description="Unique drone identifier namespace (e.g. uav_alpha, uav_beta)",
    )
    visual_source_type_arg = DeclareLaunchArgument(
        "visual_source_type",
        default_value="synthetic_test",
        description="Visual camera source: v4l2, csi_jetson, csi_rpi, rtsp, synthetic_test",
    )
    visual_source_path_arg = DeclareLaunchArgument(
        "visual_source_path",
        default_value="/dev/video0",
        description="Path or URL to visual camera (/dev/video0, RTSP URL, or sensor ID)",
    )
    enable_thermal_arg = DeclareLaunchArgument(
        "enable_thermal",
        default_value="true",
        description="Enable thermal LWIR camera capture",
    )
    thermal_source_type_arg = DeclareLaunchArgument(
        "thermal_source_type",
        default_value="synthetic_test",
        description="Thermal camera source: v4l2, rtsp, synthetic_test",
    )
    thermal_source_path_arg = DeclareLaunchArgument(
        "thermal_source_path",
        default_value="/dev/video2",
        description="Path or URL to thermal camera (/dev/video2 or RTSP URL)",
    )
    width_arg = DeclareLaunchArgument(
        "width",
        default_value="640",
        description="Frame width resolution",
    )
    height_arg = DeclareLaunchArgument(
        "height",
        default_value="480",
        description="Frame height resolution",
    )
    fps_arg = DeclareLaunchArgument(
        "fps",
        default_value="30",
        description="Streaming frame rate in FPS",
    )

    # ── Camera Streamer Node ──────────────────────────────────────────────────
    streamer_node = Node(
        package="sutra_perception",
        executable="camera_streamer_node",
        name="sutra_camera_streamer",
        output="screen",
        emulate_tty=True,
        parameters=[
            {
                "drone_id":            LaunchConfiguration("drone_id"),
                "visual_source_type":  LaunchConfiguration("visual_source_type"),
                "visual_source_path":  LaunchConfiguration("visual_source_path"),
                "enable_thermal":      LaunchConfiguration("enable_thermal"),
                "thermal_source_type": LaunchConfiguration("thermal_source_type"),
                "thermal_source_path": LaunchConfiguration("thermal_source_path"),
                "width":               LaunchConfiguration("width"),
                "height":              LaunchConfiguration("height"),
                "fps":                 LaunchConfiguration("fps"),
            }
        ],
    )

    # ── Tri-Modal AI Perception Detector Node ─────────────────────────────────
    detector_node = Node(
        package="sutra_perception",
        executable="detector_node",
        name="sutra_detector_node",
        output="screen",
        emulate_tty=True,
        parameters=[
            {
                "sim_mode": False,
                "yolo_model": "yolov8n.pt",
                "drone_alt_m": 30.0,
                "camera_hfov_deg": 90.0,
                "fusion_hz": 10.0,
            }
        ],
    )

    return LaunchDescription(
        [
            drone_id_arg,
            visual_source_type_arg,
            visual_source_path_arg,
            enable_thermal_arg,
            thermal_source_type_arg,
            thermal_source_path_arg,
            width_arg,
            height_arg,
            fps_arg,
            streamer_node,
            detector_node,
        ]
    )
