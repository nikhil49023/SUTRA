"""
Smart Horizon GCS Test Suite — Subsystem C AI Perception Stream & Victim Detection Tests
Verifies:
1. PerceptionStreamService lifecycle and world/UAV active feed synchronization.
2. RGB and Thermal disaster scene generation with realistic survivor signatures.
3. Optical SAR survivor and victim bounding box extraction.
4. Raycast 2D pixel to NED and WGS84 GPS coordinate transformation.
5. Ingestion of detections into StateStore with valid bbox and norm_bbox.
6. Target persistence and tracking state progression without duplicate ID churn.
"""

import time
import numpy as np
import pytest

from ai.perception_stream_service import (
    PerceptionStreamService,
    get_perception_stream_service,
    pixel_to_ned,
    to_gps,
    SAR_CLASS_MAPPING,
)
from state.application_state import get_state_store


@pytest.fixture
def stream_service():
    service = PerceptionStreamService()
    service.set_active_feed("WORLD_1", "alpha", "RGB")
    yield service
    service.stop()


def test_service_initialization_and_switching(stream_service):
    """Verifies service initializes with valid default parameters and tracks feed switches."""
    assert stream_service.active_world_id == "WORLD_1"
    assert stream_service.active_drone_id == "alpha"
    assert stream_service.active_modality == "RGB"

    # Switch to WORLD 2 and UAV 3
    stream_service.set_active_feed("WORLD_2", "uav_3", "THERMAL")
    assert stream_service.active_world_id == "WORLD_2"
    assert stream_service.active_drone_id == "charlie"
    assert stream_service.active_modality == "THERMAL"


def test_pixel_to_ned_and_gps_raycasting():
    """Verifies raycasting formula translates pixel offsets to realistic ground coordinates."""
    # Optical centre of a 640x480 frame pointing nadir at 20m altitude
    east, north = pixel_to_ned(
        px=320, py=240, img_w=640, img_h=480, drone_alt_m=20.0, camera_hfov_deg=90.0
    )
    assert abs(east) < 0.1
    assert abs(north) < 0.1

    # Off-centre pixel (right of center)
    east_r, north_r = pixel_to_ned(
        px=480, py=240, img_w=640, img_h=480, drone_alt_m=20.0, camera_hfov_deg=90.0
    )
    assert east_r > 5.0  # Should be east of center

    # Test GPS conversion
    lat, lon, alt = to_gps(east_r, north_r, 0.0, origin_lat=12.934444, origin_lon=77.691722)
    assert 12.0 < lat < 13.5
    assert 77.0 < lon < 78.5


def test_sar_scene_generation_and_victim_detection(stream_service):
    """Verifies scene generator produces frames with detectable victims."""
    # 1. RGB Scene Test
    rgb_frame = stream_service._generate_synthetic_sar_scene("alpha", "RGB")
    assert isinstance(rgb_frame, np.ndarray)
    assert rgb_frame.shape == (480, 640, 3)

    rgb_dets = stream_service._detect_highvis_sar_targets(rgb_frame, "RGB")
    assert len(rgb_dets) >= 1
    assert all("bbox" in d and len(d["bbox"]) == 4 for d in rgb_dets)
    assert any(d["label"] == "SURVIVOR" for d in rgb_dets)

    # 2. Thermal Scene Test
    thermal_frame = stream_service._generate_synthetic_sar_scene("alpha", "THERMAL")
    assert isinstance(thermal_frame, np.ndarray)
    assert thermal_frame.shape == (480, 640, 3)

    thermal_dets = stream_service._detect_highvis_sar_targets(thermal_frame, "THERMAL")
    assert len(thermal_dets) >= 1
    assert any(d["label"] == "SURVIVOR" for d in thermal_dets)


def test_single_frame_end_to_end_processing(stream_service):
    """Verifies end-to-end processing creates tracked targets with bboxes in StateStore."""
    frame = stream_service._generate_synthetic_sar_scene("alpha", "RGB")
    results = stream_service._process_single_frame(frame, "WORLD_1", "alpha", "RGB")

    assert len(results) >= 1
    first_target = results[0]
    assert "target_id" in first_target or "id" in first_target
    assert "lat" in first_target and "lon" in first_target
    assert "bbox" in first_target and len(first_target["bbox"]) == 4

    # Verify StateStore was updated
    state = get_state_store().get_state()
    assert len(state.ai_state.tracked_targets) >= 1
    stored = next((t for t in state.ai_state.tracked_targets if str(t.target_id) == str(first_target["target_id"])), None)
    assert stored is not None
    assert stored.bbox is not None
    assert stored.norm_bbox is not None
    assert len(stored.norm_bbox) == 4
    # Bounding box should be normalized between 0.0 and 1.0
    assert 0.0 <= stored.norm_bbox[0] <= 1.0
    assert 0.0 <= stored.norm_bbox[1] <= 1.0


def test_target_tracking_across_sequential_frames(stream_service):
    """Verifies tracker preserves track IDs across frames without generating spurious duplicate IDs."""
    frame1 = stream_service._generate_synthetic_sar_scene("alpha", "RGB")
    res1 = stream_service._process_single_frame(frame1, "WORLD_1", "alpha", "RGB")
    ids1 = {t["target_id"] for t in res1}

    # Second frame shortly after
    time.sleep(0.05)
    frame2 = stream_service._generate_synthetic_sar_scene("alpha", "RGB")
    res2 = stream_service._process_single_frame(frame2, "WORLD_1", "alpha", "RGB")
    ids2 = {t["target_id"] for t in res2}

    # At least one track ID should persist across consecutive frames
    overlap = ids1.intersection(ids2)
    assert len(overlap) >= 1
