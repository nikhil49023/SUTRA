"""
SUTRA Subsystem C — ROS 2 Launch File
Launches the Tri-Modal Detector Node with configurable parameters.

Usage (SITL / sim mode):
  ros2 launch sutra_perception perception.launch.py sim_mode:=true

Usage (real hardware):
  ros2 launch sutra_perception perception.launch.py sim_mode:=false yolo_model:=yolov8n.pt
"""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description() -> LaunchDescription:
    # ── Launch arguments ──────────────────────────────────────────────────────
    sim_mode_arg = DeclareLaunchArgument(
        "sim_mode",
        default_value="true",
        description="Run in simulation mode (inject mock sensor data)",
    )
    yolo_model_arg = DeclareLaunchArgument(
        "yolo_model",
        default_value="yolov8n.pt",
        description="YOLOv8 model file (.pt for PyTorch, .engine for TensorRT)",
    )
    drone_alt_arg = DeclareLaunchArgument(
        "drone_alt_m",
        default_value="30.0",
        description="Default drone altitude above ground in metres",
    )
    camera_hfov_arg = DeclareLaunchArgument(
        "camera_hfov_deg",
        default_value="90.0",
        description="Camera horizontal field-of-view in degrees",
    )
    fusion_hz_arg = DeclareLaunchArgument(
        "fusion_hz",
        default_value="10.0",
        description="Fusion engine update rate in Hz",
    )

    # ── Detector node ─────────────────────────────────────────────────────────
    detector_node = Node(
        package="sutra_perception",
        executable="detector_node",
        name="sutra_detector_node",
        output="screen",
        emulate_tty=True,
        parameters=[
            {
                "sim_mode":        LaunchConfiguration("sim_mode"),
                "yolo_model":      LaunchConfiguration("yolo_model"),
                "drone_alt_m":     LaunchConfiguration("drone_alt_m"),
                "camera_hfov_deg": LaunchConfiguration("camera_hfov_deg"),
                "fusion_hz":       LaunchConfiguration("fusion_hz"),
            }
        ],
        remappings=[
            # Remap to match other subsystem topic conventions if needed
            # ("/camera/image_raw", "/drone/camera/rgb"),
        ],
    )

    return LaunchDescription([
        sim_mode_arg,
        yolo_model_arg,
        drone_alt_arg,
        camera_hfov_arg,
        fusion_hz_arg,
        detector_node,
    ])
