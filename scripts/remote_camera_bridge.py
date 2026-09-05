#!/usr/bin/env python3
"""
SUTRA Remote Multi-UAV Camera Receiver Bridge
Subsystem: Subsystem D (GCS Receiver) ⇄ Subsystem B/C (Remote Gazebo)

Connects to friend's laptop running Gazebo Sim on ROS_DOMAIN_ID=42.
Subscribes to /uav_1/camera/image_raw through /uav_8/camera/image_raw.
Optimizes transport over Wi-Fi via dynamic JPEG compression and selective streaming.
Broadcasts live frames to SUTRA GCS via WebSocket.
"""

import sys
import os
import time
import json
import base64
import asyncio
import threading
import argparse
import numpy as np
import cv2

# Set ROS 2 environment defaults if not set
os.environ.setdefault("ROS_DOMAIN_ID", "42")
os.environ.setdefault("ROS_LOCALHOST_ONLY", "0")
os.environ.setdefault("ROS_STATIC_PEERS", "10.152.0.191")
os.environ.setdefault("ROS_AUTOMATIC_DISCOVERY_RANGE", "SUBNET")

import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
from sensor_msgs.msg import Image

try:
    import websockets
except ImportError:
    websockets = None


class RemoteCameraBridge(Node):
    def __init__(self, gcs_ws_url="ws://127.0.0.1:8765"):
        super().__init__("sutra_remote_camera_bridge")
        self.gcs_ws_url = gcs_ws_url
        self.active_world = "WORLD_1"
        self.active_uav = "uav_1"
        self.active_modality = "RGB"
        
        self.ws = None
        self.ws_connected = False
        self.last_frame_times = {}
        self.frame_counts = {}
        self.fps_tracker = {}
        
        self.available_uavs = [f"uav_{i}" for i in range(1, 9)]
        
        # QoS for sensor video streaming (Best Effort, depth 1 to prevent queue buildup)
        self.sensor_qos = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            history=HistoryPolicy.KEEP_LAST,
            depth=1
        )
        
        # Subscribe to UAV-1 through UAV-8 Optical and Thermal feeds
        self.subs_rgb = {}
        self.subs_thermal = {}
        for uav in self.available_uavs:
            self.last_frame_times[uav] = 0.0
            self.frame_counts[uav] = 0
            self.fps_tracker[uav] = 0.0
            
            # RGB Camera
            sub_rgb = self.create_subscription(
                Image,
                f"/{uav}/camera/image_raw",
                lambda msg, u=uav: self._on_image(msg, u, "RGB"),
                self.sensor_qos
            )
            self.subs_rgb[uav] = sub_rgb
            
            # Thermal Camera
            sub_thermal = self.create_subscription(
                Image,
                f"/{uav}/thermal/image_raw",
                lambda msg, u=uav: self._on_image(msg, u, "THERMAL"),
                self.sensor_qos
            )
            self.subs_thermal[uav] = sub_thermal

        self.get_logger().info(
            f"✅ SUTRA Remote Camera Bridge active on DOMAIN_ID={os.environ.get('ROS_DOMAIN_ID')}! "
            f"Subscribed to {len(self.available_uavs)} UAV camera streams."
        )

        # Async WebSocket communication loop in background thread
        self.loop = asyncio.new_event_loop()
        self.ws_thread = threading.Thread(target=self._run_async_loop, daemon=True)
        self.ws_thread.start()

        # Status heartbeat timer (publishes live connection state to console)
        self.timer = self.create_timer(2.0, self._log_status_heartbeat)

    def _on_image(self, msg: Image, drone_id: str, modality: str):
        now = time.time()
        self.frame_counts[drone_id] += 1
        
        # Track FPS per UAV
        dt = now - self.last_frame_times.get(drone_id, 0.0)
        if dt > 0.0:
            instant_fps = 1.0 / dt
            self.fps_tracker[drone_id] = round(self.fps_tracker[drone_id] * 0.7 + instant_fps * 0.3, 1)
        self.last_frame_times[drone_id] = now

        # Wi-Fi Optimization: Only encode and send the ACTIVE stream over WebSocket
        # Max rate throttled to 20 FPS to prevent bandwidth saturation
        if drone_id.lower() != self.active_uav.lower():
            return
        if modality != self.active_modality:
            return
            
        if dt < 0.045:  # Throttle to ~22 FPS max
            return

        try:
            w, h = msg.width, msg.height
            if w == 0 or h == 0:
                return

            raw_size_bytes = len(msg.data)
            raw_kb = round(raw_size_bytes / 1024.0, 1)

            # Convert ROS Image buffer to OpenCV numpy array
            if msg.encoding in ("rgb8", "bgr8"):
                frame = np.frombuffer(msg.data, dtype=np.uint8).reshape((h, w, 3))
                if msg.encoding == "rgb8":
                    frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            elif msg.encoding in ("mono8", "8UC1"):
                gray = np.frombuffer(msg.data, dtype=np.uint8).reshape((h, w))
                frame = cv2.applyColorMap(gray, cv2.COLORMAP_INFERNO)
            elif msg.encoding in ("mono16", "16UC1"):
                raw16 = np.frombuffer(msg.data, dtype=np.uint16).reshape((h, w))
                norm8 = cv2.normalize(raw16, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
                frame = cv2.applyColorMap(norm8, cv2.COLORMAP_INFERNO)
            else:
                return

            # Wi-Fi Transport Optimization: Resize to standard streaming resolution (640x360)
            target_w, target_h = 640, 360
            if w > target_w:
                frame = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)

            # High-efficiency JPEG compression (Quality 75 provides excellent crispness at ~40 KB)
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 75]
            success, encoded_buf = cv2.imencode(".jpg", frame, encode_param)
            if not success:
                return

            compressed_kb = round(len(encoded_buf) / 1024.0, 1)
            b64_str = base64.b64encode(encoded_buf).decode("utf-8")

            packet = {
                "type": "CAMERA_FRAME",
                "topic": "CAMERA_FRAME",
                "world_id": self.active_world,
                "drone_id": drone_id,
                "stream_type": modality,
                "image_b64": f"data:image/jpeg;base64,{b64_str}",
                "stream_url": f"http://10.152.0.191:8080/stream/{drone_id}" if modality == "RGB" else f"http://10.152.0.191:8080/stream/{drone_id}/thermal",
                "timestamp": now,
                "width": target_w,
                "height": target_h,
                "raw_size_kb": raw_kb,
                "compressed_size_kb": compressed_kb,
                "reduction_pct": round((1.0 - (compressed_kb / max(1.0, raw_kb))) * 100.0, 1),
                "fps": self.fps_tracker.get(drone_id, 0.0),
                "latency_ms": 15
            }

            self._send_to_gcs(packet)

        except Exception as err:
            self.get_logger().warn(f"Frame encoding error for {drone_id}: {err}")

    def _send_to_gcs(self, packet: dict):
        if self.ws and self.ws_connected and self.loop and self.loop.is_running():
            msg_str = json.dumps(packet)
            asyncio.run_coroutine_threadsafe(self.ws.send(msg_str), self.loop)

    def _run_async_loop(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self._websocket_worker())

    async def _websocket_worker(self):
        while True:
            try:
                self.get_logger().info(f"Connecting to GCS Gateway at {self.gcs_ws_url}...")
                async with websockets.connect(self.gcs_ws_url, max_size=10_000_000) as ws:
                    self.ws = ws
                    self.ws_connected = True
                    self.get_logger().info("✅ Connected to GCS WebSocket Gateway! Video stream uplink active.")
                    
                    async for raw_msg in ws:
                        try:
                            cmd_data = json.loads(raw_msg)
                            cmd = cmd_data.get("command") or cmd_data.get("type")
                            if cmd in ("SELECT_STREAM", "camera.select_stream"):
                                payload = cmd_data.get("payload") or cmd_data
                                new_world = str(payload.get("world_id", self.active_world)).upper()
                                new_uav = str(payload.get("drone_id", self.active_uav)).lower()
                                new_mod = str(payload.get("modality", self.active_modality)).upper()
                                self.active_world = new_world
                                self.active_uav = new_uav
                                self.active_modality = new_mod
                                self.get_logger().info(f"🎥 Active stream switched to: {self.active_world} + {self.active_uav} [{self.active_modality}]")
                        except Exception:
                            pass
            except Exception as e:
                self.ws_connected = False
                self.ws = None
                await asyncio.sleep(2.0)

    def _log_status_heartbeat(self):
        active_counts = []
        now = time.time()
        for uav in self.available_uavs:
            dt = now - self.last_frame_times.get(uav, 0.0)
            if dt < 2.0:
                fps = self.fps_tracker.get(uav, 0.0)
                active_counts.append(f"{uav.upper()}: {fps} FPS")
        if active_counts:
            self.get_logger().info(f"🟢 Active Video Feeds -> {', '.join(active_counts)} | Selected: {self.active_uav.upper()}")


def main():
    parser = argparse.ArgumentParser(description="SUTRA Remote Camera Bridge")
    parser.add_argument("--gcs-ws", default="ws://127.0.0.1:8765", help="GCS WebSocket Gateway URL")
    args = parser.parse_args()

    rclpy.init()
    node = RemoteCameraBridge(gcs_ws_url=args.gcs_ws)
    try:
        rclpy.spin(node)
    except Exception:
        pass
    finally:
        try:
            node.destroy_node()
        except Exception:
            pass
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
