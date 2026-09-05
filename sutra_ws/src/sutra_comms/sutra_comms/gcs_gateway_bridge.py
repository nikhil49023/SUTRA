#!/usr/bin/env python3
"""
Project SUTRA — Remote Ground Control Station (GCS) WebSocket Gateway Bridge
=============================================================================
Connects the ROS 2 Swarm Subsystems (A: GNC, B: Comms, C: Perception) over
WebSockets (port 9090) and HTTP MJPEG Multi-Streams (port 8080) to
Subsystem D (3D GIS GCS Web Application & Video Feed Pipeline).

Features:
  1. Bi-directional WebSocket Server (0.0.0.0:9090) for GCS UI & telemetry
  2. Multi-UAV Camera Streams with synchronized 6-DOF pose, IMU, GPS & depth
  3. Embedded HTTP MJPEG Multi-Stream Server (0.0.0.0:8080) for RTSP/browser/VLC
     - GET /stream/<drone_id>?modality=RGB|THERMAL
     - GET /snapshot/<drone_id>
     - GET /streams (JSON metadata catalogue)
  4. 2D Mapping Engine footprint injection to sutra_tile_server (:8088)
  5. Downlink: Swarm telemetry (50Hz physics/10Hz stream), SwarmRAFT & survivor alerts
  6. Uplink: Receives Emergency 1-Click RTL & waypoint commands from GCS
"""

import asyncio
import base64
import json
import logging
import math
import os
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from typing import Dict, Optional, Set

import cv2
import numpy as np

import rclpy
from geometry_msgs.msg import PoseStamped
from nav_msgs.msg import Odometry
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy
from sensor_msgs.msg import Image, Imu, LaserScan, NavSatFix
from std_msgs.msg import String

try:
    import websockets
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False

try:
    from sutra_comms.perceptron_jscc import PerceptronSemanticCommsPipeline
except ImportError:
    import sys
    sys.path.insert(0, os.path.dirname(__file__))
    from perceptron_jscc import PerceptronSemanticCommsPipeline


logging.basicConfig(level=logging.INFO, format='[GCS Bridge] %(levelname)s: %(message)s')


def quat_to_euler(qx: float, qy: float, qz: float, qw: float):
    """Converts quaternion orientation to roll, pitch, yaw in degrees."""
    sinr_cosp = 2.0 * (qw * qx + qy * qz)
    cosr_cosp = 1.0 - 2.0 * (qx * qx + qy * qy)
    roll = math.atan2(sinr_cosp, cosr_cosp)

    sinp = 2.0 * (qw * qy - qz * qx)
    if abs(sinp) >= 1.0:
        pitch = math.copysign(math.pi / 2.0, sinp)
    else:
        pitch = math.asin(sinp)

    siny_cosp = 2.0 * (qw * qz + qx * qy)
    cosy_cosp = 1.0 - 2.0 * (qy * qy + qz * qz)
    yaw = math.atan2(siny_cosp, cosy_cosp)

    return math.degrees(roll), math.degrees(pitch), (math.degrees(yaw) % 360.0)


