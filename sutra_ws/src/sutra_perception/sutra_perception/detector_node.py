#!/usr/bin/env python3
"""
SUTRA Subsystem C: Tri-Modal AI Perception & Sensor Fusion Node
================================================================
Lead Engineer : Vedanth Sai Ram
Branch        : feature/subsystem-c-perception
Package       : sutra_perception

Architecture:
  Three independent sensor subscribers feed into a shared fusion engine
  that runs on a fixed 10 Hz timer. Fused detections are published as
  JSON strings to /sutra/perception/targets for Subsystem D (GCS).

Sensor Modalities:
  1. Visual  – YOLOv8-Nano on /camera/image_raw  (RGB)
  2. Thermal – OpenCV blob on /thermal/image_raw  (16-bit thermal)
  3. Radar   – Cluster analysis on /radar/scan    (simple 2-D range data)

GPS Raycast:
  Converts drone-relative XY offsets (metres) → WGS84 GPS coordinates
  using drone telemetry from /sutra/gnc/pose.
"""

from __future__ import annotations

import json
import math
import os
import time
import threading
from dataclasses import dataclass, field
from typing import Any, List, Optional, Tuple

import cv2
import numpy as np
try:
    import rclpy
    from rclpy.node import Node
    from rclpy.qos import QoSProfile, ReliabilityPolicy
    from sensor_msgs.msg import Image, LaserScan
    from std_msgs.msg import String
    from geometry_msgs.msg import PoseStamped
    from nav_msgs.msg import Odometry
    RCLPY_AVAILABLE = True
except ImportError:
    rclpy = None
    Node = object
    QoSProfile = None
    ReliabilityPolicy = None
    Image = None
    LaserScan = None
    String = None
    PoseStamped = None
    Odometry = None
    RCLPY_AVAILABLE = False

# ByteTrack multi-object tracker (pure Python, no extra deps)
from sutra_perception.bytetrack import SutraByteTracker, TrackedTarget, TrackState

# ──────────────────────────────────────────────────────────────────────────────
# Robust ROS Image <-> OpenCV bridge with pure-Python NumPy fallback
# ──────────────────────────────────────────────────────────────────────────────
class SutraCvBridge:
    """ROS Image to OpenCV converter with pure-Python fallback for NumPy 2.x ABI resilience."""
    def __init__(self):
        self._native_bridge = None
        try:
            if not np.__version__.startswith("2."):
                from cv_bridge import CvBridge
                self._native_bridge = CvBridge()
        except BaseException:
            self._native_bridge = None

    def imgmsg_to_cv2(self, img_msg: Any, desired_encoding: str = "passthrough") -> np.ndarray:
        if self._native_bridge is not None:
            try:
                return self._native_bridge.imgmsg_to_cv2(img_msg, desired_encoding=desired_encoding)
            except Exception:
                pass

        # Pure-Python fallback for sensor_msgs/Image
        dtype = np.uint8
        encoding = getattr(img_msg, "encoding", "bgr8")
        if encoding in ["mono8", "8UC1"]:
            channels = 1
        elif encoding in ["bgr8", "rgb8", "8UC3"]:
            channels = 3
        elif encoding in ["bgra8", "rgba8", "8UC4"]:
            channels = 4
        elif encoding in ["32FC1", "32F"]:
            dtype = np.float32
            channels = 1
        elif encoding in ["16UC1", "16U"]:
            dtype = np.uint16
            channels = 1
        else:
            channels = 1

        img = np.frombuffer(img_msg.data, dtype=dtype)
        if hasattr(img_msg, "height") and hasattr(img_msg, "width") and img_msg.height > 0 and img_msg.width > 0:
            if channels > 1:
                img = img.reshape((img_msg.height, img_msg.width, channels))
            else:
                img = img.reshape((img_msg.height, img_msg.width))

        if desired_encoding == "bgr8" and encoding == "rgb8":
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        elif desired_encoding == "rgb8" and encoding == "bgr8":
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        return img

CV_BRIDGE_AVAILABLE = True

try:
    import torch
    TORCH_AVAILABLE = True
    # Limit PyTorch CPU thread flooding on multi-core systems
    torch.set_num_threads(2)
except ImportError:
    TORCH_AVAILABLE = False

try:
    # Limit OpenCV worker threads to prevent CPU saturation
    cv2.setNumThreads(2)
except Exception:
    pass

# ──────────────────────────────────────────────────────────────────────────────
# Gracefully handle optional ultralytics (not needed in unit-test context)
# ──────────────────────────────────────────────────────────────────────────────
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

# TensorRT is only available on Jetson / NVIDIA hardware with TRT installed.
# The node auto-detects .engine vs .pt by file extension and sets this flag.
TENSORRT_ENGINE_SUFFIX = ".engine"

# ──────────────────────────────────────────────────────────────────────────────
# WGS-84 Origin — Configurable via environment (Defaults to NHCE Bengaluru: 12.934444° N, 77.691722° E)
# ──────────────────────────────────────────────────────────────────────────────
ORIGIN_LAT: float = float(os.getenv("SUTRA_ORIGIN_LAT", "12.934444"))
ORIGIN_LON: float = float(os.getenv("SUTRA_ORIGIN_LON", "77.691722"))
ORIGIN_ALT: float = float(os.getenv("SUTRA_ORIGIN_ALT", "920.0"))          # metres ASL (Bengaluru elevation)

