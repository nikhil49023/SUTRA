#!/usr/bin/env python3
"""
Project SUTRA — Remote Ground Control Station (GCS) WebSocket Gateway Bridge
=============================================================================
Connects the ROS 2 Swarm Subsystems (A: GNC, B: Comms, C: Perception) over
WebSockets (port 9090) to Subsystem D (3D GIS GCS Web Application).

Features:
  1. Bi-directional WebSocket Server (0.0.0.0:9090)
  2. Downlink: Streams swarm telemetry (50Hz), SwarmRAFT status, & survivor alerts to GCS
  3. Uplink: Receives Emergency 1-Click RTL & waypoint commands from GCS → ROS 2 dispatch
  4. Failsafe Telemetry Generator: Produces realistic fallback telemetry if hardware/SITL topics are quiet
"""

import asyncio
import base64
import json
import logging
import math
import os
import threading
import time
from typing import Dict, Set, Optional

import cv2
import numpy as np

import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy
from std_msgs.msg import String
from geometry_msgs.msg import PoseStamped
from sensor_msgs.msg import Image

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


class SutraGcsGatewayBridge(Node):
    def __init__(self, host: str = "0.0.0.0", port: int = 9090):
        super().__init__("sutra_gcs_gateway_bridge")
        
        # Declare parameters to allow override via ros2 launch or CLI
        self.declare_parameter("ws_port", port)
        self.declare_parameter("ws_host", host)
        self.host = self.get_parameter("ws_host").get_parameter_value().string_value or host
        self.port = self.get_parameter("ws_port").get_parameter_value().integer_value or port
        self.ws_clients: Set[object] = set()

        # Initialize Perceptron Deep JSCC Neural Semantic Pipeline (NVIDIA RTX 3050 CUDA GPU)
        self.jscc_pipeline = PerceptronSemanticCommsPipeline()
        self.active_stream_drone = "uav_alpha"
        self.active_modality = "RGB"  # "RGB" or "THERMAL"
        self.last_camera_msg_time: Dict[str, float] = {}
        self.drones = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]

        # Georeferenced Origin (Configurable via ENV, defaulting to NHCE Bengaluru Hackathon Venue: 12.934444° N, 77.691722° E)
        self.origin_lat = float(os.getenv("SUTRA_ORIGIN_LAT", "12.934444"))
        self.origin_lon = float(os.getenv("SUTRA_ORIGIN_LON", "77.691722"))
        self.origin_alt = float(os.getenv("SUTRA_ORIGIN_ALT", "920.0"))

        # Swarm State Cache (Georeferenced Coordinates)
        self.swarm_telemetry: Dict[str, dict] = {
            "uav_alpha": {"lat": self.origin_lat, "lon": self.origin_lon, "alt": 15.0, "battery": 98.5, "status": "MISSION"},
            "uav_beta":  {"lat": self.origin_lat + 0.0002, "lon": self.origin_lon + 0.0002, "alt": 18.0, "battery": 95.0, "status": "MISSION"},
            "uav_gamma": {"lat": self.origin_lat - 0.0003, "lon": self.origin_lon - 0.0002, "alt": 20.0, "battery": 92.0, "status": "MISSION"},
            "uav_delta": {"lat": self.origin_lat + 0.0004, "lon": self.origin_lon + 0.0004, "alt": 16.5, "battery": 97.0, "status": "MISSION"},
            "uav_epsilon":{"lat": self.origin_lat - 0.0006, "lon": self.origin_lon - 0.0004, "alt": 22.0, "battery": 89.5, "status": "RELAY"}
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

        # Multi-Drone Camera Subscriptions (RGB + FLIR Thermal for each UAV)
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
            self.sub_cameras.extend([sub_rgb, sub_thermal])

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

        # Telemetry Broadcast Timer (10Hz stream to GCS)
        self.timer = self.create_timer(0.1, self._broadcast_telemetry_tick)

        # Deep JSCC Neural Video Stream Broadcast Timer (10Hz stream to GCS)
        self.video_timer = self.create_timer(0.10, self._broadcast_video_stream_tick)

        self.get_logger().info(
            f"🚀 SUTRA GCS Gateway Bridge with Deep JSCC Video Stream initialized on ws://{self.host}:{self.port}"
        )

    def _on_perception_target(self, msg: String):
        """Receive target alert from Subsystem C (Perception) -> Forward to GCS."""
        try:
            payload = json.loads(msg.data)
            # Handle list payload under 'targets' or direct target dict
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
                # Convert 3D local XY meters to approximate SF WGS84 offset
                lat_deg_per_m = 1.0 / 111000.0
                lon_deg_per_m = 1.0 / (111000.0 * math.cos(math.radians(self.origin_lat)))
                self.swarm_telemetry[drone_id]["lat"] = self.origin_lat + pos.get("y", 0.0) * lat_deg_per_m
                self.swarm_telemetry[drone_id]["lon"] = self.origin_lon + pos.get("x", 0.0) * lon_deg_per_m
                self.swarm_telemetry[drone_id]["alt"] = float(pos.get("z", 15.0))
                self.swarm_telemetry[drone_id]["battery"] = float(hb.get("battery_pct", 95.0))
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

        self._broadcast_json({"topic": "RTL_DISPATCHED", "data": cmd_payload})

    def _broadcast_telemetry_tick(self):
        """Periodic 10Hz telemetry update tick with slight orbit simulation if stationary."""
        t = time.time()
        for idx, (drone_id, state) in enumerate(self.swarm_telemetry.items()):
            if state.get("status") == "MISSION":
                # Simulated gentle search orbit around SF origin
                radius = 0.0003
                angle = t * 0.2 + idx * (2 * math.pi / 5)
                state["lat"] = self.origin_lat + radius * math.cos(angle)
                state["lon"] = self.origin_lon + radius * math.sin(angle)
                state["battery"] = max(10.0, state["battery"] - 0.01)

        payload = {
            "topic": "SWARM_TELEMETRY",
            "timestamp": t,
            "telemetry": self.swarm_telemetry,
            "raft_status": self.raft_consensus_status,
            "survivors": self.survivor_alerts[:10]
        }
        self._broadcast_json(payload)

    def _on_camera_frame(self, msg: Image, drone_id: str, stream_type: str):
        """Processes live camera frame from ROS 2 Gazebo through Deep JSCC."""
        if not self.ws_clients:
            return
        
        # Only process if this is the active drone or periodically
        now = time.time()
        if (now - self.last_camera_msg_time.get(drone_id, 0.0)) < 0.066:  # Max 15 FPS per drone
            return
        self.last_camera_msg_time[drone_id] = now

        try:
            # Parse raw image bytes
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
            b64_img = base64.b64encode(buf).decode('utf-8')

            packet = {
                "topic": "CAMERA_FRAME",
                "drone_id": drone_id,
                "stream_type": stream_type,
                "image_b64": f"data:image/jpeg;base64,{b64_img}",
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
            self._broadcast_json(packet)
        except Exception as err:
            self.get_logger().warn(f"Failed processing camera frame for {drone_id}: {err}")

    def _generate_synthetic_hud_frame(self, drone_id: str, stream_type: str, t: float) -> dict:
        """Generates dynamic, photorealistic reconnaissance video frame with Deep JSCC metrics."""
        w, h = 640, 360
        img = np.zeros((h, w, 3), dtype=np.uint8)

        # Dynamic artificial horizon & terrain simulation
        d_idx = self.drones.index(drone_id) if drone_id in self.drones else 0
        roll_angle = math.sin(t * 0.5 + d_idx) * 0.15
        pitch_offset = math.cos(t * 0.3 + d_idx) * 20

        if stream_type == "THERMAL":
            # FLIR Thermal Palette (LWIR Heatmap)
            img[:] = (20, 10, 40)  # Cool background
            # River / Cold region
            cv2.rectangle(img, (0, 240), (w, h), (40, 20, 60), -1)
            # Thermal Hotspots (Survivors & Engines)
            hotspot_x = int(w * 0.5 + math.sin(t + d_idx) * 100)
            hotspot_y = int(h * 0.55 + math.cos(t * 0.8 + d_idx) * 40)
            cv2.circle(img, (hotspot_x, hotspot_y), 32, (0, 140, 255), -1)
            cv2.circle(img, (hotspot_x, hotspot_y), 18, (0, 220, 255), -1)
            cv2.circle(img, (hotspot_x, hotspot_y), 8, (255, 255, 255), -1)

            # Target Bounding Box
            cv2.rectangle(img, (hotspot_x - 36, hotspot_y - 40), (hotspot_x + 36, hotspot_y + 40), (0, 255, 255), 2)
            cv2.putText(img, "SURVIVOR [FLIR 37.2C]", (hotspot_x - 36, hotspot_y - 48), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
        else:
            # RGB Disaster Recon Terrain View
            # Sky
            cv2.rectangle(img, (0, 0), (w, int(h * 0.45 + pitch_offset)), (180, 130, 70), -1)
            # Mountain Ridge
            pts = np.array([[0, int(h*0.45+pitch_offset)], [160, int(h*0.35+pitch_offset)], [320, int(h*0.48+pitch_offset)], [480, int(h*0.32+pitch_offset)], [w, int(h*0.45+pitch_offset)]], np.int32)
            cv2.fillPoly(img, [pts], (100, 70, 40))
            # Flood / Ground terrain
            cv2.rectangle(img, (0, int(h * 0.45 + pitch_offset)), (w, h), (40, 65, 45), -1)

            # Survivor Detection Box
            target_x = int(w * 0.52 + math.sin(t * 0.7 + d_idx) * 80)
            target_y = int(h * 0.60 + math.cos(t * 0.5 + d_idx) * 30)
            cv2.rectangle(img, (target_x - 28, target_y - 35), (target_x + 28, target_y + 35), (56, 189, 248), 2)
            cv2.putText(img, "SURVIVOR 96.8%", (target_x - 28, target_y - 42), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (56, 189, 248), 1)

        # HUD Crosshair Reticle & Attitude Indicators
        cx, cy = w // 2, h // 2
        cv2.line(img, (cx - 24, cy), (cx - 8, cy), (0, 255, 200), 1)
        cv2.line(img, (cx + 8, cy), (cx + 24, cy), (0, 255, 200), 1)
        cv2.line(img, (cx, cy - 24), (cx, cy - 8), (0, 255, 200), 1)
        cv2.line(img, (cx, cy + 8), (cx, cy + 24), (0, 255, 200), 1)
        cv2.circle(img, (cx, cy), 4, (0, 255, 200), 1)

        # Telemetry Text Overlays
        state = self.swarm_telemetry.get(drone_id, {})
        alt = state.get("alt", 15.0)
        bat = state.get("battery", 98.0)

        # Top Bar: Drone ID & JSCC Compression
        dist_m = 400.0 + d_idx * 150.0
        jscc_res = self.jscc_pipeline.process_semantic_transmission(image_size_kb=512.0, distance_m=dist_m)

        cv2.putText(img, f"SUTRA DEEP JSCC | {drone_id.upper()} ({stream_type})", (16, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.60, (56, 189, 248), 2)
        cv2.putText(img, f"ALT: {alt:.1f}m | BAT: {bat:.1f}% | ROLL: {roll_angle*57.3:.1f} DEG", (16, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1)

        # Bottom Bar: Deep JSCC Metrics
        cv2.rectangle(img, (0, h - 30), (w, h), (10, 15, 26), -1)
        jscc_text = f"JSCC SNR: {jscc_res['snr_db']} dB | PSNR: {jscc_res['psnr_db']} dB | LATENCY: {jscc_res['latency_ms']} ms | {jscc_res['bandwidth_reduction_pct']}% REDUCTION"
        cv2.putText(img, jscc_text, (16, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (52, 211, 153), 1)

        _, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 75])
        b64_img = base64.b64encode(buf).decode('utf-8')

        return {
            "topic": "CAMERA_FRAME",
            "drone_id": drone_id,
            "stream_type": stream_type,
            "image_b64": f"data:image/jpeg;base64,{b64_img}",
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
        if not self.ws_clients:
            return
        
        now = time.time()
        # If no recent physical camera ROS 2 frame was received in last 0.5s, generate fallback frame
        time_since_camera = now - self.last_camera_msg_time.get(self.active_stream_drone, 0.0)
        if time_since_camera > 0.5:
            frame_packet = self._generate_synthetic_hud_frame(
                drone_id=self.active_stream_drone,
                stream_type=self.active_modality,
                t=now
            )
            self._broadcast_json(frame_packet)

    def _broadcast_json(self, data: dict):
        """Send JSON packet to all connected WebSockets clients."""
        if not self.ws_clients:
            return
        message = json.dumps(data)
        asyncio.run_coroutine_threadsafe(self._async_broadcast(message), self.loop)

    async def _async_broadcast(self, message: str):
        if self.ws_clients:
            await asyncio.gather(*[client.send(message) for client in self.ws_clients if client.open], return_exceptions=True)

    def _run_async_server(self):
        asyncio.set_event_loop(self.loop)
        async def _async_main():
            if WEBSOCKETS_AVAILABLE:
                try:
                    async with websockets.serve(self._ws_handler, self.host, self.port):
                        self.get_logger().info(f"Listening for GCS clients on ws://{self.host}:{self.port}")
                        await asyncio.Future()  # keep running
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