DRONE_ALIASES: Dict[str, str] = {
    "uav_1": "uav_alpha",
    "uav_2": "uav_beta",
    "uav_3": "uav_gamma",
    "uav_4": "uav_delta",
    "uav_5": "uav_epsilon",
    "uav_alpha": "uav_1",
    "uav_beta": "uav_2",
    "uav_gamma": "uav_3",
    "uav_delta": "uav_4",
    "uav_epsilon": "uav_5",
}


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class MJPEGStreamHandler(BaseHTTPRequestHandler):
    bridge_ref: Optional["SutraGcsGatewayBridge"] = None

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
        modality = query.get("modality", ["RGB"])[0].upper()

        if path == "/streams":
            streams_info = []
            if self.bridge_ref:
                for d in self.bridge_ref.drones:
                    st = self.bridge_ref.drone_states.get(d, {})
                    alias = DRONE_ALIASES.get(d, d)
                    streams_info.append({
                        "drone_id": d,
                        "alias": alias,
                        "stream_url_mjpeg": f"/stream/{d}",
                        "snapshot_url": f"/snapshot/{d}",
                        "status": st.get("status", "ACTIVE"),
                        "position": {
                            "latitude": st.get("latitude"),
                            "longitude": st.get("longitude"),
                            "altitude": st.get("altitude")
                        },
                        "heading": st.get("heading", 0.0),
                        "speed": st.get("speed", 0.0),
                        "modalities": ["RGB", "THERMAL"]
                    })
            payload = json.dumps({"status": "SUCCESS", "streams": streams_info}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(payload)
            return

        elif path.startswith("/snapshot/"):
            snap_part = path.split("/snapshot/")[1].strip("/")
            subparts = snap_part.split("/")
            raw_drone = subparts[0].lower()
            if len(subparts) > 1 and subparts[1].upper() == "THERMAL":
                modality = "THERMAL"
            actual_drone = DRONE_ALIASES.get(raw_drone, raw_drone)

            frame_bytes = None
            if self.bridge_ref:
                frame_bytes = (
                    self.bridge_ref.latest_frames.get(f"{actual_drone}_{modality}")
                    or self.bridge_ref.latest_frames.get(f"{raw_drone}_{modality}")
                    or self.bridge_ref.latest_frames.get(actual_drone)
                    or self.bridge_ref.latest_frames.get(raw_drone)
                )
                if not frame_bytes:
                    synthetic = self.bridge_ref._generate_synthetic_hud_frame(actual_drone, modality, time.time())
                    b64_img = synthetic["image_b64"].split(",")[1]
                    frame_bytes = base64.b64decode(b64_img)

            if frame_bytes:
                self.send_response(200)
                self.send_header("Content-Type", "image/jpeg")
                self.send_header("Content-Length", str(len(frame_bytes)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(frame_bytes)
            else:
                self.send_response(404)
                self.end_headers()
            return

        elif path.startswith("/stream/"):
            stream_part = path.split("/stream/")[1].strip("/")
            subparts = stream_part.split("/")
            raw_drone = subparts[0].lower()
            if len(subparts) > 1 and subparts[1].upper() == "THERMAL":
                modality = "THERMAL"
            actual_drone = DRONE_ALIASES.get(raw_drone, raw_drone)

            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Cache-Control", "no-cache, private")
            self.send_header("Pragma", "no-cache")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            try:
                while True:
                    frame_bytes = None
                    if self.bridge_ref:
                        frame_bytes = (
                            self.bridge_ref.latest_frames.get(f"{actual_drone}_{modality}")
                            or self.bridge_ref.latest_frames.get(f"{raw_drone}_{modality}")
                            or self.bridge_ref.latest_frames.get(actual_drone)
                            or self.bridge_ref.latest_frames.get(raw_drone)
                        )
                        if not frame_bytes:
                            synthetic = self.bridge_ref._generate_synthetic_hud_frame(actual_drone, modality, time.time())
                            b64_img = synthetic["image_b64"].split(",")[1]
                            frame_bytes = base64.b64decode(b64_img)

                    if frame_bytes:
                        self.wfile.write(b"--frame\r\n")
                        self.send_header("Content-Type", "image/jpeg")
                        self.send_header("Content-Length", str(len(frame_bytes)))
                        self.end_headers()
                        self.wfile.write(frame_bytes)
                        self.wfile.write(b"\r\n")
                    time.sleep(0.066)  # ~15 FPS
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        elif path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"status": "UP"}')
            return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        pass


class SutraGcsGatewayBridge(Node):
    def __init__(self, host: str = "0.0.0.0", port: int = 9090, http_port: int = 8080):
        super().__init__("sutra_gcs_gateway_bridge")

        # Declare parameters to allow override via ros2 launch or CLI
        self.declare_parameter("ws_port", port)
        self.declare_parameter("ws_host", host)
        self.declare_parameter("http_port", http_port)
        self.host = self.get_parameter("ws_host").get_parameter_value().string_value or host
        self.port = self.get_parameter("ws_port").get_parameter_value().integer_value or port
        self.http_port = self.get_parameter("http_port").get_parameter_value().integer_value or http_port
        self.ws_clients: Set[object] = set()

        # Upstream GCS WebSocket Gateway (:8765) & World ID
        self.world_id = os.getenv("SUTRA_WORLD_ID", "WORLD_2")
        self.gcs_ws_url = os.getenv("SUTRA_GCS_WS_URL", "ws://127.0.0.1:8765")
        self.upstream_ws = None

        # Initialize Perceptron Deep JSCC Neural Semantic Pipeline (NVIDIA RTX 3050 CUDA GPU)
        self.jscc_pipeline = PerceptronSemanticCommsPipeline()
        self.active_stream_drone = "uav_alpha"
        self.active_modality = "RGB"  # "RGB" or "THERMAL"
        self.last_camera_msg_time: Dict[str, float] = {}
        self.drones = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]

        # Cache of latest JPEG frames per drone/modality for HTTP MJPEG server
        self.latest_frames: Dict[str, bytes] = {}

        # Georeferenced Origin (Configurable via ENV, defaulting to NHCE Bengaluru: 12.934444° N, 77.691722° E)
        self.origin_lat = float(os.getenv("SUTRA_ORIGIN_LAT", "12.934444"))
        self.origin_lon = float(os.getenv("SUTRA_ORIGIN_LON", "77.691722"))
        self.origin_alt = float(os.getenv("SUTRA_ORIGIN_ALT", "920.0"))

        # Detailed per-drone synchronized state cache
        self.drone_states: Dict[str, dict] = {}
        for did in self.drones:
            self.drone_states[did] = {
                "drone_id": did,
                "x": 0.0,
                "y": 0.0,
                "z": 15.0,
                "latitude": self.origin_lat,
                "longitude": self.origin_lon,
                "altitude": 15.0,
                "heading": 0.0,
                "roll_deg": 0.0,
                "pitch_deg": 0.0,
                "speed": 0.0,
                "vx": 0.0,
                "vy": 0.0,
                "vz": 0.0,
                "battery": 98.0,
                "status": "MISSION",
                "timestamp": time.time(),
                "depth_m": 15.0,
                "imu": {
                    "linear_acceleration": [0.0, 0.0, 9.81],
                    "angular_velocity": [0.0, 0.0, 0.0]
                },
                "gps": {
                    "latitude": self.origin_lat,
                    "longitude": self.origin_lon,
                    "altitude": 15.0,
                    "status": 3
                },
                "has_physics": False
            }

        # Swarm State Cache (Georeferenced Coordinates for GCS UI)
        self.swarm_telemetry: Dict[str, dict] = {
            "uav_alpha": {"lat": self.origin_lat, "lon": self.origin_lon, "alt": 15.0, "heading": 0.0, "speed": 0.0, "battery": 98.5, "status": "MISSION"},
            "uav_beta":  {"lat": self.origin_lat + 0.0002, "lon": self.origin_lon + 0.0002, "alt": 18.0, "heading": 45.0, "speed": 0.0, "battery": 95.0, "status": "MISSION"},
            "uav_gamma": {"lat": self.origin_lat - 0.0003, "lon": self.origin_lon - 0.0002, "alt": 20.0, "heading": 90.0, "speed": 0.0, "battery": 92.0, "status": "MISSION"},
            "uav_delta": {"lat": self.origin_lat + 0.0004, "lon": self.origin_lon + 0.0004, "alt": 16.5, "heading": 135.0, "speed": 0.0, "battery": 97.0, "status": "MISSION"},
            "uav_epsilon":{"lat": self.origin_lat - 0.0006, "lon": self.origin_lon - 0.0004, "alt": 22.0, "heading": 180.0, "speed": 0.0, "battery": 89.5, "status": "RELAY"}
        }

        self.survivor_alerts = [
            {"id": 1, "type": "SURVIVOR", "lat": self.origin_lat - 0.00005, "lon": self.origin_lon + 0.00007, "alt": 15.0, "confidence": 0.948, "drone": "uav_alpha", "time": "11:00:15", "bbox": [120, 84, 210, 240]},
            {"id": 2, "type": "POSSIBLE_SURVIVOR", "lat": self.origin_lat + 0.00025, "lon": self.origin_lon + 0.00037, "alt": 18.2, "confidence": 0.785, "drone": "uav_beta", "time": "11:02:40", "bbox": [310, 140, 390, 260]}
        ]

        self.raft_consensus_status = {
            "leader": "uav_alpha",
            "term": 4,
            "peers_online": 5,
            "mesh_pdr_percent": 98.4,
            "avg_latency_ms": 4.2
        }

        # Sensor Data QoS (Best-Effort)
        sensor_qos = QoSProfile(depth=2, reliability=ReliabilityPolicy.BEST_EFFORT)

        # Multi-Drone Subscriptions (RGB + FLIR Thermal + Odometry + NavSat + IMU + Rangefinder)
        self.sub_cameras = []
        for did in self.drones:
            self.last_camera_msg_time[did] = 0.0

            # RGB Camera
            sub_rgb = self.create_subscription(
                Image, f"/{did}/camera/image_raw",
                lambda msg, d=did: self._on_camera_frame(msg, d, "RGB"),
                sensor_qos
            )
            # Thermal Camera
            sub_thermal = self.create_subscription(
                Image, f"/{did}/thermal_camera/image_raw",
                lambda msg, d=did: self._on_camera_frame(msg, d, "THERMAL"),
                sensor_qos
            )
            # Odometry (Physics Ground Truth & VIO)
            sub_odom = self.create_subscription(
                Odometry, f"/model/{did}/odometry",
                lambda msg, d=did: self._on_odometry(msg, d),
                sensor_qos
            )
            # NavSat (GPS)
            sub_navsat = self.create_subscription(
                NavSatFix, f"/{did}/navsat",
                lambda msg, d=did: self._on_navsat(msg, d),
                sensor_qos
            )
            # IMU
            sub_imu = self.create_subscription(
                Imu, f"/{did}/imu",
                lambda msg, d=did: self._on_imu(msg, d),
                sensor_qos
            )
            # Rangefinder (Depth / AGL)
            sub_range = self.create_subscription(
                LaserScan, f"/{did}/rangefinder/distance",
                lambda msg, d=did: self._on_rangefinder(msg, d),
                sensor_qos
            )
            self.sub_cameras.extend([sub_rgb, sub_thermal, sub_odom, sub_navsat, sub_imu, sub_range])

        # Backwards-compatible generic camera subscription
        self.create_subscription(
            Image, "/camera/image_raw",
            lambda msg: self._on_camera_frame(msg, "uav_alpha", "RGB"),
            sensor_qos
        )

        # ROS 2 Subscriptions (Standardized topics across Subsystems B, C, D)
        self.sub_perception = self.create_subscription(
            String, "/sutra/perception/targets", self._on_perception_target, 10
        )
        self.sub_perception_fused = self.create_subscription(
            String, "/sutra/perception/fused_targets", self._on_perception_target, 10
        )
        self.sub_raft = self.create_subscription(
            String, "/sutra/comms/raft_status", self._on_raft_status, 10
        )
        self.sub_swarm_raft = self.create_subscription(
            String, "/sutra/swarm/raft_consensus", self._on_raft_status, 10
        )
        self.sub_telemetry = self.create_subscription(
            String, "/sutra/swarm/telemetry", self._on_swarm_telemetry, 10
        )
        self.sub_heartbeats = self.create_subscription(
            String, "/sutra/comms/heartbeats", self._on_heartbeat_telemetry, 10
        )

        # ROS 2 Publishers (Uplink to Swarm & GNC)
        self.pub_rtl = self.create_publisher(String, "/sutra/cmd/rtl", 10)
        self.pub_waypoint = self.create_publisher(String, "/sutra/cmd/waypoint", 10)

        # Start WebSocket Server in Async Loop Thread
        self.loop = asyncio.new_event_loop()
        self.ws_thread = threading.Thread(target=self._run_async_server, daemon=True)
        self.ws_thread.start()

        # Start HTTP MJPEG Multi-Stream Server
        MJPEGStreamHandler.bridge_ref = self
        self.httpd: Optional[HTTPServer] = None
        self.http_thread = threading.Thread(target=self._run_http_server, daemon=True)
        self.http_thread.start()

        # Telemetry Broadcast Timer (10Hz stream to GCS)
        self.timer = self.create_timer(0.1, self._broadcast_telemetry_tick)

        # Deep JSCC Neural Video Stream Broadcast Timer (10Hz stream to GCS)
        self.video_timer = self.create_timer(0.10, self._broadcast_video_stream_tick)

        self.get_logger().info(
            f"🚀 SUTRA GCS Gateway Bridge initialized on ws://{self.host}:{self.port} & http://{self.host}:{self.http_port}"
        )

    def _run_http_server(self):
        """Runs the embedded HTTP MJPEG multi-stream server."""
        ports_to_try = [self.http_port, self.http_port + 1, self.http_port + 10, 8089]
        for p in ports_to_try:
            try:
                self.httpd = ThreadedHTTPServer((self.host, p), MJPEGStreamHandler)
                self.http_port = p
                self.get_logger().info(f"📹 Multi-Stream MJPEG Video Server active on http://{self.host}:{p}/stream/<drone_id>")
                self.httpd.serve_forever()
                break
            except Exception as e:
                self.get_logger().warn(f"HTTP port {p} unavailable ({e}), trying next...")

    def _on_odometry(self, msg: Odometry, drone_id: str):
        """Processes 50Hz Gazebo/PX4 physical odometry for drone_id."""
        p = msg.pose.pose.position
        o = msg.pose.pose.orientation
        v = msg.twist.twist.linear

        roll, pitch, yaw = quat_to_euler(o.x, o.y, o.z, o.w)
        speed = min(50.0, math.sqrt(v.x**2 + v.y**2))

        # Convert Gazebo local ENU coordinate meters to WGS84
        lat = self.origin_lat + (p.y * 8.99e-6)
        lon = self.origin_lon + (p.x * 8.99e-6 / math.cos(math.radians(self.origin_lat)))
        alt = max(0.0, float(p.z))

        st = self.drone_states[drone_id]
        st["x"] = float(p.x)
        st["y"] = float(p.y)
        st["z"] = alt
        st["latitude"] = lat
        st["longitude"] = lon
        st["altitude"] = alt
        st["heading"] = yaw
        st["roll_deg"] = roll
        st["pitch_deg"] = pitch
        st["vx"] = float(v.x)
        st["vy"] = float(v.y)
        st["vz"] = float(v.z)
        st["speed"] = speed
        st["timestamp"] = time.time()
        st["has_physics"] = True

        # Keep swarm_telemetry in sync
        if drone_id in self.swarm_telemetry:
            self.swarm_telemetry[drone_id]["lat"] = lat
            self.swarm_telemetry[drone_id]["lon"] = lon
            self.swarm_telemetry[drone_id]["alt"] = alt
            self.swarm_telemetry[drone_id]["heading"] = yaw
            self.swarm_telemetry[drone_id]["speed"] = speed
            self.swarm_telemetry[drone_id]["has_physics"] = True

    def _on_navsat(self, msg: NavSatFix, drone_id: str):
        """Processes GPS coordinates from Gazebo/hardware."""
        if not math.isnan(msg.latitude) and not math.isnan(msg.longitude):
            st = self.drone_states[drone_id]
            st["gps"] = {
                "latitude": float(msg.latitude),
                "longitude": float(msg.longitude),
                "altitude": float(msg.altitude) if not math.isnan(msg.altitude) else st["altitude"],
                "status": int(msg.status.status) if hasattr(msg.status, 'status') else 3
            }

    def _on_imu(self, msg: Imu, drone_id: str):
        """Processes 200Hz IMU telemetry from drone flight controller."""
        st = self.drone_states[drone_id]
        st["imu"] = {
            "linear_acceleration": [
                float(msg.linear_acceleration.x),
                float(msg.linear_acceleration.y),
                float(msg.linear_acceleration.z)
            ],
            "angular_velocity": [
                float(msg.angular_velocity.x),
                float(msg.angular_velocity.y),
                float(msg.angular_velocity.z)
            ]
        }

    def _on_rangefinder(self, msg: LaserScan, drone_id: str):
        """Processes downward rangefinder altitude (AGL)."""
        if len(msg.ranges) > 0:
            val = msg.ranges[0]
            if not math.isnan(val) and not math.isinf(val) and val > 0.0:
                self.drone_states[drone_id]["depth_m"] = float(val)

    def _on_perception_target(self, msg: String):
        """Receive target alert from Subsystem C (Perception) -> Forward to GCS."""
        try:
            payload = json.loads(msg.data)
            targets = payload.get('targets', [payload]) if isinstance(payload, dict) else [payload]
            for target in targets:
                if not isinstance(target, dict):
                    continue
                self.survivor_alerts.insert(0, target)
                if len(self.survivor_alerts) > 50:
                    self.survivor_alerts.pop()
                self._broadcast_json({"topic": "SURVIVOR_ALERT", "data": target})
        except Exception as e:
            self.get_logger().error(f"Failed to parse perception target msg: {e}")

    def _on_heartbeat_telemetry(self, msg: String):
        """Receive heartbeat telemetry from Subsystem B mesh_node -> Update state cache."""
        try:
            hb = json.loads(msg.data)
            drone_id = hb.get("drone_id", "uav_alpha")
            if drone_id in self.swarm_telemetry:
                pos = hb.get("position", {})
                lat_deg_per_m = 1.0 / 111000.0
                lon_deg_per_m = 1.0 / (111000.0 * math.cos(math.radians(self.origin_lat)))
                lat = self.origin_lat + pos.get("y", 0.0) * lat_deg_per_m
                lon = self.origin_lon + pos.get("x", 0.0) * lon_deg_per_m
                alt = float(pos.get("z", 15.0))
                bat = float(hb.get("battery_pct", 95.0))
                self.swarm_telemetry[drone_id]["lat"] = lat
                self.swarm_telemetry[drone_id]["lon"] = lon
                self.swarm_telemetry[drone_id]["alt"] = alt
                self.swarm_telemetry[drone_id]["battery"] = bat
                st = self.drone_states.get(drone_id)
                if st and not st.get("has_physics"):
                    st["latitude"] = lat
                    st["longitude"] = lon
                    st["altitude"] = alt
                    st["battery"] = bat
        except Exception as e:
            self.get_logger().error(f"Failed to parse heartbeat telemetry msg: {e}")

    def _on_raft_status(self, msg: String):
        """Receive SwarmRAFT consensus update from Subsystem B (Comms)."""
        try:
            self.raft_consensus_status = json.loads(msg.data)
            self._broadcast_json({"topic": "RAFT_STATUS", "data": self.raft_consensus_status})
        except Exception as e:
            self.get_logger().error(f"Failed to parse raft status msg: {e}")

    def _on_swarm_telemetry(self, msg: String):
        """Receive live telemetry update from Subsystem A (GNC)."""
        try:
            data = json.loads(msg.data)
            drone_id = data.get("drone_id", "uav_alpha")
            self.swarm_telemetry[drone_id] = data
            if drone_id in self.drone_states:
                st = self.drone_states[drone_id]
                if "lat" in data:
                    st["latitude"] = float(data["lat"])
                if "lon" in data:
                    st["longitude"] = float(data["lon"])
                if "alt" in data:
                    st["altitude"] = float(data["alt"])
                if "heading" in data:
                    st["heading"] = float(data["heading"])
        except Exception as e:
            self.get_logger().error(f"Failed to parse telemetry msg: {e}")

    def dispatch_emergency_rtl(self, drone_id: str = "ALL"):
        """Uplink 1-Click Emergency RTL command to Swarm."""
        msg = String()
        cmd_payload = {"command": "RTL", "drone_id": drone_id, "timestamp": time.time()}
        msg.data = json.dumps(cmd_payload)
        self.pub_rtl.publish(msg)
        self.get_logger().warn(f"🚨 DISPATCHED EMERGENCY RTL COMMAND TO ROS 2: {cmd_payload}")

        # Update cached state
        for d in self.swarm_telemetry:
            if drone_id == "ALL" or drone_id == d:
                self.swarm_telemetry[d]["status"] = "RTL"
                if d in self.drone_states:
                    self.drone_states[d]["status"] = "RTL"

        self._broadcast_json({"topic": "RTL_DISPATCHED", "data": cmd_payload})

    def _broadcast_telemetry_tick(self):
        """Periodic 10Hz telemetry update tick with physics tracking."""
        t = time.time()
        for idx, (drone_id, state) in enumerate(self.swarm_telemetry.items()):
            if state.get("status") == "MISSION" and not state.get("has_physics"):
                # Fallback orbit if physics topics haven't published yet
                radius = 0.0003
                angle = t * 0.2 + idx * (2 * math.pi / 5)
                state["lat"] = self.origin_lat + radius * math.cos(angle)
                state["lon"] = self.origin_lon + radius * math.sin(angle)
                state["heading"] = (math.degrees(angle) + 90.0) % 360.0
                state["battery"] = max(10.0, state.get("battery", 98.0) - 0.01)

        payload = {
            "topic": "SWARM_TELEMETRY",
            "timestamp": t,
            "telemetry": self.swarm_telemetry,
            "raft_status": self.raft_consensus_status,
            "survivors": self.survivor_alerts[:10]
        }
        self._broadcast_json(payload)

    def _inject_footprint_async(self, drone_id: str, lat: float, lon: float, alt: float, heading: float, thermal: bool):
        """Asynchronously notifies 2D tile server (:8088) to project camera observation."""
        def _post():
            try:
                body = json.dumps({
                    "drone_id": drone_id,
                    "latitude": lat,
                    "longitude": lon,
                    "altitude": alt,
                    "heading": heading,
                    "snr_db": 15.0,
                    "thermal": thermal
                }).encode("utf-8")
                req = urllib.request.Request(
                    "http://127.0.0.1:8088/api/inject_footprint",
                    data=body,
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=0.25):
                    pass
            except Exception:
                pass
        threading.Thread(target=_post, daemon=True).start()

    def _on_camera_frame(self, msg: Image, drone_id: str, stream_type: str):
        """Processes live camera frame from ROS 2 Gazebo through Deep JSCC."""
        now = time.time()
        if (now - self.last_camera_msg_time.get(drone_id, 0.0)) < 0.066:  # Max 15 FPS per drone
            return
        self.last_camera_msg_time[drone_id] = now

        try:
            width = msg.width
            height = msg.height
            if width == 0 or height == 0:
                return

            if msg.encoding in ("rgb8", "bgr8"):
                frame = np.frombuffer(msg.data, dtype=np.uint8).reshape((height, width, 3))
                if msg.encoding == "rgb8":
                    frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            elif msg.encoding in ("mono8", "8UC1"):
                gray = np.frombuffer(msg.data, dtype=np.uint8).reshape((height, width))
                frame = cv2.applyColorMap(gray, cv2.COLORMAP_INFERNO)
            else:
                return

            # Compute Deep JSCC compression metrics
            raw_kb = round(len(msg.data) / 1024.0, 2)
            distance_to_gcs_m = 350.0 + (hash(drone_id) % 200)
            jscc_res = self.jscc_pipeline.process_semantic_transmission(
                image_size_kb=raw_kb if raw_kb > 10.0 else 256.0,
                distance_m=distance_to_gcs_m
            )

            # Resize to smooth streaming preview (640x360)
            preview = cv2.resize(frame, (640, 360), interpolation=cv2.INTER_AREA)

            # Overlay Deep JSCC Neural Telemetry Watermark on frame
            cv2.putText(preview, f"SUTRA DEEP JSCC | {drone_id.upper()} ({stream_type})", (16, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (56, 189, 248), 2)
            cv2.putText(preview, f"PSNR: {jscc_res['psnr_db']} dB | SNR: {jscc_res['snr_db']} dB | CR: {jscc_res['bandwidth_reduction_pct']}% Saved", (16, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (52, 211, 153), 1)

            _, buf = cv2.imencode('.jpg', preview, [cv2.IMWRITE_JPEG_QUALITY, 70])
            jpeg_bytes = buf.tobytes()
            b64_img = base64.b64encode(buf).decode('utf-8')

            alias = DRONE_ALIASES.get(drone_id, drone_id)

            # Cache for HTTP MJPEG streaming
            self.latest_frames[drone_id] = jpeg_bytes
            self.latest_frames[f"{drone_id}_{stream_type}"] = jpeg_bytes
            if alias != drone_id:
                self.latest_frames[alias] = jpeg_bytes
                self.latest_frames[f"{alias}_{stream_type}"] = jpeg_bytes

            # Synchronized pose from real-time physics cache
            st = self.drone_states.get(drone_id, {})
            pose_sync = {
                "latitude": st.get("latitude", self.origin_lat),
                "longitude": st.get("longitude", self.origin_lon),
                "altitude": st.get("altitude", 15.0),
                "heading": st.get("heading", 0.0),
                "roll_deg": st.get("roll_deg", 0.0),
                "pitch_deg": st.get("pitch_deg", 0.0),
                "x": st.get("x", 0.0),
                "y": st.get("y", 0.0),
                "z": st.get("z", 15.0)
            }

            packet = {
                "type": "CAMERA_FRAME",
                "topic": "CAMERA_FRAME",
                "world_id": self.world_id,
                "drone_id": alias,
                "uav_id": alias,
                "raw_drone_id": drone_id,
                "stream_type": stream_type,
                "image_b64": f"data:image/jpeg;base64,{b64_img}",
                "pose": pose_sync,
                "imu": st.get("imu", {}),
                "gps": st.get("gps", {}),
                "depth_m": st.get("depth_m", pose_sync["altitude"]),
                "jscc": {
                    "snr_db": jscc_res['snr_db'],
                    "psnr_db": jscc_res['psnr_db'],
                    "raw_size_kb": raw_kb,
                    "compressed_size_kb": jscc_res['compressed_size_kb'],
                    "compression_ratio": jscc_res['compression_ratio'],
                    "reduction_pct": jscc_res['bandwidth_reduction_pct'],
                    "latency_ms": jscc_res['latency_ms'],
                    "device": str(getattr(self.jscc_pipeline, 'device', 'CPU'))
                },
                "timestamp": now
            }

            # Broadcast to WebSocket clients
            self._broadcast_json(packet)

            # Asynchronously inject footprint into 2D Tile Server
            self._inject_footprint_async(
                drone_id=drone_id,
                lat=pose_sync["latitude"],
                lon=pose_sync["longitude"],
                alt=pose_sync["altitude"],
                heading=pose_sync["heading"],
                thermal=(stream_type == "THERMAL")
            )

        except Exception as err:
            self.get_logger().warn(f"Failed processing camera frame for {drone_id}: {err}")

    def _generate_synthetic_hud_frame(self, drone_id: str, stream_type: str, t: float) -> dict:
        """Generates dynamic, photorealistic reconnaissance video frame with Deep JSCC metrics."""
        w, h = 640, 360
        img = np.zeros((h, w, 3), dtype=np.uint8)

        # Resolve raw drone and alias
        actual_drone = DRONE_ALIASES.get(drone_id, drone_id)
        if actual_drone not in self.drones:
            actual_drone = drone_id if drone_id in self.drones else "uav_alpha"
        alias = DRONE_ALIASES.get(actual_drone, actual_drone)

        d_idx = self.drones.index(actual_drone) if actual_drone in self.drones else 0
        roll_angle = math.sin(t * 0.5 + d_idx) * 0.15
        pitch_offset = math.cos(t * 0.3 + d_idx) * 20

        if stream_type == "THERMAL":
            img[:] = (20, 10, 40)
            cv2.rectangle(img, (0, 240), (w, h), (40, 20, 60), -1)
            hotspot_x = int(w * 0.5 + math.sin(t + d_idx) * 100)
            hotspot_y = int(h * 0.55 + math.cos(t * 0.8 + d_idx) * 40)
            cv2.circle(img, (hotspot_x, hotspot_y), 32, (0, 140, 255), -1)
            cv2.circle(img, (hotspot_x, hotspot_y), 18, (0, 220, 255), -1)
            cv2.circle(img, (hotspot_x, hotspot_y), 8, (255, 255, 255), -1)
            cv2.rectangle(img, (hotspot_x - 36, hotspot_y - 40), (hotspot_x + 36, hotspot_y + 40), (0, 255, 255), 2)
            cv2.putText(img, "SURVIVOR [FLIR 37.2C]", (hotspot_x - 36, hotspot_y - 48), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
        else:
            cv2.rectangle(img, (0, 0), (w, int(h * 0.45 + pitch_offset)), (180, 130, 70), -1)
            pts = np.array([
                [0, int(h * 0.45 + pitch_offset)],
                [160, int(h * 0.35 + pitch_offset)],
                [320, int(h * 0.48 + pitch_offset)],
                [480, int(h * 0.32 + pitch_offset)],
                [w, int(h * 0.45 + pitch_offset)]
            ], np.int32)
            cv2.fillPoly(img, [pts], (100, 70, 40))
            cv2.rectangle(img, (0, int(h * 0.45 + pitch_offset)), (w, h), (40, 65, 45), -1)

            target_x = int(w * 0.52 + math.sin(t * 0.7 + d_idx) * 80)
            target_y = int(h * 0.60 + math.cos(t * 0.5 + d_idx) * 30)
            cv2.rectangle(img, (target_x - 28, target_y - 35), (target_x + 28, target_y + 35), (56, 189, 248), 2)
            cv2.putText(img, "SURVIVOR 96.8%", (target_x - 28, target_y - 42), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (56, 189, 248), 1)

        cx, cy = w // 2, h // 2
        cv2.line(img, (cx - 24, cy), (cx - 8, cy), (0, 255, 200), 1)
        cv2.line(img, (cx + 8, cy), (cx + 24, cy), (0, 255, 200), 1)
        cv2.line(img, (cx, cy - 24), (cx, cy - 8), (0, 255, 200), 1)
        cv2.line(img, (cx, cy + 8), (cx, cy + 24), (0, 255, 200), 1)
        cv2.circle(img, (cx, cy), 4, (0, 255, 200), 1)

        st = self.drone_states.get(actual_drone, {})
        alt = st.get("altitude", 15.0)
        bat = st.get("battery", 98.0)

        dist_m = 400.0 + d_idx * 150.0
        jscc_res = self.jscc_pipeline.process_semantic_transmission(image_size_kb=512.0, distance_m=dist_m)

        cv2.putText(img, f"SUTRA DEEP JSCC | {actual_drone.upper()} [{alias.upper()}] ({stream_type})", (16, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.60, (56, 189, 248), 2)
        cv2.putText(img, f"ALT: {alt:.1f}m | BAT: {bat:.1f}% | ROLL: {roll_angle*57.3:.1f} DEG", (16, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1)

        cv2.rectangle(img, (0, h - 30), (w, h), (10, 15, 26), -1)
        jscc_text = f"JSCC SNR: {jscc_res['snr_db']} dB | PSNR: {jscc_res['psnr_db']} dB | LATENCY: {jscc_res['latency_ms']} ms | {jscc_res['bandwidth_reduction_pct']}% REDUCTION"
        cv2.putText(img, jscc_text, (16, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (52, 211, 153), 1)

        _, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 75])
        jpeg_bytes = buf.tobytes()
        b64_img = base64.b64encode(buf).decode('utf-8')

        # Cache for HTTP MJPEG
        self.latest_frames[actual_drone] = jpeg_bytes
        self.latest_frames[f"{actual_drone}_{stream_type}"] = jpeg_bytes
        if alias != actual_drone:
            self.latest_frames[alias] = jpeg_bytes
            self.latest_frames[f"{alias}_{stream_type}"] = jpeg_bytes

        pose_sync = {
            "latitude": st.get("latitude", self.origin_lat),
            "longitude": st.get("longitude", self.origin_lon),
            "altitude": alt,
            "heading": st.get("heading", 0.0),
            "roll_deg": st.get("roll_deg", roll_angle * 57.3),
            "pitch_deg": st.get("pitch_deg", pitch_offset * 0.1),
            "x": st.get("x", 0.0),
            "y": st.get("y", 0.0),
            "z": alt
        }

        return {
            "type": "CAMERA_FRAME",
            "topic": "CAMERA_FRAME",
            "world_id": self.world_id,
            "drone_id": alias,
            "uav_id": alias,
            "raw_drone_id": actual_drone,
            "stream_type": stream_type,
            "image_b64": f"data:image/jpeg;base64,{b64_img}",
            "pose": pose_sync,
            "imu": st.get("imu", {}),
            "gps": st.get("gps", {}),
            "depth_m": alt,
            "jscc": {
                "snr_db": jscc_res['snr_db'],
                "psnr_db": jscc_res['psnr_db'],
                "raw_size_kb": 512.0,
                "compressed_size_kb": jscc_res['compressed_size_kb'],
                "compression_ratio": jscc_res['compression_ratio'],
                "reduction_pct": jscc_res['bandwidth_reduction_pct'],
                "latency_ms": jscc_res['latency_ms'],
                "device": str(getattr(self.jscc_pipeline, 'device', 'CUDA:0'))
            },
            "timestamp": t
        }

    def _broadcast_video_stream_tick(self):
        """Broadcasts Deep JSCC compressed camera frames to GCS clients at 10Hz."""
        now = time.time()
        time_since_camera = now - self.last_camera_msg_time.get(self.active_stream_drone, 0.0)
        if time_since_camera > 0.5:
            frame_packet = self._generate_synthetic_hud_frame(
                drone_id=self.active_stream_drone,
                stream_type=self.active_modality,
                t=now
            )
            self._broadcast_json(frame_packet)

    def _broadcast_json(self, data: dict):
        """Send JSON packet to all connected WebSockets clients and upstream GCS."""
        if not self.ws_clients and not (self.upstream_ws and self.upstream_ws.open):
            return
        message = json.dumps(data)
        asyncio.run_coroutine_threadsafe(self._async_broadcast(message), self.loop)

    async def _async_broadcast(self, message: str):
        if self.ws_clients:
            await asyncio.gather(*[client.send(message) for client in self.ws_clients if client.open], return_exceptions=True)
        if self.upstream_ws and self.upstream_ws.open:
            try:
                await self.upstream_ws.send(message)
            except Exception:
                pass

    async def _upstream_gcs_loop(self):
        """Maintains persistent connection to the GCS WebSocket Gateway (:8765)."""
        if not WEBSOCKETS_AVAILABLE:
            return
        while True:
            try:
                async with websockets.connect(self.gcs_ws_url) as ws:
                    self.upstream_ws = ws
                    self.get_logger().info(f"🔗 Connected upstream to GCS Gateway at {self.gcs_ws_url}")
                    async for msg in ws:
                        try:
                            data = json.loads(msg)
                            cmd = data.get("command") or data.get("type")
                            if cmd == "RTL":
                                self.dispatch_emergency_rtl(data.get("drone_id", "ALL"))
                            elif cmd in ("SELECT_STREAM", "camera.select_stream"):
                                raw_drone = data.get("drone_id", "uav_1")
                                actual_drone = DRONE_ALIASES.get(raw_drone, raw_drone)
                                self.active_stream_drone = actual_drone
                                self.active_modality = data.get("modality", "RGB").upper()
                        except Exception:
                            pass
            except Exception:
                self.upstream_ws = None
                await asyncio.sleep(2.0)

    def _run_async_server(self):
        asyncio.set_event_loop(self.loop)
        async def _async_main():
            # Launch upstream background connection
            self.loop.create_task(self._upstream_gcs_loop())

            if WEBSOCKETS_AVAILABLE:
                try:
                    async with websockets.serve(self._ws_handler, self.host, self.port):
                        self.get_logger().info(f"Listening for GCS clients on ws://{self.host}:{self.port}")
                        await asyncio.Future()
                except Exception as e:
                    self.get_logger().warn(f"WebSocket server stop: {e}")
            else:
                self.get_logger().error("websockets package not available!")

        try:
            self.loop.run_until_complete(_async_main())
        except Exception:
            pass

    async def _ws_handler(self, websocket, path=None):
        self.ws_clients.add(websocket)
        self.get_logger().info(f"📡 New Ground Station connected! Total clients: {len(self.ws_clients)}")
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    cmd = data.get("command")
                    if cmd == "RTL":
                        self.dispatch_emergency_rtl(data.get("drone_id", "ALL"))
                    elif cmd == "SELECT_STREAM":
                        self.active_stream_drone = data.get("drone_id", "uav_alpha")
                        self.active_modality = data.get("modality", "RGB")
                        self.get_logger().info(
                            f"🎥 Switched Active Deep JSCC Video Feed -> {self.active_stream_drone} [{self.active_modality}]"
                        )
                    elif cmd == "PING":
                        await websocket.send(json.dumps({"topic": "PONG", "timestamp": time.time()}))
                except Exception as err:
                    self.get_logger().error(f"Error handling GCS message: {err}")
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.ws_clients.remove(websocket)
            self.get_logger().info(f"Ground Station disconnected. Remaining clients: {len(self.ws_clients)}")

    def destroy_node(self):
        if hasattr(self, 'httpd') and self.httpd:
            try:
                self.httpd.shutdown()
                self.httpd.server_close()
            except Exception:
                pass
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    bridge = SutraGcsGatewayBridge()
    try:
        rclpy.spin(bridge)
    except KeyboardInterrupt:
        pass
    finally:
        bridge.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
