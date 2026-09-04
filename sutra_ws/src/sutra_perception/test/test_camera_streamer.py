#!/usr/bin/env python3
"""
Unit & Integration Test Suite for SUTRA Physical Payload Camera Streamer
========================================================================
Validates hardware capture wrappers, GStreamer/V4L2 fallback paths,
NumPy-to-Image serialization, CameraInfo intrinsics, and diagnostics.
"""

import json
import time
import numpy as np
import pytest

rclpy = pytest.importorskip("rclpy")
from sensor_msgs.msg import Image, CameraInfo
from std_msgs.msg import String

from sutra_perception.camera_streamer_node import (
    PhysicalCameraCapture,
    PhysicalCameraStreamerNode,
    cv2_to_imgmsg,
)


@pytest.fixture(scope="module")
def rclpy_init():
    if not rclpy.ok():
        rclpy.init()
    yield
    if rclpy.ok():
        rclpy.shutdown()


# ──────────────────────────────────────────────────────────────────────────────
# 1. Pure-Python Image Conversion Tests
# ──────────────────────────────────────────────────────────────────────────────
class TestCv2ToImgmsg:
    def test_bgr8_image_conversion(self):
        cv_img = np.zeros((480, 640, 3), dtype=np.uint8)
        cv_img[10:50, 10:50] = (0, 255, 0)
        msg = cv2_to_imgmsg(cv_img, encoding="bgr8", frame_id="test_cam")

        assert isinstance(msg, Image)
        assert msg.height == 480
        assert msg.width == 640
        assert msg.encoding == "bgr8"
        assert msg.step == 640 * 3
        assert msg.header.frame_id == "test_cam"
        assert len(msg.data) == 480 * 640 * 3

    def test_mono8_thermal_conversion(self):
        thermal_img = np.full((120, 160), 45, dtype=np.uint8)
        msg = cv2_to_imgmsg(thermal_img, encoding="mono8", frame_id="thermal_cam")

        assert msg.height == 120
        assert msg.width == 160
        assert msg.encoding == "mono8"
        assert msg.step == 160
        assert len(msg.data) == 120 * 160

    def test_mono16_thermal_conversion(self):
        thermal_16 = np.full((120, 160), 30000, dtype=np.uint16)
        msg = cv2_to_imgmsg(thermal_16, encoding="mono16", frame_id="thermal_cam")

        assert msg.height == 120
        assert msg.width == 160
        assert msg.encoding == "mono16"
        assert msg.step == 160 * 2
        assert len(msg.data) == 120 * 160 * 2


# ──────────────────────────────────────────────────────────────────────────────
# 2. Hardware / Synthetic Capture Engine Tests
# ──────────────────────────────────────────────────────────────────────────────
class TestPhysicalCameraCapture:
    def test_synthetic_visual_capture(self):
        cap = PhysicalCameraCapture(
            source_type="synthetic_test",
            target_width=640,
            target_height=480,
            target_fps=30,
            is_thermal=False,
        )
        assert cap.is_connected is True
        ret, frame = cap.read_frame()
        assert ret is True
        assert frame is not None
        assert frame.shape == (480, 640, 3)
        assert frame.dtype == np.uint8
        assert cap.frame_count == 1
        cap.release()

    def test_synthetic_thermal_capture(self):
        cap = PhysicalCameraCapture(
            source_type="synthetic_test",
            target_width=320,
            target_height=240,
            target_fps=15,
            is_thermal=True,
        )
        assert cap.is_connected is True
        ret, frame = cap.read_frame()
        assert ret is True
        assert frame is not None
        assert frame.shape == (240, 320)
        assert frame.dtype == np.uint8
        assert cap.frame_count == 1
        cap.release()

    def test_v4l2_fallback_when_unplugged(self):
        # Non-existent device should gracefully fall back to synthetic output
        cap = PhysicalCameraCapture(
            source_type="v4l2",
            source_path="/dev/video9999",
            target_width=640,
            target_height=480,
            target_fps=30,
            is_thermal=False,
        )
        ret, frame = cap.read_frame()
        assert ret is True
        assert frame is not None
        assert frame.shape == (480, 640, 3)
        cap.release()


# ──────────────────────────────────────────────────────────────────────────────
# 3. Node Integration, Intrinsics & Diagnostics Tests
# ──────────────────────────────────────────────────────────────────────────────
class TestPhysicalCameraStreamerNode:
    def test_node_initialization_and_camera_info(self, rclpy_init):
        node = PhysicalCameraStreamerNode()
        assert node.drone_id == "uav_alpha"
        assert node.width == 640
        assert node.height == 480
        assert node.fps == 30

        # Verify CameraInfo intrinsics
        info = node.camera_info_msg
        assert isinstance(info, CameraInfo)
        assert info.width == 640
        assert info.height == 480
        assert len(info.k) == 9
        assert len(info.p) == 12

        # Check focal length math for 90 deg HFOV
        expected_fx = (640 / 2.0) / np.tan(np.radians(90.0) / 2.0)
        assert pytest.approx(info.k[0], rel=1e-3) == expected_fx
        assert pytest.approx(info.k[4], rel=1e-3) == expected_fx
        assert info.k[2] == 320.0
        assert info.k[5] == 240.0

        node.destroy_node()

    def test_node_stream_and_diagnostics_dispatch(self, rclpy_init):
        node = PhysicalCameraStreamerNode()

        # Capture diagnostic output
        received_diag = []
        def diag_cb(msg):
            received_diag.append(json.loads(msg.data))

        sub_diag = node.create_subscription(
            String, "/sutra/camera/diagnostics", diag_cb, 10
        )

        # Trigger stream & diagnostic callbacks directly
        node._stream_callback()
        node._publish_diagnostics()

        assert node.visual_capture.frame_count >= 1
        if node.enable_thermal and node.thermal_capture:
            assert node.thermal_capture.frame_count >= 1

        node.destroy_subscription(sub_diag)
        node.destroy_node()
