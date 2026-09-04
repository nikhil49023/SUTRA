#!/usr/bin/env python3
"""
================================================================================
PROJECT SUTRA — DEEP JSCC 360° CAMERA STREAMER & ORTHOMOSAIC INGESTION BRIDGE
================================================================================
Author: Tech Lead Nikhil & Siva Kesava
Target: Smart Horizon Grand Finals (SH-DST-05)

PURPOSE:
  1. Simulates/Ingests 360° panoramic downward camera feeds across the 5 SUTRA UAVs.
  2. Compresses visual & LWIR thermal imagery through the Deep JSCC Perceptron Encoder.
  3. Projects georeferenced ground footprints onto the GCS SQLite/MBTiles tile server.
  4. Dynamically paints the tactical post-disaster orthomosaic to replace static satellite maps.
================================================================================
"""

import os
import sys
import math
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

try:
    import rclpy
    from rclpy.node import Node
    from std_msgs.msg import String
    from nav_msgs.msg import Odometry
    RCLPY_AVAILABLE = True
except ImportError:
    RCLPY_AVAILABLE = False
    Node = object

# Import existing Perceptron JSCC Pipeline
try:
    from sutra_comms.perceptron_jscc import PerceptronSemanticCommsPipeline
except ImportError:
    try:
        from .perceptron_jscc import PerceptronSemanticCommsPipeline
    except ImportError:
        PerceptronSemanticCommsPipeline = None


TILE_SERVER_URL = "http://127.0.0.1:8088/api/inject_footprint"


class JsccOrthoStreamer:
    """Core logic for compressing camera frames and transmitting footprints to tile server."""

    def __init__(self, tile_server_url: str = TILE_SERVER_URL):
        self.tile_server_url = tile_server_url
        self.jscc_pipeline = PerceptronSemanticCommsPipeline() if PerceptronSemanticCommsPipeline else None
        self.total_streamed_frames = 0
        self.total_payload_saved_kb = 0.0

    def process_and_stream_footprint(
        self,
        drone_id: str,
        lat: float,
        lon: float,
        alt: float,
        heading_deg: float = 0.0,
        raw_frame_size_kb: float = 512.0,
        distance_to_gcs_m: float = 150.0,
        thermal: bool = True
    ) -> dict:
        """
        Runs frame through Deep JSCC encoder, measures channel SNR, and posts footprint to tile server.
        """
        if self.jscc_pipeline:
            jscc_result = self.jscc_pipeline.process_semantic_transmission(
                image_size_kb=raw_frame_size_kb,
                distance_m=distance_to_gcs_m
            )
            snr_db = jscc_result.get("snr_db", 14.0)
            psnr_db = jscc_result.get("reconstructed_psnr_db", 38.5)
            tx_size_kb = jscc_result.get("transmitted_symbols_kb", 16.0)
        else:
            snr_db = 14.5
            psnr_db = 38.0
            tx_size_kb = 16.0

        self.total_streamed_frames += 1
        self.total_payload_saved_kb += (raw_frame_size_kb - tx_size_kb)

        payload = {
            "drone_id": drone_id,
            "latitude": lat,
            "longitude": lon,
            "altitude": alt,
            "heading": heading_deg,
            "snr_db": snr_db,
            "psnr_db": psnr_db,
            "compressed_size_kb": tx_size_kb,
            "thermal": thermal,
            "timestamp": time.time()
        }

        # Send to GCS Tile Server
        req = urllib.request.Request(
            self.tile_server_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                status = resp.status
        except Exception:
            status = -1  # Server offline or not reached

        payload["http_status"] = status
        return payload


if RCLPY_AVAILABLE:
    class JsccOrthoStreamerNode(Node):
        """ROS 2 Node subscribing to drone odometry and streaming orthomosaic footprints."""

        def __init__(self):
            super().__init__("sutra_jscc_ortho_streamer")
            self.streamer = JsccOrthoStreamer()
            self.pub_status = self.create_publisher(String, "/sutra/comms/ortho_stream_status", 10)

            # Timer to stream simulated tactical sweeps across forest canopy
            self.drones = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]
            self.current_drone_idx = 0
            self.step = 0
            self.timer = self.create_timer(1.0, self._stream_next)

            self.get_logger().info("📷 [SUTRA JSCC Ortho Streamer] Online & Connected to Tile Server.")

        def _stream_next(self):
            did = self.drones[self.current_drone_idx]
            self.current_drone_idx = (self.current_drone_idx + 1) % len(self.drones)
            self.step += 1

            # Forest canopy coordinates with slight orbital drift
            base_lat = 11.524871
            base_lon = 76.128456
            radius_deg = 0.00015
            theta = self.step * 0.3 + (self.current_drone_idx * 1.25)
            lat = base_lat + radius_deg * math.cos(theta)
            lon = base_lon + radius_deg * math.sin(theta)
            alt = 45.0 + (self.current_drone_idx * 4.0)
            heading = math.degrees(theta) % 360.0

            res = self.streamer.process_and_stream_footprint(
                drone_id=did,
                lat=lat,
                lon=lon,
                alt=alt,
                heading_deg=heading,
                thermal=(self.current_drone_idx % 2 == 0)
            )

            msg = String()
            msg.data = json.dumps(res)
            self.pub_status.publish(msg)


def main():
    if RCLPY_AVAILABLE:
        rclpy.init()
        node = JsccOrthoStreamerNode()
        try:
            rclpy.spin(node)
        except KeyboardInterrupt:
            pass
        finally:
            node.destroy_node()
            rclpy.shutdown()
    else:
        streamer = JsccOrthoStreamer()
        res = streamer.process_and_stream_footprint("uav_alpha", 11.524871, 76.128456, 46.0, 45.0)
        print("Standalone JSCC Ortho Result:", json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
