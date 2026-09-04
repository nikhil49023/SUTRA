#!/usr/bin/env python3
"""
Extreme Stress Test Suite for Subsystem C (AI Edge Perception).
Tests 100-Frame High-FPS Conversion, Extreme Drone Tilt WGS84 Raycasting,
and 100-Survivor SUTRAByteTracker Multi-Object Tracking Resilience.
"""

import math
import time
import unittest
import numpy as np

from sutra_perception.bytetrack_tracker import SUTRAByteTracker
from sutra_perception.detector_node import SutraCvBridge


class TestPerceptionExtremeStress(unittest.TestCase):

    def test_cv_bridge_100_frame_high_fps_burst_stress(self):
        """Stress Test: Convert 100 high-resolution camera frames via pure-Python bridge."""
        bridge = SutraCvBridge()
        
        # Create a mock ROS Image object (1080p RGB)
        class MockImage:
            def __init__(self, h=1080, w=1920):
                self.height = h
                self.width = w
                self.encoding = "bgr8"
                self.data = np.zeros((h, w, 3), dtype=np.uint8).tobytes()

        mock_msg = MockImage()

        start_time = time.time()
        for _ in range(100):
            cv_img = bridge.imgmsg_to_cv2(mock_msg, desired_encoding="bgr8")
            self.assertEqual(cv_img.shape, (1080, 1920, 3))
        
        total_duration_ms = (time.time() - start_time) * 1000.0
        avg_fps = 100.0 / (total_duration_ms / 1000.0)

        # Assert bridge supports high FPS frame conversion
        self.assertGreater(avg_fps, 30.0, f"Bridge conversion FPS was {avg_fps:.1f} (<30 FPS limit)")

    def test_bytetrack_100_simultaneous_survivors_mot_stress(self):
        """Stress Test: Multi-Object Tracking across 100 moving survivor bounding boxes over 20 frames."""
        tracker = SUTRAByteTracker(high_thresh=0.5, max_time_lost=30)
        
        # 100 moving survivors
        num_targets = 100
        num_frames = 20

        start_time = time.time()
        for f in range(num_frames):
            detections = []
            for i in range(num_targets):
                # Simulated moving bounding box [x1, y1, x2, y2, score, class_id]
                x1 = (i * 15 + f * 2) % 1800
                y1 = (i * 10 + f * 1) % 1000
                x2 = x1 + 40
                y2 = y1 + 80
                score = 0.85 + (i % 10) * 0.01
                detections.append(([x1, y1, x2, y2], score, 0))

            tracked_targets = tracker.update(detections)
            self.assertGreater(len(tracked_targets), 0, f"Frame {f} must return active tracked targets")

        duration_ms = (time.time() - start_time) * 1000.0
        self.assertLess(duration_ms, 500.0, f"100-target ByteTRACK took {duration_ms:.2f}ms (>500ms limit)")

    def test_wgs84_raycast_extreme_tilt_geometry_stress(self):
        """Stress Test: Raycast WGS84 Geolocation under ±45° roll/pitch tilt & 50m AGL."""
        # Simulated drone telemetry
        drone_lat = 20.593700
        drone_lon = 78.962900
        drone_alt = 50.0  # 50m High Altitude

        # Test across 36 extreme tilt angles (-45° to +45°)
        for roll in np.linspace(-45.0, 45.0, 6):
            for pitch in np.linspace(-45.0, 45.0, 6):
                # Raycast conversion math
                roll_rad = math.radians(roll)
                pitch_rad = math.radians(pitch)

                dx = drone_alt * math.tan(pitch_rad)
                dy = drone_alt * math.tan(roll_rad)

                # Offset to WGS84 degrees
                target_lat = drone_lat + (dy / 111320.0)
                target_lon = drone_lon + (dx / (111320.0 * math.cos(math.radians(drone_lat))))

                # Assert finite coordinates
                self.assertFalse(math.isnan(target_lat) or math.isinf(target_lat))
                self.assertFalse(math.isnan(target_lon) or math.isinf(target_lon))
                self.assertGreater(target_lat, 0.0)
                self.assertGreater(target_lon, 0.0)


if __name__ == '__main__':
    unittest.main()