# Fusion confidence weights (must sum to 1.0)
W_VISUAL:  float = 0.50
W_THERMAL: float = 0.35
W_RADAR:   float = 0.15

# Detection thresholds
YOLO_CONF_THRESHOLD:    float = 0.45   # minimum YOLO confidence to keep
THERMAL_BLOB_MIN_AREA:  int   = 100    # pixels² — ignore tiny blobs
RADAR_CLUSTER_RADIUS_M: float = 1.0   # metres — cluster merge radius
FUSION_CONFIRM_THRESH:  float = 0.60  # fused score to publish as SURVIVOR
FUSION_POSSIBLE_THRESH: float = 0.30  # fused score to publish as POSSIBLE

# SAR class mapping — supports both custom fine-tuned weights {0: person, 1: survivor, 2: debris, 3: threat}
# and standard COCO pre-trained weights {0: person, 26: backpack, 28: suitcase}
SAR_CLASS_IDS = {
    0: "person",
    1: "survivor",
    2: "debris",
    3: "threat",
    26: "backpack",
    28: "suitcase",
}


# ──────────────────────────────────────────────────────────────────────────────
# Data structures for Tri-Modal Fusion
# ──────────────────────────────────────────────────────────────────────────────


# ──────────────────────────────────────────────────────────────────────────────
# Pure-Python helper — NO ROS dependency (importable in pytest without ROS)
# ──────────────────────────────────────────────────────────────────────────────


def to_gps(
    x: float,
    y: float,
    z: float,
    origin_lat: float = ORIGIN_LAT,
    origin_lon: float = ORIGIN_LON,
    origin_alt: float = ORIGIN_ALT,
) -> Tuple[float, float, float]:
    """Convert local NED offset (metres) → WGS-84 GPS coordinates.

    Parameters
    ----------
    x : float
        East offset in metres from origin.
    y : float
        North offset in metres from origin.
    z : float
        Altitude offset in metres (positive = up).
    origin_lat / origin_lon / origin_alt : float
        WGS-84 origin of the local coordinate frame.

    Returns
    -------
    (lat, lon, alt) : Tuple[float, float, float]
        GPS latitude (°), longitude (°), altitude (m ASL).
    """
    earth_radius_m: float = 6_378_137.0
    d_lat = y / earth_radius_m
    d_lon = x / (earth_radius_m * math.cos(math.radians(origin_lat)))
    lat = round(origin_lat + math.degrees(d_lat), 6)
    lon = round(origin_lon + math.degrees(d_lon), 6)
    alt = round(origin_alt + z, 2)
    return lat, lon, alt


def pixel_to_ned(
    px: float,
    py: float,
    img_w: int,
    img_h: int,
    drone_alt_m: float,
    camera_hfov_deg: float = 90.0,
    roll_rad: float = 0.0,
    pitch_rad: float = 0.0,
    yaw_rad: float = 0.0,
    terrain_alt_m: float = 0.0,
) -> Tuple[float, float]:
    """Project image pixel (px, py) onto ground plane → NED (east, north) offset.

    Applies full 3D Euler rotation matrix R_world = Rz(yaw) * Ry(pitch) * Rx(roll)
    to compensate for drone banking and camera attitude tilt.

    Parameters
    ----------
    px, py          : Pixel coordinates (0,0 = top-left).
    img_w, img_h    : Image dimensions in pixels.
    drone_alt_m     : Drone altitude above sea level in metres.
    camera_hfov_deg : Horizontal field-of-view in degrees.
    roll_rad        : Drone roll angle in radians.
    pitch_rad       : Drone pitch angle in radians.
    yaw_rad         : Drone yaw heading in radians.
    terrain_alt_m   : Ground terrain elevation above sea level in metres.

    Returns
    -------
    (east_m, north_m) : Ground-plane offset in metres.
    """
    hfov_rad = math.radians(camera_hfov_deg)
    vfov_rad = hfov_rad * (img_h / img_w)
    # Normalised image coordinates in range [-0.5, +0.5]
    norm_x = (px / img_w) - 0.5
    norm_y = (py / img_h) - 0.5

    # Optical camera ray vector (X-Right, Y-Down, Z-Forward)
    v_cam = np.array([
        norm_x * 2.0 * math.tan(hfov_rad / 2.0),
        norm_y * 2.0 * math.tan(vfov_rad / 2.0),
        1.0,
    ])
    v_norm = np.linalg.norm(v_cam)
    if v_norm > 0:
        v_cam /= v_norm

    # 3D Euler Rotation Matrices (Roll, Pitch, Yaw)
    Rx = np.array([
        [1.0, 0.0, 0.0],
        [0.0, math.cos(roll_rad), -math.sin(roll_rad)],
        [0.0, math.sin(roll_rad), math.cos(roll_rad)],
    ])
    Ry = np.array([
        [math.cos(pitch_rad), 0.0, math.sin(pitch_rad)],
        [0.0, 1.0, 0.0],
        [-math.sin(pitch_rad), 0.0, math.cos(pitch_rad)],
    ])
    Rz = np.array([
        [math.cos(yaw_rad), -math.sin(yaw_rad), 0.0],
        [math.sin(yaw_rad), math.cos(yaw_rad), 0.0],
        [0.0, 0.0, 1.0],
    ])
    R_body = Rz @ Ry @ Rx
    v_world = R_body @ v_cam

    eff_alt = max(1.0, drone_alt_m - terrain_alt_m)
    if abs(v_world[2]) > 1e-4:
        s = eff_alt / max(v_world[2], 1e-3)
    else:
        s = 0.0

    east_m = float(v_world[0] * s)
    north_m = float(-v_world[1] * s)
    return east_m, north_m



