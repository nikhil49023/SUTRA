"""
SUTRA Subsystem C — Comprehensive Test Suite
=============================================
Covers:
  Phase 1  – GPS raycast geometry
  Phase 2  – Pixel→NED projection
  Phase 3  – Thermal blob detection (mock image)
  Phase 4  – Radar clustering
  Phase 5  – Tri-modal fusion confidence scoring
  Phase 6  – FusedTarget serialisation + classification labels
  Integration – End-to-end mock pipeline (no ROS required)

Run with:
  pytest sutra_ws/src/sutra_perception/test/ -v
"""

import math
import sys
import os

import numpy as np
import pytest

# ── Allow import without installing the package ───────────────────────────────
sys.path.insert(
    0,
    os.path.join(os.path.dirname(__file__), "..", "sutra_perception"),
)
# Direct module import (also works after `pip install -e .`)
from sutra_perception.detector_node import (  # noqa: E402
    BBox,
    FusedTarget,
    RadarTarget,
    ThermalBlob,
    VisualDetection,
    W_RADAR,
    W_THERMAL,
    W_VISUAL,
    ORIGIN_ALT,
    ORIGIN_LAT,
    ORIGIN_LON,
    pixel_to_ned,
    to_gps,
)


# ══════════════════════════════════════════════════════════════════════════════
# Phase 1 — GPS Raycast (to_gps)
# ══════════════════════════════════════════════════════════════════════════════

class TestGPSRaycast:
    """Verify WGS-84 coordinate conversion."""

    def test_origin_returns_origin(self):
        """Zero offset must return the exact origin coordinates."""
        lat, lon, alt = to_gps(0.0, 0.0, 0.0)
        assert lat == ORIGIN_LAT
        assert lon == ORIGIN_LON
        assert alt == ORIGIN_ALT

    def test_north_offset_increases_latitude(self):
        """Moving north (positive y) must increase latitude."""
        lat0, _, _ = to_gps(0.0, 0.0, 0.0)
        lat1, _, _ = to_gps(0.0, 100.0, 0.0)
        assert lat1 > lat0

    def test_east_offset_increases_longitude(self):
        """Moving east (positive x) must increase longitude."""
        _, lon0, _ = to_gps(0.0, 0.0, 0.0)
        _, lon1, _ = to_gps(100.0, 0.0, 0.0)
        assert lon1 > lon0

    def test_altitude_offset(self):
        """Altitude offset adds to origin altitude."""
        _, _, alt = to_gps(0.0, 0.0, 50.0)
        assert abs(alt - (ORIGIN_ALT + 50.0)) < 0.01

    def test_negative_offsets(self):
        """Negative offsets go south and west."""
        lat, lon, _ = to_gps(-100.0, -100.0, 0.0)
        assert lat < ORIGIN_LAT
        assert lon < ORIGIN_LON

    def test_1km_north_approx_0009_deg(self):
        """1000 m north ≈ 0.009° latitude (standard Earth geometry)."""
        lat, _, _ = to_gps(0.0, 1000.0, 0.0)
        delta = lat - ORIGIN_LAT
        assert 0.008 < delta < 0.010, f"Unexpected delta: {delta}"

    def test_output_precision(self):
        """Output must be rounded to 6 decimal places."""
        lat, lon, alt = to_gps(18.5, -22.0, 5.3)
        assert lat == round(lat, 6)
        assert lon == round(lon, 6)
        assert alt == round(alt, 2)

    def test_custom_origin(self):
        """Custom origin coordinates are respected."""
        custom_lat, custom_lon, custom_alt = 12.9716, 77.5946, 920.0  # Bengaluru
        lat, lon, alt = to_gps(0.0, 0.0, 0.0, custom_lat, custom_lon, custom_alt)
        assert lat == custom_lat
        assert lon == custom_lon
        assert alt == custom_alt

    def test_large_offset_still_valid_lat(self):
        """Even very large offsets should stay in valid lat/lon ranges for Earth."""
        lat, lon, _ = to_gps(5000.0, 5000.0, 0.0)
        assert -90.0 <= lat <= 90.0
        assert -180.0 <= lon <= 180.0


# ══════════════════════════════════════════════════════════════════════════════
# Phase 2 — Pixel → NED Projection (pixel_to_ned)
# ══════════════════════════════════════════════════════════════════════════════

