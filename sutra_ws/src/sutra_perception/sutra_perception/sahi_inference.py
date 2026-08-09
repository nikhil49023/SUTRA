#!/usr/bin/env python3
"""
SUTRA Subsystem C: SAHI (Slicing Aided Hyper Inference) Module
==============================================================
Provides high-resolution image slicing and Non-Maximum Merging (NMM)
for ultra-high precision small-target aerial human detection.

Used in Tier-2 GCS analysis & high-resolution snapshot verification.
"""

import math
from typing import List, Tuple
import numpy as np
from sutra_perception.detector_node import BBox, VisualDetection

def slice_image(
    image: np.ndarray,
    slice_height: int = 320,
    slice_width: int = 320,
    overlap_ratio: float = 0.20
) -> List[Tuple[np.ndarray, int, int]]:
    """Slices a high-resolution image into overlapping tiles with pixel offsets.
    
    Returns:
      List of (slice_crop, x_offset, y_offset)
    """
    img_h, img_w = image.shape[:2]
    slices = []
    
    step_x = int(slice_width * (1.0 - overlap_ratio))
    step_y = int(slice_height * (1.0 - overlap_ratio))
    
    y = 0
    while y < img_h:
        x = 0
        while x < img_w:
            x_end = min(x + slice_width, img_w)
            y_end = min(y + slice_height, img_h)
            
            # Adjust start for boundary tiles
            x_start = max(0, x_end - slice_width)
            y_start = max(0, y_end - slice_height)
            
            crop = image[y_start:y_end, x_start:x_end]
            slices.append((crop, x_start, y_start))
            
            if x_end == img_w:
                break
            x += step_x
            
        if y_end == img_h:
            break
        y += step_y
        
    return slices

def merge_sahi_detections(
    slice_results: List[Tuple[List[VisualDetection], int, int]],
    iou_threshold: float = 0.35
) -> List[VisualDetection]:
    """Applies Non-Maximum Merging (NMM) to combine detections from sliced tiles back into full-image space."""
    global_detections: List[VisualDetection] = []
    
    # 1. Map sliced BBoxes back to global image pixel space
    for detections, x_offset, y_offset in slice_results:
        for det in detections:
            g_bbox = BBox(
                det.bbox.x1 + x_offset,
                det.bbox.y1 + y_offset,
                det.bbox.x2 + x_offset,
                det.bbox.y2 + y_offset
            )
            global_detections.append(VisualDetection(
                bbox=g_bbox,
                confidence=det.confidence,
                class_id=det.class_id,
                label=det.label,
                gps=None  # Re-calculated on global BBox
            ))
            
    if not global_detections:
        return []
        
    # 2. Greedy Non-Maximum Merging (NMM)
    global_detections.sort(key=lambda d: d.confidence, reverse=True)
    merged: List[VisualDetection] = []
    
    while global_detections:
        best = global_detections.pop(0)
        merged.append(best)
        global_detections = [
            d for d in global_detections
            if d.bbox.iou(best.bbox) < iou_threshold
        ]
        
    return merged