# ──────────────────────────────────────────────────────────────────────────────
# Data classes
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class BBox:
    """Bounding box in pixel space."""
    x1: float
    y1: float
    x2: float
    y2: float

    @property
    def cx(self) -> float:
        return (self.x1 + self.x2) / 2.0

    @property
    def cy(self) -> float:
        return (self.y1 + self.y2) / 2.0

    @property
    def area(self) -> float:
        return max(0.0, self.x2 - self.x1) * max(0.0, self.y2 - self.y1)

    def iou(self, other: "BBox") -> float:
        """Intersection-over-Union with another BBox."""
        ix1 = max(self.x1, other.x1)
        iy1 = max(self.y1, other.y1)
        ix2 = min(self.x2, other.x2)
        iy2 = min(self.y2, other.y2)
        inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
        union = self.area + other.area - inter
        return inter / union if union > 0 else 0.0


@dataclass
class VisualDetection:
    """Single YOLO detection result."""
    bbox: BBox
    confidence: float
    class_id: int
    label: str
    gps: Optional[Tuple[float, float, float]] = None
    drone_id: str = "uav_alpha"


@dataclass
class ThermalBlob:
    """Hot-spot detected in thermal image."""
    bbox: BBox
    mean_intensity: float           # 0–255 normalised
    drone_id: str = "uav_alpha"


@dataclass
class RadarTarget:
    """Clustered radar return."""
    range_m: float
    angle_rad: float
    east_m: float
    north_m: float
    drone_id: str = "uav_alpha"


@dataclass
class FusedTarget:
    """Final fused detection output."""
    target_id: int
    label: str                       # SURVIVOR | POSSIBLE_SURVIVOR | THREAT | UNKNOWN
    confidence: float
    gps: Tuple[float, float, float]
    modalities: List[str] = field(default_factory=list)
    timestamp: float = field(default_factory=time.time)
    drone_id: str = "uav_alpha"

    def to_dict(self) -> dict:
        lat, lon, alt = self.gps
        return {
            "id":         self.target_id,
            "label":      self.label,
            "confidence": round(self.confidence, 3),
            "lat":        lat,
            "lon":        lon,
            "alt":        alt,
            "modalities": self.modalities,
            "ts":         round(self.timestamp, 3),
            "drone_id":   getattr(self, "drone_id", "uav_alpha"),
        }


# ──────────────────────────────────────────────────────────────────────────────
# Main ROS 2 Node
# ──────────────────────────────────────────────────────────────────────────────

