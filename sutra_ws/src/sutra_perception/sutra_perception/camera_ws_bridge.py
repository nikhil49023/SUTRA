#!/usr/bin/env python3
"""
Project SUTRA — Gazebo Camera -> GCS WebSocket Bridge
======================================================
Subsystem: C -> D Integration Bridge

PURPOSE:
  Runs on Nikhil's laptop (Gazebo simulation machine).
  Subscribes to live ROS 2 camera topics published by Gazebo SITL,
  JPEG-compresses each frame, base64-encodes it, and forwards it as
  a CAMERA_FRAME WebSocket message to Siva's GCS backend at :8765.

  The GCS backend (websocket_gateway.py) then broadcasts the frame
  to all connected React dashboard clients, showing it live in the
  LiveCameraFeedSection UI.

USAGE (run on Nikhil's Gazebo laptop):
  # Install deps once:
  pip install websockets opencv-python numpy

  # Run the bridge:
  python3 camera_ws_bridge.py --gcs-url ws://49.200.103.222:8765

  # With specific drones and FPS:
  python3 camera_ws_bridge.py --gcs-url ws://49.200.103.222:8765 --fps 15 --drones uav_1 uav_2 uav_3

  # Testing without ROS 2 (uses laptop webcam as uav_1):
  python3 camera_ws_bridge.py --gcs-url ws://49.200.103.222:8765 --no-ros
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import logging
import sys
import threading
import time
from typing import Any, Dict, List

import cv2
import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("camera_ws_bridge")

DEFAULT_GCS_WS_URL  = "ws://49.200.103.222:8765"
DEFAULT_DRONES      = ["uav_1", "uav_2", "uav_3", "uav_4", "uav_5"]
DEFAULT_FPS_CAP     = 15
JPEG_QUALITY        = 65       # ~97% bandwidth reduction vs raw RGB
RECONNECT_DELAY_S   = 3.0


# ---------------------------------------------------------------------------
# Thread-safe single-slot frame buffer (always keep only latest frame)
# ---------------------------------------------------------------------------
class FrameBuffer:
    def __init__(self):
        self._frames: Dict[str, Dict] = {}
        self._lock = threading.Lock()

    def put(self, key: str, drone_id: str, stream_type: str,
            frame: np.ndarray, raw_size_kb: float):
        ret, buf = cv2.imencode(".jpg", frame,
                                [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
        if not ret:
            return
        jpeg_bytes   = buf.tobytes()
        comp_kb      = len(jpeg_bytes) / 1024.0
        reduction    = round((1.0 - comp_kb / max(raw_size_kb, 1.0)) * 100.0, 1)
        image_b64    = "data:image/jpeg;base64," + base64.b64encode(jpeg_bytes).decode()
        with self._lock:
            self._frames[key] = {
                "drone_id":           drone_id,
                "stream_type":        stream_type,
                "image_b64":          image_b64,
                "timestamp":          time.time(),
                "width":              frame.shape[1],
                "height":             frame.shape[0],
                "raw_size_kb":        round(raw_size_kb, 1),
                "compressed_size_kb": round(comp_kb, 1),
                "reduction_pct":      reduction,
            }

    def pop_all(self) -> List[Dict]:
        with self._lock:
            frames = list(self._frames.values())
            self._frames.clear()
        return frames


frame_buffer = FrameBuffer()


# ---------------------------------------------------------------------------
# ROS 2 Subscriber (runs on Nikhil's machine that has Gazebo + ROS 2)
# ---------------------------------------------------------------------------
def _start_ros_subscribers(drone_ids: List[str], fps_cap: int) -> bool:
    try:
        import rclpy
        from rclpy.node import Node
        from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
        from sensor_msgs.msg import Image
    except ImportError:
        logger.warning("rclpy not available — ROS 2 camera subscription skipped.")
        return False

    class CamBridgeNode(Node):
        def __init__(self):
            super().__init__("sutra_camera_ws_bridge")
            qos = QoSProfile(
                reliability=ReliabilityPolicy.BEST_EFFORT,
                history=HistoryPolicy.KEEP_LAST,
                depth=1,
            )
            self._subs = []
            for did in drone_ids:
                for topic, stype in [
                    (f"/{did}/camera/image_raw",  "RGB"),
                    (f"/{did}/thermal/image_raw",  "THERMAL"),
                ]:
                    self._subs.append(
                        self.create_subscription(Image, topic,
                                                 self._make_cb(did, stype), qos)
                    )
                    logger.info(f"  Subscribed to {topic}")

        def _make_cb(self, drone_id: str, stream_type: str):
            last_t   = [0.0]
            min_iv   = 1.0 / fps_cap

            def cb(msg):
                now = time.time()
                if now - last_t[0] < min_iv:
                    return
                last_t[0] = now
                try:
                    enc = msg.encoding.lower()
                    raw = np.frombuffer(msg.data, dtype=np.uint8)
                    if enc in ("rgb8",):
                        frame = raw.reshape(msg.height, msg.width, 3)
                        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                    elif enc in ("bgr8",):
                        frame = raw.reshape(msg.height, msg.width, 3)
                    elif enc in ("mono8",):
                        gray  = raw.reshape(msg.height, msg.width)
                        frame = cv2.applyColorMap(gray, cv2.COLORMAP_INFERNO)
                    elif enc in ("rgba8",):
                        frame = raw.reshape(msg.height, msg.width, 4)
                        frame = cv2.cvtColor(frame, cv2.COLOR_RGBA2BGR)
                    else:
                        channels = msg.step // msg.width
                        frame = raw.reshape(msg.height, msg.width, channels)

                    raw_kb = (msg.width * msg.height * 3) / 1024.0
                    frame_buffer.put(f"{drone_id}_{stream_type}",
                                     drone_id, stream_type, frame, raw_kb)
                except Exception as e:
                    logger.error(f"Frame decode error [{drone_id}/{stream_type}]: {e}")
            return cb

    def _spin():
        try:
            rclpy.init()
            node = CamBridgeNode()
            logger.info("ROS 2 camera bridge spinning...")
            rclpy.spin(node)
        except Exception as e:
            logger.error(f"ROS 2 spin error: {e}")

    threading.Thread(target=_spin, daemon=True).start()
    return True


# ---------------------------------------------------------------------------
# Webcam fallback (testing without ROS 2 / Gazebo)
# ---------------------------------------------------------------------------
def _start_webcam_fallback(drone_id: str, device: int, fps_cap: int):
    def _run():
        cap = cv2.VideoCapture(device)
        if not cap.isOpened():
            logger.error(f"Cannot open webcam device {device}")
            return
        cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, fps_cap)
        logger.info(f"Webcam device {device} -> streaming as [{drone_id}] RGB")
        min_iv = 1.0 / fps_cap
        last_t = 0.0
        while True:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.05)
                continue
            now = time.time()
            if now - last_t < min_iv:
                time.sleep(0.005)
                continue
            last_t = now
            frame_buffer.put(f"{drone_id}_RGB", drone_id, "RGB",
                             frame, (640 * 480 * 3) / 1024.0)
    threading.Thread(target=_run, daemon=True).start()


# ---------------------------------------------------------------------------
# WebSocket sender — persistent connection to GCS backend
# ---------------------------------------------------------------------------
async def _ws_loop(gcs_url: str, fps_cap: int):
    try:
        import websockets
    except ImportError:
        logger.error("websockets not installed. Run: pip install websockets")
        sys.exit(1)

    send_interval = 1.0 / fps_cap
    logger.info(f"Connecting to GCS backend: {gcs_url}")

    while True:
        try:
            async with websockets.connect(
                gcs_url,
                ping_interval=10,
                ping_timeout=5,
                close_timeout=3,
                max_size=10 * 1024 * 1024,
            ) as ws:
                logger.info(f"CONNECTED to GCS backend: {gcs_url}")
                while True:
                    frames = frame_buffer.pop_all()
                    for fdata in frames:
                        msg = json.dumps({
                            "command_type": "CAMERA_FRAME",
                            "payload": fdata,
                        })
                        await ws.send(msg)
                        logger.debug(
                            f"Sent {fdata['drone_id']} [{fdata['stream_type']}] "
                            f"{fdata.get('compressed_size_kb', '?'):.1f}KB "
                            f"({fdata.get('reduction_pct', '?')}% saved)"
                        )
                    await asyncio.sleep(send_interval)

        except Exception as e:
            logger.warning(f"Connection lost ({e}). Retrying in {RECONNECT_DELAY_S}s...")
            await asyncio.sleep(RECONNECT_DELAY_S)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="SUTRA: Gazebo Camera -> GCS WebSocket Bridge"
    )
    parser.add_argument("--gcs-url",  default=DEFAULT_GCS_WS_URL,
                        help="GCS backend WebSocket URL")
    parser.add_argument("--drones",   nargs="+", default=DEFAULT_DRONES,
                        help="Drone IDs to subscribe to")
    parser.add_argument("--fps",      type=int,  default=DEFAULT_FPS_CAP,
                        help="Max FPS per stream to send")
    parser.add_argument("--no-ros",   action="store_true",
                        help="Skip ROS 2, use webcam as uav_1 feed (testing)")
    parser.add_argument("--webcam",   type=int,  default=0,
                        help="Webcam device index when --no-ros is set")
    args = parser.parse_args()

    print("\n" + "=" * 58)
    print("  Project SUTRA — Camera -> GCS WebSocket Bridge")
    print("=" * 58)
    print(f"  GCS Backend   :  {args.gcs_url}")
    print(f"  Drones        :  {args.drones}")
    print(f"  FPS Cap       :  {args.fps} FPS per stream")
    print(f"  JPEG Quality  :  {JPEG_QUALITY}%  (~97% bandwidth saved)")
    print("=" * 58 + "\n")

    ros_ok = False
    if not args.no_ros:
        ros_ok = _start_ros_subscribers(args.drones, args.fps)

    if not ros_ok:
        logger.warning("ROS 2 not available — using webcam fallback for uav_1")
        _start_webcam_fallback(
            drone_id = args.drones[0] if args.drones else "uav_1",
            device   = args.webcam,
            fps_cap  = args.fps,
        )

    try:
        asyncio.run(_ws_loop(args.gcs_url, args.fps))
    except KeyboardInterrupt:
        logger.info("Bridge stopped.")


if __name__ == "__main__":
    main()