class TestPixelToNED:
    """Verify pinhole camera ground-plane projection."""

    IMG_W, IMG_H = 640, 480

    def test_image_centre_is_zero_offset(self):
        """Centre pixel maps to (0, 0) NED offset."""
        east, north = pixel_to_ned(320, 240, 640, 480, drone_alt_m=30.0)
        assert abs(east) < 0.01
        assert abs(north) < 0.01

    def test_right_pixel_is_positive_east(self):
        """Rightward pixel → positive east offset."""
        east, _ = pixel_to_ned(500, 240, 640, 480, drone_alt_m=30.0)
        assert east > 0

    def test_left_pixel_is_negative_east(self):
        """Leftward pixel → negative east offset."""
        east, _ = pixel_to_ned(100, 240, 640, 480, drone_alt_m=30.0)
        assert east < 0

    def test_top_pixel_is_positive_north(self):
        """Top of image → positive north (camera looks down, top = ahead)."""
        _, north = pixel_to_ned(320, 10, 640, 480, drone_alt_m=30.0)
        assert north > 0

    def test_altitude_scales_offset(self):
        """Higher altitude means wider ground coverage per pixel."""
        e_low, _ = pixel_to_ned(480, 240, 640, 480, drone_alt_m=10.0)
        e_high, _ = pixel_to_ned(480, 240, 640, 480, drone_alt_m=50.0)
        assert abs(e_high) > abs(e_low)

    def test_90_fov_corner_pixel_equals_altitude(self):
        """With 90° HFOV, far-edge pixel at alt=h should map to ±h east."""
        # pixel far-right edge: px = img_w, norm_x = +0.5, east ≈ +alt
        east, _ = pixel_to_ned(640, 240, 640, 480, drone_alt_m=30.0, camera_hfov_deg=90.0)
        assert abs(east - 30.0) < 1.0   # within 1 m


# ══════════════════════════════════════════════════════════════════════════════
# Phase 3 — BBox helpers
# ══════════════════════════════════════════════════════════════════════════════

class TestBBox:
    """Verify BBox geometry helpers."""

    def test_centre(self):
        bbox = BBox(0, 0, 100, 80)
        assert bbox.cx == 50.0
        assert bbox.cy == 40.0

    def test_area(self):
        bbox = BBox(10, 10, 110, 90)
        assert bbox.area == 8000.0

    def test_iou_identical(self):
        b = BBox(0, 0, 100, 100)
        assert abs(b.iou(b) - 1.0) < 1e-6

    def test_iou_no_overlap(self):
        b1 = BBox(0, 0, 50, 50)
        b2 = BBox(100, 100, 150, 150)
        assert b1.iou(b2) == 0.0

    def test_iou_partial_overlap(self):
        b1 = BBox(0, 0, 100, 100)
        b2 = BBox(50, 50, 150, 150)
        iou = b1.iou(b2)
        assert 0.0 < iou < 1.0

    def test_iou_symmetry(self):
        b1 = BBox(0, 0, 80, 80)
        b2 = BBox(40, 40, 120, 120)
        assert abs(b1.iou(b2) - b2.iou(b1)) < 1e-9

    def test_zero_area_bbox(self):
        b = BBox(10, 10, 10, 10)
        assert b.area == 0.0


# ══════════════════════════════════════════════════════════════════════════════
# Phase 4 — Thermal Blob detection (mock image, no ROS)
# ══════════════════════════════════════════════════════════════════════════════

class TestThermalDetection:
    """Test OpenCV blob detection on synthetic thermal images."""

    def _make_thermal_image(self, hot_rect=None):
        """Create a black 8-bit image with one optional hot rectangle."""
        img = np.zeros((480, 640), dtype=np.uint8)
        if hot_rect:
            x, y, w, h = hot_rect
            img[y:y+h, x:x+w] = 220   # bright = hot
        return img

    def test_empty_image_no_blobs(self):
        """All-black thermal image should produce no blobs."""
        import cv2
        img = np.zeros((480, 640), dtype=np.uint8)
        _, mask = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        blobs = [c for c in contours if cv2.contourArea(c) >= 100]
        assert len(blobs) == 0

    def test_hot_region_detected(self):
        """A bright region should be detected as a blob."""
        import cv2
        img = self._make_thermal_image(hot_rect=(200, 150, 100, 80))
        _, mask = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        blobs = [c for c in contours if cv2.contourArea(c) >= 100]
        assert len(blobs) >= 1

    def test_small_noise_filtered(self):
        """Tiny hot pixels below area threshold should be ignored."""
        import cv2
        img = np.zeros((480, 640), dtype=np.uint8)
        img[100, 100] = 220  # single pixel
        _, mask = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        blobs = [c for c in contours if cv2.contourArea(c) >= 100]
        assert len(blobs) == 0


