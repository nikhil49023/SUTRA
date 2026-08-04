#!/usr/bin/env python3
"""
SUTRA Subsystem C: ByteTRACK Multi-Object Tracking (MOT) Module
================================================================
Lead Engineer : Vedanth Sai Ram
Branch        : feature/subsystem-c-perception
Package       : sutra_perception

Provides ByteTRACK multi-object tracking for persistent survivor ID assignment
(Survivor-101, Survivor-102) and velocity estimation across consecutive aerial frames.
Associates both high-confidence and low-confidence detection boxes to prevent track loss during occlusions.
"""

from typing import List, Dict, Tuple
import numpy as np

class TrackState:
    New = 0
    Tracked = 1
    Lost = 2
    Removed = 3

class SUTRASTrack:
    """Single Object Track for aerial survivors."""
    _count = 100  # Start survivor IDs at 101

    def __init__(self, bbox: List[float], score: float, class_id: int):
        SUTRASTrack._count += 1
        self.track_id = SUTRASTrack._count
        self.bbox = bbox  # [x1, y1, x2, y2]
        self.score = score
        self.class_id = class_id
        self.state = TrackState.New
        self.tracklet_len = 0
        self.time_since_update = 0
        self.velocity = [0.0, 0.0]  # [vx, vy] in pixels/frame

    @property
    def cx(self) -> float:
        return (self.bbox[0] + self.bbox[2]) / 2.0

    @property
    def cy(self) -> float:
        return (self.bbox[1] + self.bbox[3]) / 2.0

    def update(self, new_track: 'SUTRASTrack'):
        old_cx, old_cy = self.cx, self.cy
        self.bbox = new_track.bbox
        self.score = new_track.score
        self.velocity = [self.cx - old_cx, self.cy - old_cy]
        self.tracklet_len += 1
        self.time_since_update = 0
        self.state = TrackState.Tracked

    def mark_lost(self):
        self.state = TrackState.Lost

    def predict(self):
        # Linear velocity prediction
        self.bbox[0] += self.velocity[0]
        self.bbox[1] += self.velocity[1]
        self.bbox[2] += self.velocity[0]
        self.bbox[3] += self.velocity[1]
        self.time_since_update += 1


def compute_iou(box1: List[float], box2: List[float]) -> float:
    """Compute Intersection over Union (IoU) between two bounding boxes [x1, y1, x2, y2]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = area1 + area2 - inter
    return inter / max(1e-6, union)


class SUTRAByteTracker:
    """
    ByteTRACK Multi-Object Tracker.
    Performs 2-stage IoU association:
    Stage 1: High-score detections (score >= high_thresh) with active tracks.
    Stage 2: Low-score detections (low_thresh <= score < high_thresh) with remaining unmatched tracks.
    """
    def __init__(self, high_thresh: float = 0.5, low_thresh: float = 0.1, match_thresh: float = 0.3, max_time_lost: int = 30):
        self.high_thresh = high_thresh
        self.low_thresh = low_thresh
        self.match_thresh = match_thresh
        self.max_time_lost = max_time_lost
        self.tracked_stracks: List[SUTRASTrack] = []
        self.lost_stracks: List[SUTRASTrack] = []

    def update(self, detections: List[Tuple[List[float], float, int]]) -> List[SUTRASTrack]:
        """
        Input: list of (bbox [x1,y1,x2,y2], score, class_id)
        Output: list of active SUTRASTrack objects with persistent track_id.
        """
        for t in self.tracked_stracks:
            t.predict()

        high_dets = [SUTRASTrack(b, s, c) for b, s, c in detections if s >= self.high_thresh]
        low_dets = [SUTRASTrack(b, s, c) for b, s, c in detections if self.low_thresh <= s < self.high_thresh]

        # Stage 1: Associate high-score detections with active tracks
        unmatched_tracks = []
        unmatched_high_dets = list(high_dets)

        for track in self.tracked_stracks:
            best_match = None
            best_iou = self.match_thresh
            for det in unmatched_high_dets:
                iou = compute_iou(track.bbox, det.bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_match = det

            if best_match is not None:
                track.update(best_match)
                unmatched_high_dets.remove(best_match)
            else:
                unmatched_tracks.append(track)

        # Stage 2: Associate remaining unmatched tracks with low-score detections (recovers occluded survivors)
        for track in unmatched_tracks:
            best_match = None
            best_iou = self.match_thresh
            for det in low_dets:
                iou = compute_iou(track.bbox, det.bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_match = det

            if best_match is not None:
                track.update(best_match)
                low_dets.remove(best_match)
            else:
                track.mark_lost()

        # Add new tracks for unmatched high-confidence detections
        for det in unmatched_high_dets:
            det.state = TrackState.Tracked
            self.tracked_stracks.append(det)

        # Cleanup lost tracks beyond max_time_lost
        self.tracked_stracks = [t for t in self.tracked_stracks if t.state == TrackState.Tracked or (t.state == TrackState.Lost and t.time_since_update < self.max_time_lost)]
        return [t for t in self.tracked_stracks if t.state == TrackState.Tracked]