class SutraDetectorNode(Node):
    """SUTRA Subsystem C — Tri-Modal AI Perception & Sensor Fusion Node.

    Subscribes
    ----------
    /camera/image_raw    sensor_msgs/Image    RGB camera (YOLOv8 detection)
    /thermal/image_raw   sensor_msgs/Image    Thermal camera (blob detection)
    /radar/scan          sensor_msgs/LaserScan  2-D radar sweep
    /sutra/gnc/pose      std_msgs/String      JSON drone telemetry from Sub-A

    Publishes
    ---------
    /sutra/perception/detections   std_msgs/String   Raw per-frame detections (JSON)
    /sutra/perception/targets      std_msgs/String   Fused confirmed targets  (JSON)
    """

    def __init__(self) -> None:
        super().__init__("sutra_detector_node")

        # ── Parameters ────────────────────────────────────────────────────────
        self.declare_parameter("yolo_model",       "yolov8n.pt")
        self.declare_parameter("camera_hfov_deg",  90.0)
        self.declare_parameter("drone_alt_m",      30.0)   # fallback altitude
        self.declare_parameter("fusion_hz",        10.0)
        self.declare_parameter("sim_mode",         True)   # use mock data in sim
        self.declare_parameter("drone_id",         "all")

        self._yolo_model_path  = self.get_parameter("yolo_model").value
        self._camera_hfov_deg  = self.get_parameter("camera_hfov_deg").value
        self._drone_alt_m      = self.get_parameter("drone_alt_m").value
        self._sim_mode         = self.get_parameter("sim_mode").value
        self._drone_filter     = str(self.get_parameter("drone_id").value)

        # ── Multi-UAV State Tracking ──────────────────────────────────────────
        self._drones = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]
        self._drone_states: Dict[str, dict] = {}
        for did in self._drones:
            self._drone_states[did] = {
                "lat": ORIGIN_LAT,
                "lon": ORIGIN_LON,
                "alt": self._drone_alt_m,
                "roll": 0.0,
                "pitch": 0.0,
                "yaw": 0.0,
            }

        # ── State ─────────────────────────────────────────────────────────────
        self._drone_lat: float = ORIGIN_LAT
        self._drone_lon: float = ORIGIN_LON
        self._drone_alt: float = ORIGIN_ALT
        self._drone_roll: float = 0.0       # radians
        self._drone_pitch: float = 0.0      # radians
        self._drone_yaw: float = 0.0        # radians

        # Pre-allocated zero-allocation image buffers for long-duration flight memory stability
        self._static_rgb_buffer: np.ndarray = np.zeros((480, 640, 3), dtype=np.uint8)
        self._static_thermal_buffer: np.ndarray = np.zeros((480, 640), dtype=np.uint8)

        self._visual_detections:  List[VisualDetection] = []
        self._thermal_blobs:      List[ThermalBlob]     = []
        self._radar_targets:      List[RadarTarget]     = []
        self._target_counter:     int                   = 0
        self._state_lock:         threading.Lock        = threading.Lock()
        self._img_w: int = 640
        self._img_h: int = 480

        # ── Optional bridges / models ──────────────────────────────────────────
        self._bridge: Optional[object] = SutraCvBridge()
        self._yolo:   Optional[object] = None
        self._using_tensorrt: bool = False
        self._device: str = "cuda:0" if (TORCH_AVAILABLE and torch.cuda.is_available()) else "cpu"

        if YOLO_AVAILABLE:
            try:
                # Auto-detect TensorRT engine vs standard PyTorch model
                if self._yolo_model_path.endswith(TENSORRT_ENGINE_SUFFIX):
                    # TensorRT FP16 engine — ~4ms/frame on Jetson / RTX GPU
                    self._yolo = YOLO(self._yolo_model_path)
                    self._using_tensorrt = True
                    self.get_logger().info(
                        f"⚡ TensorRT FP16 engine loaded: {self._yolo_model_path} on {self._device}"
                    )
                else:
                    # Standard PyTorch .pt model on GPU/CPU
                    self._yolo = YOLO(self._yolo_model_path)
                    if self._device != "cpu":
                        self._yolo.to(self._device)
                    self._using_tensorrt = False
                    self.get_logger().info(
                        f"✅ YOLOv8-Nano model loaded on [{self._device}]: {self._yolo_model_path}"
                    )
                    self.get_logger().info(
                        "   TIP: Export to TensorRT for max GPU throughput: "
                        "python3 tensorrt_export.py --model best_sutra.pt"
                    )
            except Exception as exc:
                self.get_logger().warn(f"YOLO load failed ({exc}). Running in mock mode.")
        else:
            self.get_logger().warn(
                "ultralytics not installed — running YOLO in mock mode."
            )

        # ── ByteTrack Multi-Object Tracker ────────────────────────────────────
        # Assigns persistent IDs (Survivor-101, Threat-002) across frames.
        # Eliminates single-frame false positives via MIN_HITS=2 gate.
        # Recovers occluded targets via two-pass association (ByteTrack ECCV 2022).
        self._tracker = SutraByteTracker(
            high_conf_thresh=0.50,   # Pass 1: confident detections
            low_conf_thresh=0.15,    # Pass 2: recover occluded targets
            iou_thresh=0.30,         # Minimum IoU for track association
            max_age=30,              # Frames before track is deleted (=3s @ 10Hz)
            min_hits=2,              # Consecutive matches before confirmed
        )
        self.get_logger().info("🔍 ByteTrack MOT tracker initialised (MAX_AGE=30, MIN_HITS=2)")

        # ── QoS ───────────────────────────────────────────────────────────────
        sensor_qos = QoSProfile(
            depth=1,
            reliability=ReliabilityPolicy.BEST_EFFORT,
        )

        # ── Mesh Comms Feedback State ──────────────────────────────────────────
        self._mesh_snr_db: float = 25.0
        self._low_bandwidth_mode: bool = False
        self._frame_counter: int = 0

        # ── Subscribers ───────────────────────────────────────────────────────
        self.create_subscription(
            Image,     "/camera/image_raw",   self._rgb_callback,     sensor_qos
        )
        self.create_subscription(
            Image,     "/thermal/image_raw",  self._thermal_callback, sensor_qos
        )
        self.create_subscription(
            LaserScan, "/radar/scan",         self._radar_callback,   sensor_qos
        )
        # Mesh Comms Adaptive Link Feedback from Subsystem B
        self.create_subscription(
            String,    "/sutra/swarm/mesh_status", self._mesh_status_callback, 10
        )
        # JSON String pose (sim mode / fallback)
        self.create_subscription(
            String,    "/sutra/gnc/pose",     self._pose_callback,    10
        )
        # PoseStamped from Subsystem A (geometry_msgs — real hardware/ROS integration)
        self.create_subscription(
            PoseStamped, "/sutra/gnc/pose_stamped", self._pose_stamped_callback, 10
        )

        # ── Multi-UAV Subscribers ─────────────────────────────────────────────
        for did in self._drones:
            if self._drone_filter not in ("all", did):
                continue
            self.create_subscription(
                Image, f"/{did}/camera/image_raw",
                lambda msg, d=did: self._rgb_multi_callback(msg, d),
                sensor_qos
            )
            self.create_subscription(
                Image, f"/{did}/thermal_camera/image_raw",
                lambda msg, d=did: self._thermal_multi_callback(msg, d),
                sensor_qos
            )
            self.create_subscription(
                Odometry, f"/model/{did}/odometry",
                lambda msg, d=did: self._odometry_multi_callback(msg, d),
                sensor_qos
            )


        # ── Publishers ────────────────────────────────────────────────────────
        self._pub_detections = self.create_publisher(
            String, "/sutra/perception/detections", 10
        )
        self._pub_targets = self.create_publisher(
            String, "/sutra/perception/targets", 10
        )

        # ── Fusion timer (10 Hz) ──────────────────────────────────────────────
        fusion_hz = self.get_parameter("fusion_hz").value
        self.create_timer(1.0 / fusion_hz, self._fusion_tick)

        # ── Sim mode: inject mock detections so pipeline can be tested ────────
        if self._sim_mode:
            self.create_timer(2.0, self._inject_sim_data)

        self.get_logger().info(
            "🚁 SUTRA Subsystem C — Tri-Modal Detector Node ONLINE"
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Subscriber callbacks
    # ──────────────────────────────────────────────────────────────────────────

    def _mesh_status_callback(self, msg: String) -> None:
        """Receive live RF mesh communication link status from Subsystem B (mesh_node)."""
        try:
            data = json.loads(msg.data)
            snr = float(data.get("snr_db", 25.0))
            self._mesh_snr_db = snr
            # Automatically toggle low bandwidth mode if SNR drops under heavy jamming/fading
            if snr < -85.0:
                if not self._low_bandwidth_mode:
                    self.get_logger().warn(f"⚠️ Mesh link degraded (SNR={snr:.1f}dB) -> Switched to LOW_BANDWIDTH target mode")
                self._low_bandwidth_mode = True
            else:
                self._low_bandwidth_mode = False
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    def _pose_callback(self, msg: String) -> None:
        """Receive drone telemetry JSON from Subsystem A (sim/fallback mode)."""
        try:
            data = json.loads(msg.data)
            with self._state_lock:
                self._drone_lat = float(data.get("lat", self._drone_lat))
                self._drone_lon = float(data.get("lon", self._drone_lon))
                self._drone_alt = float(data.get("alt", self._drone_alt))
                self._drone_yaw = float(data.get("yaw", self._drone_yaw))
        except (json.JSONDecodeError, KeyError, TypeError):
            pass  # keep previous values

    def _pose_stamped_callback(self, msg: PoseStamped) -> None:
        """Receive drone pose from Subsystem A via geometry_msgs/PoseStamped."""
        x = msg.pose.position.x
        y = msg.pose.position.y
        z = msg.pose.position.z
        # Convert NED position → GPS
        lat, lon, alt = to_gps(x, y, z)

        # Extract roll, pitch, yaw from quaternion (q_x, q_y, q_z, q_w)
        qx = msg.pose.orientation.x
        qy = msg.pose.orientation.y
        qz = msg.pose.orientation.z
        qw = msg.pose.orientation.w

        # Roll (x-axis rotation)
        sinr_cosp = 2.0 * (qw * qx + qy * qz)
        cosr_cosp = 1.0 - 2.0 * (qx * qx + qy * qy)
        roll = math.atan2(sinr_cosp, cosr_cosp)

        # Pitch (y-axis rotation)
        sinp = 2.0 * (qw * qy - qz * qx)
        if abs(sinp) >= 1.0:
            pitch = math.copysign(math.pi / 2.0, sinp)
        else:
            pitch = math.asin(sinp)

        # Yaw (z-axis rotation)
        siny_cosp = 2.0 * (qw * qz + qx * qy)
        cosy_cosp = 1.0 - 2.0 * (qy * qy + qz * qz)
        yaw = math.atan2(siny_cosp, cosy_cosp)

        with self._state_lock:
            self._drone_lat = lat
            self._drone_lon = lon
            self._drone_alt = alt
            self._drone_roll = roll
            self._drone_pitch = pitch
            self._drone_yaw = yaw

    def _odometry_multi_callback(self, msg: Odometry, drone_id: str) -> None:
        """Receive 50Hz Gazebo/PX4 odometry for drone_id and update geodetic pose."""
        p = msg.pose.pose.position
        o = msg.pose.pose.orientation
        lat = ORIGIN_LAT + (p.y * 8.99e-6)
        lon = ORIGIN_LON + (p.x * 8.99e-6 / math.cos(math.radians(ORIGIN_LAT)))
        alt = max(1.0, float(p.z))

        sinr_cosp = 2.0 * (o.w * o.x + o.y * o.z)
        cosr_cosp = 1.0 - 2.0 * (o.x * o.x + o.y * o.y)
        roll = math.atan2(sinr_cosp, cosr_cosp)

        sinp = 2.0 * (o.w * o.y - o.z * o.x)
        pitch = math.copysign(math.pi / 2.0, sinp) if abs(sinp) >= 1.0 else math.asin(sinp)

        siny_cosp = 2.0 * (o.w * o.z + o.x * o.y)
        cosy_cosp = 1.0 - 2.0 * (o.y * o.y + o.z * o.z)
        yaw = math.atan2(siny_cosp, cosy_cosp)

        with self._state_lock:
            if drone_id in self._drone_states:
                self._drone_states[drone_id].update({
                    "lat": lat, "lon": lon, "alt": alt,
                    "roll": roll, "pitch": pitch, "yaw": yaw,
                })
            if drone_id == "uav_alpha" or self._drone_filter == drone_id:
                self._drone_lat = lat
                self._drone_lon = lon
                self._drone_alt = alt
                self._drone_roll = roll
                self._drone_pitch = pitch
                self._drone_yaw = yaw

    def _rgb_multi_callback(self, msg: Image, drone_id: str) -> None:
        """Process RGB camera frame for specific drone_id."""
        if self._bridge is None:
            return
        if self._low_bandwidth_mode:
            self._frame_counter += 1
            if self._frame_counter % 2 != 0:
                return

        try:
            frame = self._bridge.imgmsg_to_cv2(msg, desired_encoding="bgr8")
        except Exception:
            return

        h, w = frame.shape[:2]
        with self._state_lock:
            st = self._drone_states.get(drone_id, {
                "lat": self._drone_lat, "lon": self._drone_lon, "alt": self._drone_alt,
                "roll": self._drone_roll, "pitch": self._drone_pitch, "yaw": self._drone_yaw,
            })
            drone_alt = st["alt"]
            drone_lat = st["lat"]
            drone_lon = st["lon"]
            drone_roll = st["roll"]
            drone_pitch = st["pitch"]
            drone_yaw = st["yaw"]

        detections = self._run_yolo(
            frame,
            drone_id=drone_id,
            drone_lat=drone_lat,
            drone_lon=drone_lon,
            drone_alt=drone_alt,
            drone_roll=drone_roll,
            drone_pitch=drone_pitch,
            drone_yaw=drone_yaw,
        )
        with self._state_lock:
            self._img_h, self._img_w = h, w
            self._visual_detections = [
                d for d in self._visual_detections if getattr(d, "drone_id", "uav_alpha") != drone_id
            ] + detections

    def _thermal_multi_callback(self, msg: Image, drone_id: str) -> None:
        """Process thermal camera frame for specific drone_id."""
        if self._bridge is None:
            return
        try:
            raw = self._bridge.imgmsg_to_cv2(msg, desired_encoding="passthrough")
        except Exception:
            return

        blobs = self._detect_thermal_blobs(raw, drone_id=drone_id)
        with self._state_lock:
            self._thermal_blobs = [
                b for b in self._thermal_blobs if getattr(b, "drone_id", "uav_alpha") != drone_id
            ] + blobs

    def _rgb_callback(self, msg: Image) -> None:
        """Process RGB camera frame — run YOLOv8-Nano detection."""
        if self._bridge is None:
            return

        # Adapt to RF mesh jamming/degradation: skip every 2nd frame in low bandwidth mode
        if self._low_bandwidth_mode:
            self._frame_counter += 1
            if self._frame_counter % 2 != 0:
                return

        try:
            frame = self._bridge.imgmsg_to_cv2(msg, desired_encoding="bgr8")
        except Exception:
            return

        h, w = frame.shape[:2]
        detections = self._run_yolo(frame)
        with self._state_lock:
            self._img_h, self._img_w = h, w
            self._visual_detections = detections

    def _thermal_callback(self, msg: Image) -> None:
        """Process thermal camera frame — detect hot-spot blobs."""
        if self._bridge is None:
            return
        try:
            # Accept 16-bit mono or 8-bit mono
            raw = self._bridge.imgmsg_to_cv2(msg, desired_encoding="passthrough")
        except Exception:
            return

        blobs = self._detect_thermal_blobs(raw)
        with self._state_lock:
            self._thermal_blobs = blobs

    def _radar_callback(self, msg: LaserScan) -> None:
        """Process 2-D radar sweep — cluster returns into targets."""
        targets = self._cluster_radar(msg)
        with self._state_lock:
            self._radar_targets = targets

    # ──────────────────────────────────────────────────────────────────────────
    # Sensor processing helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _run_yolo(
        self,
        frame: np.ndarray,
        drone_id: str = "uav_alpha",
        drone_lat: Optional[float] = None,
        drone_lon: Optional[float] = None,
        drone_alt: Optional[float] = None,
        drone_roll: Optional[float] = None,
        drone_pitch: Optional[float] = None,
        drone_yaw: Optional[float] = None,
    ) -> List[VisualDetection]:
        """Run YOLOv8-Nano on frame and return filtered detections."""
        detections: List[VisualDetection] = []

        if self._yolo is None:
            return detections

        lat_val = self._drone_lat if drone_lat is None else drone_lat
        lon_val = self._drone_lon if drone_lon is None else drone_lon
        alt_val = self._drone_alt if drone_alt is None else drone_alt
        roll_val = self._drone_roll if drone_roll is None else drone_roll
        pitch_val = self._drone_pitch if drone_pitch is None else drone_pitch
        yaw_val = self._drone_yaw if drone_yaw is None else drone_yaw

        try:
            results = self._yolo(
                frame,
                conf=YOLO_CONF_THRESHOLD,
                device=self._device,
                half=(self._device != "cpu"),
                verbose=False
            )
        except Exception as exc:
            self.get_logger().warn(f"YOLO inference error: {exc}")
            return detections

        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                cls_id = int(box.cls[0])
                if cls_id not in SAR_CLASS_IDS:
                    continue
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                bbox = BBox(x1, y1, x2, y2)
                # GPS raycast from pixel centre with 3D Attitude Rotation
                ex, ny = pixel_to_ned(
                    bbox.cx, bbox.cy,
                    self._img_w, self._img_h,
                    alt_val,
                    self._camera_hfov_deg,
                    roll_val,
                    pitch_val,
                    yaw_val,
                )
                gps = to_gps(ex, ny, 0.0, lat_val, lon_val, 0.0)
                detections.append(VisualDetection(
                    bbox=bbox,
                    confidence=conf,
                    class_id=cls_id,
                    label=SAR_CLASS_IDS[cls_id],
                    gps=gps,
                    drone_id=drone_id,
                ))
        return detections

    def _detect_thermal_blobs(self, raw: np.ndarray, drone_id: str = "uav_alpha") -> List[ThermalBlob]:
        """Detect human-temperature hot-spots (35C - 42C) in thermal image.

        Strategy:
          - Normalise 16-bit → 8-bit (or use 8-bit directly)
          - Radiometric absolute human temperature bandpass filter (top 22% intensity threshold)
          - Morphological opening filter to eliminate solar glare & high-frequency noise
          - Filter blobs by minimum area
        """
        blobs: List[ThermalBlob] = []

        # Normalise to 8-bit
        if raw.dtype == np.uint16:
            norm = cv2.normalize(raw, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        else:
            norm = raw.astype(np.uint8)

        # Adaptive Thermal CLAHE Normalization (removes hot ground / solar clutter)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        norm = clahe.apply(norm)

        # Radiometric human body temperature thresholding (above ~35C threshold)
        min_intensity = int(255 * 0.78)
        _, mask = cv2.threshold(norm, min_intensity, 255, cv2.THRESH_BINARY)

        # Morphological opening filter (removes high-frequency solar glare & thermal speckle)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(
            mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < THERMAL_BLOB_MIN_AREA:
                continue
            rx, ry, rw, rh = cv2.boundingRect(cnt)
            roi = norm[ry:ry+rh, rx:rx+rw]
            mean_intensity = float(roi.mean()) / 255.0
            blobs.append(ThermalBlob(
                bbox=BBox(rx, ry, rx + rw, ry + rh),
                mean_intensity=mean_intensity,
                drone_id=drone_id,
            ))
        return blobs

    def _cluster_radar(self, msg: LaserScan) -> List[RadarTarget]:
        """Convert LaserScan ranges into clustered radar targets."""
        targets: List[RadarTarget] = []
        raw_points: List[Tuple[float, float, float]] = []  # (range, angle, east, north)

        angle = msg.angle_min
        for r in msg.ranges:
            if msg.range_min < r < msg.range_max and not math.isinf(r) and not math.isnan(r):
                east_m  =  r * math.sin(angle)
                north_m =  r * math.cos(angle)
                raw_points.append((r, angle, east_m, north_m))
            angle += msg.angle_increment

        if not raw_points:
            return targets

        # Simple greedy clustering
        used = [False] * len(raw_points)
        for i, (ri, ai, ei, ni) in enumerate(raw_points):
            if used[i]:
                continue
            cluster_e = [ei]
            cluster_n = [ni]
            used[i] = True
            for j, (rj, aj, ej, nj) in enumerate(raw_points):
                if used[j]:
                    continue
                dist = math.hypot(ei - ej, ni - nj)
                if dist < RADAR_CLUSTER_RADIUS_M:
                    cluster_e.append(ej)
                    cluster_n.append(nj)
                    used[j] = True
            mean_e = sum(cluster_e) / len(cluster_e)
            mean_n = sum(cluster_n) / len(cluster_n)
            mean_r = math.hypot(mean_e, mean_n)
            targets.append(RadarTarget(
                range_m=mean_r,
                angle_rad=ai,
                east_m=mean_e,
                north_m=mean_n,
            ))
        return targets

    # ──────────────────────────────────────────────────────────────────────────
    # Tri-Modal Fusion Engine  (10 Hz timer)
    # ──────────────────────────────────────────────────────────────────────────

    def _fusion_tick(self) -> None:
        """Merge visual, thermal, radar detections → ByteTrack → publish."""
        try:
            self._do_fusion_tick()
        except Exception as e:
            self.get_logger().error(f"[FusionEngine] Exception caught in _fusion_tick: {e}", throttle_duration_sec=2.0)

    def _do_fusion_tick(self) -> None:
        with self._state_lock:
            v_dets = list(self._visual_detections)
            t_blobs = list(self._thermal_blobs)
            r_targets = list(self._radar_targets)
            drone_alt = self._drone_alt
            drone_lat = self._drone_lat
            drone_lon = self._drone_lon
            img_w = self._img_w
            img_h = self._img_h

        fused_dets: List[dict] = []   # intermediate list for tracker input

        # ── Step 1: seed with visual detections (highest information) ─────────
        for vdet in v_dets:
            if vdet.gps is None:
                continue
            score = vdet.confidence * W_VISUAL
            modalities = ["visual"]
            ev, nv = pixel_to_ned(
                vdet.bbox.cx, vdet.bbox.cy,
                img_w, img_h,
                drone_alt, self._camera_hfov_deg,
            )

            # ── Step 2: thermal confirmation ──────────────────────────────────
            for tblob in t_blobs:
                iou = vdet.bbox.iou(tblob.bbox)
                if iou > 0.15:
                    score += tblob.mean_intensity * W_THERMAL
                    modalities.append("thermal")
                    break  # one confirmation per visual detection

            # ── Step 3: radar confirmation ────────────────────────────────────
            for rtgt in r_targets:
                dist_m = math.hypot(ev - rtgt.east_m, nv - rtgt.north_m)
                if dist_m < 3.0:   # within 3 m ground radius
                    score += W_RADAR
                    modalities.append("radar")
                    break

            score = min(score, 1.0)
            label = self._classify(vdet.label, score)
            did = getattr(vdet, "drone_id", "uav_alpha")
            fused_dets.append({
                "bbox":       [vdet.bbox.x1, vdet.bbox.y1, vdet.bbox.x2, vdet.bbox.y2],
                "confidence": score,
                "gps":        vdet.gps,
                "modalities": modalities,
                "label":      label,
                "drone_id":   did,
            })

        # ── Step 4: thermal-only detections (smoke / rubble scenarios) ────────
        for tblob in t_blobs:
            already_fused = any(
                tblob.bbox.iou(BBox(
                    d.bbox.x1, d.bbox.y1, d.bbox.x2, d.bbox.y2
                )) > 0.15
                for d in v_dets
            )
            if already_fused:
                continue
            score = tblob.mean_intensity * W_THERMAL
            if score < FUSION_POSSIBLE_THRESH:
                continue
            ex, ny = pixel_to_ned(
                tblob.bbox.cx, tblob.bbox.cy,
                img_w, img_h,
                drone_alt, self._camera_hfov_deg,
            )
            gps = to_gps(ex, ny, 0.0, drone_lat, drone_lon, 0.0)
            did = getattr(tblob, "drone_id", "uav_alpha")
            fused_dets.append({
                "bbox":       [tblob.bbox.x1, tblob.bbox.y1, tblob.bbox.x2, tblob.bbox.y2],
                "confidence": score,
                "gps":        gps,
                "modalities": ["thermal"],
                "label":      "POSSIBLE_SURVIVOR",
                "drone_id":   did,
            })

        # ── Step 5: ByteTrack — assign persistent IDs ─────────────────────────
        # ByteTrack two-pass association (Zhang et al., ECCV 2022):
        #   Pass 1: match high-conf detections to existing tracks
        #   Pass 2: recover occluded targets via low-conf detections
        # Only CONFIRMED tracks (hit_streak >= MIN_HITS=2) are returned.
        # Single-frame false positives are silently filtered here.
        tracked: List[TrackedTarget] = self._tracker.update(fused_dets)

        # ── Publish raw detection stream ───────────────────────────────────────
        track_counts = self._tracker.get_track_count()
        raw_msg = String()
        raw_msg.data = json.dumps({
            "visual":          len(v_dets),
            "thermal":         len(t_blobs),
            "radar":           len(r_targets),
            "fused_raw":       len(fused_dets),
            "tracked_confirmed": len(tracked),
            "tracker_new":     track_counts.get("NEW", 0),
            "tracker_tracked": track_counts.get("TRACKED", 0),
            "tracker_lost":    track_counts.get("LOST", 0),
            "using_tensorrt":  self._using_tensorrt,
        })
        self._pub_detections.publish(raw_msg)

        # ── Publish tracked targets ────────────────────────────────────────────
        if tracked:
            # Under low-bandwidth mesh mode (SNR < -85 dBm / RF jamming), filter out uncertain
            # candidates and only stream confirmed high-confidence survivors (>= 0.70)
            if self._low_bandwidth_mode:
                publishable = [t for t in tracked if t.confidence >= 0.70]
            else:
                publishable = tracked

            if publishable:
                payload = json.dumps({
                    "targets": [t.to_dict() for t in publishable],
                    "low_bandwidth_mode": self._low_bandwidth_mode,
                })
                tgt_msg = String()
                tgt_msg.data = payload
                self._pub_targets.publish(tgt_msg)
            for t in publishable:
                mode_str = self._using_tensorrt
                self.get_logger().info(
                    f"🎯 [{t.label}-{t.track_id:03d}] "
                    f"conf={t.confidence:.2f} age={t.age}fr "
                    f"GPS=({t.gps[0]:.6f},{t.gps[1]:.6f}) "
                    f"src={'+'.join(t.modalities)} "
                    f"{'⚡TRT' if self._using_tensorrt else '🐢PT'}"
                )

    # ──────────────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _classify(yolo_label: str, score: float) -> str:
        if yolo_label == "person":
            if score >= FUSION_CONFIRM_THRESH:
                return "SURVIVOR"
            elif score >= FUSION_POSSIBLE_THRESH:
                return "POSSIBLE_SURVIVOR"
            else:
                return "UNKNOWN"
        else:
            return "THREAT"

    # ──────────────────────────────────────────────────────────────────────────
    # Simulation mode — inject deterministic mock data
    # ──────────────────────────────────────────────────────────────────────────

    def _inject_sim_data(self) -> None:
        """In simulation, inject mock sensor data so the fusion pipeline runs."""
        # Mock: one visual person detection at image centre
        bbox = BBox(280, 210, 360, 270)
        ex, ny = pixel_to_ned(
            bbox.cx, bbox.cy,
            self._img_w, self._img_h,
            self._drone_alt, self._camera_hfov_deg,
        )
        gps = to_gps(ex, ny, 0.0, self._drone_lat, self._drone_lon, 0.0)
        self._visual_detections = [
            VisualDetection(
                bbox=bbox, confidence=0.91,
                class_id=0, label="person", gps=gps,
            )
        ]
        # Mock: one thermal blob overlapping the visual detection
        self._thermal_blobs = [
            ThermalBlob(bbox=BBox(270, 205, 370, 280), mean_intensity=0.82)
        ]
        # Mock: one radar return at ~5 m ahead
        self._radar_targets = [
            RadarTarget(range_m=5.1, angle_rad=0.0, east_m=ex, north_m=ny + 0.5)
        ]


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

def main(args=None) -> None:
    rclpy.init(args=args)
    node = SutraDetectorNode()
    try:
        from rclpy.executors import MultiThreadedExecutor
        executor = MultiThreadedExecutor(num_threads=4)
        executor.add_node(node)
        executor.spin()
    except (KeyboardInterrupt, ExternalShutdownException):
        pass
    except Exception:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()