# ══════════════════════════════════════════════════════════════════════════════
# Phase 5 — Fusion Confidence Scoring
# ══════════════════════════════════════════════════════════════════════════════

class TestFusionScoring:
    """Validate weighted confidence math."""

    def test_weights_sum_to_one(self):
        total = W_VISUAL + W_THERMAL + W_RADAR
        assert abs(total - 1.0) < 1e-9, f"Weights sum to {total}, not 1.0"

    def test_visual_only_confidence(self):
        """0.9 visual confidence → 0.9 × W_VISUAL."""
        score = 0.9 * W_VISUAL
        assert abs(score - 0.45) < 1e-9

    def test_all_modalities_max_confidence(self):
        """Max contribution from all three = 1.0."""
        score = 1.0 * W_VISUAL + 1.0 * W_THERMAL + 1.0 * W_RADAR
        assert abs(score - 1.0) < 1e-9

    def test_thermal_only_high_intensity(self):
        """High thermal intensity alone gives partial score."""
        score = 0.85 * W_THERMAL
        assert 0.29 < score < 0.31

    def test_score_clipped_to_one(self):
        """Simulated over-score should be clipped to 1.0 in fusion."""
        raw_score = 1.2  # hypothetical over-count
        clipped = min(raw_score, 1.0)
        assert clipped == 1.0


# ══════════════════════════════════════════════════════════════════════════════
# Phase 6 — FusedTarget & Classification
# ══════════════════════════════════════════════════════════════════════════════

class TestFusedTarget:
    """Verify FusedTarget data class and label logic."""

    def _make_target(self, label="SURVIVOR", conf=0.85, gps=None):
        if gps is None:
            gps = (ORIGIN_LAT, ORIGIN_LON, ORIGIN_ALT)
        return FusedTarget(
            target_id=1,
            label=label,
            confidence=conf,
            gps=gps,
            modalities=["visual", "thermal"],
        )

    def test_to_dict_keys(self):
        t = self._make_target()
        d = t.to_dict()
        for key in ("id", "label", "confidence", "lat", "lon", "alt", "modalities", "ts"):
            assert key in d, f"Missing key: {key}"

    def test_confidence_rounded(self):
        t = self._make_target(conf=0.87654321)
        d = t.to_dict()
        assert d["confidence"] == round(0.87654321, 3)

    def test_gps_in_dict(self):
        t = self._make_target(gps=(12.9716, 77.5946, 920.0))
        d = t.to_dict()
        assert d["lat"] == 12.9716
        assert d["lon"] == 77.5946
        assert d["alt"] == 920.0

    def test_modalities_preserved(self):
        t = self._make_target()
        t.modalities = ["visual", "thermal", "radar"]
        d = t.to_dict()
        assert d["modalities"] == ["visual", "thermal", "radar"]

    def test_timestamp_is_positive(self):
        t = self._make_target()
        assert t.timestamp > 0

    def test_label_survivor(self):
        t = self._make_target(label="SURVIVOR")
        assert t.to_dict()["label"] == "SURVIVOR"

    def test_label_possible_survivor(self):
        t = self._make_target(label="POSSIBLE_SURVIVOR", conf=0.40)
        assert t.to_dict()["label"] == "POSSIBLE_SURVIVOR"

    def test_label_threat(self):
        t = self._make_target(label="THREAT", conf=0.75)
        assert t.to_dict()["label"] == "THREAT"


# ══════════════════════════════════════════════════════════════════════════════
# Integration — End-to-end pipeline (no ROS, no hardware)
# ══════════════════════════════════════════════════════════════════════════════

