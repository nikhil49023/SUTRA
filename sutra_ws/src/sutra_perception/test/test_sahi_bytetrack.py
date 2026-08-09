#!/usr/bin/env python3
"""
Unit Tests for SAHI Slicing & ByteTRACK MOT Modules — Subsystem C (AI Perception)
"""

import numpy as np
import pytest
from sutra_perception.sahi_inference import slice_image, merge_sahi_detections
from sutra_perception.bytetrack_tracker import SUTRAByteTracker, compute_iou

def test_sahi_slice_image_shape():
    img = np.zeros((1080, 1920, 3), dtype=np.uint8)
    slices = slice_image(img, slice_height=416, slice_width=416, overlap_ratio=0.2)
    assert len(slices) > 0
    crop, x, y = slices[0]
    assert crop.shape[0] == 416
    assert crop.shape[1] == 416

def test_bytetrack_id_persistence():
    tracker = SUTRAByteTracker(high_thresh=0.5, low_thresh=0.1)
    
    # Frame 1: High confidence detection
    dets_f1 = [([100.0, 100.0, 150.0, 150.0], 0.9, 0)]
    tracks1 = tracker.update(dets_f1)
    assert len(tracks1) == 1
    t1_id = tracks1[0].track_id

    # Frame 2: Slight movement, lower confidence (low_thresh occlusion)
    dets_f2 = [([105.0, 105.0, 155.0, 155.0], 0.3, 0)]
    tracks2 = tracker.update(dets_f2)
    assert len(tracks2) == 1
    assert tracks2[0].track_id == t1_id  # Track ID MUST be preserved!

def test_compute_iou():
    box1 = [0.0, 0.0, 10.0, 10.0]
    box2 = [0.0, 0.0, 10.0, 10.0]
    assert abs(compute_iou(box1, box2) - 1.0) < 1e-4