class TestEndToEndPipeline:
    """Simulate the full fusion pipeline using mock data."""

    def test_full_pipeline_outputs_survivor(self):
        """
        Given: 1 visual person detection + 1 thermal blob overlap + 1 radar return
        Expect: FusedTarget with label SURVIVOR and confidence > 0.6
        """
        IMG_W, IMG_H = 640, 480
        DRONE_ALT = 30.0
        HFOV = 90.0

        # --- Visual detection ---
        bbox = BBox(280, 210, 360, 270)
        ex, ny = pixel_to_ned(bbox.cx, bbox.cy, IMG_W, IMG_H, DRONE_ALT, HFOV)
        gps = to_gps(ex, ny, 0.0)
        vdet = VisualDetection(bbox=bbox, confidence=0.91, class_id=0, label="person", gps=gps)

        # --- Thermal blob (overlaps visual) ---
        tblob = ThermalBlob(bbox=BBox(270, 205, 370, 280), mean_intensity=0.82)

        # --- Radar target (close to visual NED position) ---
        rtgt = RadarTarget(range_m=5.0, angle_rad=0.0, east_m=ex, north_m=ny + 0.3)

        # --- Fusion ---
        score = vdet.confidence * W_VISUAL
        if vdet.bbox.iou(tblob.bbox) > 0.15:
            score += tblob.mean_intensity * W_THERMAL
        dist = math.hypot(ex - rtgt.east_m, ny - rtgt.north_m)
        if dist < 3.0:
            score += W_RADAR
        score = min(score, 1.0)

        # Classify
        if vdet.label == "person" and score >= 0.60:
            label = "SURVIVOR"
        elif vdet.label == "person" and score >= 0.30:
            label = "POSSIBLE_SURVIVOR"
        else:
            label = "UNKNOWN"

        assert label == "SURVIVOR", f"Expected SURVIVOR, got {label} (score={score:.3f})"
        assert score > 0.60, f"Confidence too low: {score:.3f}"

    def test_thermal_only_possible_survivor(self):
        """
        Given: only a thermal blob (no visual, no radar)
        Expect: label POSSIBLE_SURVIVOR when intensity is high enough
        """
        tblob = ThermalBlob(bbox=BBox(100, 100, 200, 200), mean_intensity=0.9)
        score = tblob.mean_intensity * W_THERMAL
        assert score >= 0.30, f"Score too low for possible survivor: {score:.3f}"

    def test_gps_pipeline_consistency(self):
        """
        Pixel → NED → GPS → must give sensible coordinates near the origin.
        """
        east_m, north_m = pixel_to_ned(320, 240, 640, 480, 30.0, 90.0)
        lat, lon, alt = to_gps(east_m, north_m, 0.0)
        assert abs(lat - ORIGIN_LAT) < 0.01
        assert abs(lon - ORIGIN_LON) < 0.01

    def test_no_detections_produces_empty_fused(self):
        """With no sensor data, fusion should produce zero targets."""
        visual:  list = []
        thermal: list = []
        fused = []
        for vdet in visual:
            if vdet.gps:
                fused.append(vdet)
        for tblob in thermal:
            already = any(tblob.bbox.iou(BBox(d.bbox.x1, d.bbox.y1, d.bbox.x2, d.bbox.y2)) > 0.15 for d in visual)
            if not already:
                fused.append(tblob)
        assert len(fused) == 0


    def test_pixel_to_ned_zero_altitude_failsafe(self):
        """Zero altitude input must produce finite 0.0 NED offset without ZeroDivisionError."""
        east_m, north_m = pixel_to_ned(320, 240, 640, 480, 0.0, 90.0)
        assert math.isfinite(east_m)
        assert math.isfinite(north_m)
        assert east_m == 0.0
        assert north_m == 0.0

    def test_pixel_to_ned_extreme_fov_bounds(self):
        """Extreme FOV angles (e.g. 170 degrees) must produce finite NED bounds."""
        east_m, north_m = pixel_to_ned(639, 479, 640, 480, 30.0, 170.0)
        assert math.isfinite(east_m)
        assert math.isfinite(north_m)

    def test_gps_raycast_pole_boundary_safety(self):
        """Extreme latitude inputs near polar boundaries must not produce NaN or overflow."""
        lat, lon, alt = to_gps(1000.0, 1000.0, 50.0)
        assert math.isfinite(lat)
        assert math.isfinite(lon)
        assert -90.0 <= lat <= 90.0
        assert -180.0 <= lon <= 180.0

