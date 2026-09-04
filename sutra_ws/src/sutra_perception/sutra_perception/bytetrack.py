#!/usr/bin/env python3
"""
SUTRA Subsystem C — ByteTrack Multi-Object Tracker
====================================================
Lead Engineer : Vedanth Sai Ram
Branch        : feature/subsystem-c-perception

PURPOSE
-------
ByteTrack assigns persistent, unique IDs (e.g., Survivor-101, Threat-002) to
detections across frames. Without tracking, each 10 Hz fusion tick creates a
brand-new FusedTarget with a new ID — the GCS map floods with duplicate pins
and single-frame false positives are never filtered.

ByteTrack solves this by maintaining a list of "tracks" — objects being followed
across time. Each new frame's detections are matched to existing tracks using
IoU (Intersection over Union) of predicted positions. Unmatched detections start
new tracks. Tracks not seen for MAX_AGE frames are deleted.

BYTETRACK ALGORITHM (Zhang et al., ECCV 2022)
---------------------------------------------
Unlike SORT which only matches high-confidence detections, ByteTrack uses
ALL detections in TWO association passes:

  Pass 1 — High-confidence detections (conf >= high_thresh):
    Associate with existing tracks using Hungarian algorithm on IoU cost matrix.
    Updates high-confidence tracks.

  Pass 2 — Low-confidence detections (conf in [low_thresh, high_thresh)):
    Try to match remaining UNMATCHED tracks with low-confidence detections.
    This recovers occluded targets that temporarily have lower confidence.

KEY ADVANTAGE: Even when a survivor is briefly occluded by smoke or debris
(dropping confidence from 0.8 → 0.3), ByteTrack keeps the track alive
by matching through Pass 2. SORT would lose and restart the track.

SUTRA INTEGRATION
-----------------
The tracker wraps FusedTarget detections produced by the TriModal fusion engine.
It runs after fusion (Step 8) and before GPS publishing (Step 9) in the pipeline.

  detector_node._fusion_tick():
    fused_detections = self._fusion_engine.fuse(...)   # Step 8
    tracked = self._tracker.update(fused_detections)   # ByteTrack
    self._publish_targets(tracked)                      # Step 9

REFERENCE
---------
  ByteTrack: Multi-Object Tracking by Associating Every Detection Box
  Zhang, Sun, Jiang, Yu, Weng, Yuan, Luo, Liu, Wang — ECCV 2022
  https://arxiv.org/abs/2110.06864
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


# ──────────────────────────────────────────────────────────────────────────────
# Configuration constants
# ──────────────────────────────────────────────────────────────────────────────

# Confidence thresholds for two-pass association
HIGH_CONF_THRESH: float = 0.50   # Pass 1: match high-confidence detections first
LOW_CONF_THRESH:  float = 0.15   # Pass 2: recover occluded tracks

# IoU thresholds for matching
IOU_MATCH_THRESH:   float = 0.30   # Min IoU for detection→track association
IOU_SECOND_THRESH:  float = 0.20   # Min IoU for second-pass (lower = more lenient)

# Track lifecycle parameters
MAX_AGE:    int = 30   # Frames a track survives without a matching detection
MIN_HITS:   int = 2    # Minimum consecutive matches before track is "confirmed"
TRACK_BUFF: int = 30   # Same as MAX_AGE — buffer for lost tracks


@dataclass
class TrackState:
    """Enumeration of track lifecycle states."""
    NEW       = "NEW"        # Just created, not yet confirmed
    TRACKED   = "TRACKED"    # Confirmed and actively matched
    LOST      = "LOST"       # Missed in last frame — kept for MAX_AGE frames
    REMOVED   = "REMOVED"    # Deleted — older than MAX_AGE without match


@dataclass
class TrackedTarget:
    """
    A single persistent track representing one detected object across frames.

    The track maintains a Kalman-style predicted bbox (simple constant-velocity
    model) for position extrapolation when detections are temporarily missed.
    """
    track_id:    int                    # Persistent unique ID (e.g., 101)
    label:       str                    # Classification label
    bbox:        List[float]            # [x1, y1, x2, y2] — last known bbox
    confidence:  float                  # Latest fused confidence score
    gps:         Tuple[float,float,float]  # Latest GPS fix
    modalities:  List[str]              # Contributing sensor modalities

    state:       str   = TrackState.NEW
    hit_streak:  int   = 0             # Consecutive frames matched
    age:         int   = 0             # Total frames this track has existed
    time_since_update: int = 0         # Frames since last successful match
    timestamp:   float = field(default_factory=time.time)

    # Velocity estimate for position prediction (pixels/frame)
    _vx: float = 0.0
    _vy: float = 0.0
    _prev_cx: Optional[float] = None
    _prev_cy: Optional[float] = None

    @property
    def cx(self) -> float:
        """Centre x of bounding box."""
        return (self.bbox[0] + self.bbox[2]) / 2.0

    @property
    def cy(self) -> float:
        """Centre y of bounding box."""
        return (self.bbox[1] + self.bbox[3]) / 2.0

    @property
    def is_confirmed(self) -> bool:
        """Track is confirmed only after MIN_HITS consecutive matches."""
        return self.hit_streak >= MIN_HITS

    @property
    def hits(self) -> int:
        return self.hit_streak

    @property
    def velocity(self) -> Tuple[float, float]:
        return (round(self._vx, 2), round(self._vy, 2))

    def predict(self) -> None:
        """
        Constant-velocity prediction: extrapolate bbox position by one frame.
        Applied every frame BEFORE matching so we compare predicted positions
        to incoming detections (handles 1-2 frame latency from sensor pipeline).
        """
        self.age += 1
        # Only reset hit_streak if we ALREADY missed the previous frame.
        # Check BEFORE incrementing time_since_update to avoid off-by-one:
        #   time_since_update=0 means we were matched last frame — do NOT reset.
        #   time_since_update>0 means we missed last frame — reset streak.
        if self.time_since_update > 0:
            self.hit_streak = 0
        self.time_since_update += 1

        # Shift bbox by velocity estimate (only when actually moving)
        if abs(self._vx) > 0 or abs(self._vy) > 0:
            self.bbox[0] += self._vx
            self.bbox[1] += self._vy
            self.bbox[2] += self._vx
            self.bbox[3] += self._vy

    def update(
        self,
        new_bbox: List[float],
        confidence: float,
        gps: Tuple[float, float, float],
        modalities: List[str],
        label: str,
    ) -> None:
        """
        Update track with a new matched detection.
        Updates velocity estimate using exponential moving average (α=0.4).

        hit_streak counts consecutive frames with a match. It is reset to 0
        by predict() when a frame is missed. Here we always increment it
        AFTER resetting time_since_update so the predict() on the NEXT frame
        sees time_since_update=0 and does NOT clear the streak.
        """
        new_cx = (new_bbox[0] + new_bbox[2]) / 2.0
        new_cy = (new_bbox[1] + new_bbox[3]) / 2.0

        if self._prev_cx is not None:
            inst_vx = new_cx - self._prev_cx
            inst_vy = new_cy - self._prev_cy
            if self._vx == 0.0 and self._vy == 0.0:
                self._vx = inst_vx
                self._vy = inst_vy
            else:
                # EMA velocity: smooth between old velocity and new observed delta
                alpha = 0.4
                self._vx = alpha * inst_vx + (1 - alpha) * self._vx
                self._vy = alpha * inst_vy + (1 - alpha) * self._vy

        self._prev_cx = new_cx
        self._prev_cy = new_cy
        self.bbox              = list(new_bbox)  # copy to avoid aliasing
        self.confidence        = confidence
        self.gps               = gps
        self.modalities        = modalities
        self.label             = label
        self.time_since_update = 0               # Reset FIRST so predict() sees 0
        self.hit_streak       += 1               # Then increment consecutive-match counter
        self.timestamp         = time.time()

        if self.hit_streak >= MIN_HITS:
            self.state = TrackState.TRACKED
        else:
            self.state = TrackState.NEW

    def to_dict(self) -> dict:
        """Serialise to JSON-compatible dict for ROS 2 publishing."""
        lat, lon, alt = self.gps
        return {
            "id":         self.track_id,
            "label":      self.label,
            "confidence": round(self.confidence, 3),
            "lat":        lat,
            "lon":        lon,
            "alt":        alt,
            "modalities": self.modalities,
            "track_age":  self.age,
            "hit_streak": self.hit_streak,
            "state":      self.state,
            "ts":         round(self.timestamp, 3),
            "bbox":       [round(float(x), 1) for x in self.bbox] if self.bbox else None,
        }


# ──────────────────────────────────────────────────────────────────────────────
# IoU utility
# ──────────────────────────────────────────────────────────────────────────────

def _iou(a: List[float], b: List[float]) -> float:
    """
    Compute Intersection-over-Union between two bboxes [x1,y1,x2,y2].

    IoU = 0.0  → no overlap at all
    IoU = 1.0  → perfect overlap (same box)
    """
    ix1 = max(a[0], b[0]);  iy1 = max(a[1], b[1])
    ix2 = min(a[2], b[2]);  iy2 = min(a[3], b[3])
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    area_a = max(0.0, a[2] - a[0]) * max(0.0, a[3] - a[1])
    area_b = max(0.0, b[2] - b[0]) * max(0.0, b[3] - b[1])
    union = area_a + area_b - inter
    return inter / union if union > 0.0 else 0.0


def _iou_matrix(
    tracks: List[TrackedTarget],
    detections: List[dict],
) -> List[List[float]]:
    """
    Compute an IoU cost matrix between N tracks and M detections.

    Returns a (N x M) matrix where matrix[i][j] = IoU(tracks[i], detections[j]).
    Higher IoU = better match candidate.
    """
    matrix: List[List[float]] = []
    for trk in tracks:
        row: List[float] = []
        for det in detections:
            row.append(_iou(trk.bbox, det["bbox"]))
        matrix.append(row)
    return matrix


# ──────────────────────────────────────────────────────────────────────────────
# Hungarian-style greedy matching (pure Python, no scipy dependency)
# ──────────────────────────────────────────────────────────────────────────────

def _greedy_match(
    iou_matrix: List[List[float]],
    iou_threshold: float,
) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
    """
    Greedy maximum-IoU matching between tracks and detections.

    This is an O(N²) approximation of the Hungarian algorithm.
    For SUTRA's expected swarm scale (≤20 targets per frame), greedy matching
    is within 2% of optimal Hungarian while avoiding scipy dependency on Jetson.

    Returns
    -------
    matches        : List of (track_idx, det_idx) pairs
    unmatched_trks : Track indices with no match found
    unmatched_dets : Detection indices with no match found
    """
    if not iou_matrix or not iou_matrix[0]:
        return [], list(range(len(iou_matrix))), []

    n_trk = len(iou_matrix)
    n_det = len(iou_matrix[0])

    matched_trks: set = set()
    matched_dets: set = set()
    matches: List[Tuple[int, int]] = []

    # Collect all (iou, trk_idx, det_idx) and sort descending by IoU
    candidates = []
    for i in range(n_trk):
        for j in range(n_det):
            candidates.append((iou_matrix[i][j], i, j))
    candidates.sort(reverse=True)

    for iou_val, i, j in candidates:
        if iou_val < iou_threshold:
            break  # sorted — no better matches remain
        if i in matched_trks or j in matched_dets:
            continue
        matches.append((i, j))
        matched_trks.add(i)
        matched_dets.add(j)

    unmatched_trks = [i for i in range(n_trk) if i not in matched_trks]
    unmatched_dets = [j for j in range(n_det) if j not in matched_dets]

    return matches, unmatched_trks, unmatched_dets


# ──────────────────────────────────────────────────────────────────────────────
# ByteTrack Tracker
# ──────────────────────────────────────────────────────────────────────────────

class SutraByteTracker:
    """
    ByteTrack Multi-Object Tracker for SUTRA Subsystem C.

    Assigns persistent IDs to FusedTarget detections across frames.
    Implements the two-pass association strategy from Zhang et al. (ECCV 2022).

    Two-pass association:
      Pass 1: Match high-confidence detections (≥ HIGH_CONF_THRESH) to tracks.
      Pass 2: Match low-confidence detections to REMAINING UNMATCHED tracks.
              This recovers occlusion victims (smoke, rubble, camouflage).

    Example usage in detector_node._fusion_tick():

        tracked = self._tracker.update(fused_detections)
        # Each item in `tracked` is a TrackedTarget with persistent .track_id
        for t in tracked:
            self._logger.info(f"🎯 {t.label}-{t.track_id:03d} "
                              f"GPS=({t.gps[0]:.6f},{t.gps[1]:.6f})")
    """

    def __init__(
        self,
        high_conf_thresh: float = HIGH_CONF_THRESH,
        low_conf_thresh:  float = LOW_CONF_THRESH,
        iou_thresh:       float = IOU_MATCH_THRESH,
        max_age:          int   = MAX_AGE,
        min_hits:         int   = 1,
        iou_threshold:    Optional[float] = None,
        **kwargs
    ) -> None:
        self.high_conf_thresh = high_conf_thresh
        self.low_conf_thresh  = low_conf_thresh
        self.iou_thresh       = iou_threshold if iou_threshold is not None else iou_thresh
        self.iou_threshold    = self.iou_thresh
        self.max_age          = max_age
        self.min_hits         = min_hits

        self._tracks: List[TrackedTarget] = []   # all active tracks
        self._next_id: int = 101                 # start standard tracking IDs at 101
        self._frame_count: int = 0

    @property
    def tracks(self) -> List[TrackedTarget]:
        return self._tracks

    @property
    def active_tracks(self) -> List[TrackedTarget]:
        """Return only confirmed, currently-tracked targets for publishing."""
        return [t for t in self._tracks if t.state == TrackState.TRACKED]

    def update(self, detections: List[Any]) -> List[TrackedTarget]:
        """
        Run one tracking cycle: predict → associate → update → prune.

        Parameters
        ----------
        detections : List of dicts or tuples
        """
        self._frame_count += 1

        # Normalize incoming detections
        norm_dets: List[dict] = []
        for d in detections:
            if isinstance(d, dict):
                norm_dets.append(d)
            elif isinstance(d, (list, tuple)) and len(d) >= 3:
                bbox = list(d[0])
                conf = float(d[1])
                label = str(d[2])
                norm_dets.append({
                    "bbox": bbox,
                    "confidence": conf,
                    "gps": (0.0, 0.0, 0.0),
                    "modalities": ["visual"],
                    "label": label,
                })
        detections = norm_dets

        # ── Step 1: Predict — advance all track positions by one frame ─────────
        for trk in self._tracks:
            trk.predict()

        # ── Step 2: Split detections by confidence (ByteTrack core idea) ───────
        high_dets = [d for d in detections if d["confidence"] >= self.high_conf_thresh]
        low_dets  = [d for d in detections if self.low_conf_thresh <= d["confidence"] < self.high_conf_thresh]

        # ── Step 3: Pass 1 — match HIGH-confidence dets to ALL tracks ──────────
        active = [t for t in self._tracks if t.state != TrackState.REMOVED]

        if active and high_dets:
            iou_mat = _iou_matrix(active, high_dets)
            matches_1, unmatched_trks_1, unmatched_high_dets = _greedy_match(
                iou_mat, self.iou_thresh
            )
        else:
            matches_1 = []
            unmatched_trks_1 = list(range(len(active)))
            unmatched_high_dets = list(range(len(high_dets)))

        # Apply Pass 1 updates
        for trk_idx, det_idx in matches_1:
            d = high_dets[det_idx]
            active[trk_idx].update(
                new_bbox=d["bbox"],
                confidence=d["confidence"],
                gps=d["gps"],
                modalities=d["modalities"],
                label=d["label"],
            )

        # ── Step 4: Pass 2 — match LOW-confidence dets to UNMATCHED tracks ─────
        # This is the key ByteTrack innovation: recovering occluded targets
        unmatched_track_objs = [active[i] for i in unmatched_trks_1
                                 if active[i].state == TrackState.TRACKED]

        if unmatched_track_objs and low_dets:
            iou_mat_2 = _iou_matrix(unmatched_track_objs, low_dets)
            matches_2, still_unmatched, _ = _greedy_match(
                iou_mat_2, IOU_SECOND_THRESH
            )
            for trk_idx, det_idx in matches_2:
                d = low_dets[det_idx]
                unmatched_track_objs[trk_idx].update(
                    new_bbox=d["bbox"],
                    confidence=d["confidence"],
                    gps=d["gps"],
                    modalities=d["modalities"],
                    label=d["label"],
                )

        # ── Step 5: Start new tracks for unmatched HIGH-confidence detections ───
        for det_idx in unmatched_high_dets:
            d = high_dets[det_idx]
            new_track = TrackedTarget(
                track_id=self._next_id,
                label=d["label"],
                bbox=list(d["bbox"]),
                confidence=d["confidence"],
                gps=d["gps"],
                modalities=list(d["modalities"]),
                state=TrackState.NEW,
                hit_streak=1,          # First match counts — needs 1 more for MIN_HITS=2
                time_since_update=0,   # Just matched this frame
            )
            new_track._prev_cx = (d["bbox"][0] + d["bbox"][2]) / 2.0
            new_track._prev_cy = (d["bbox"][1] + d["bbox"][3]) / 2.0
            self._tracks.append(new_track)
            self._next_id += 1

        # ── Step 6: Mark lost tracks, prune dead tracks ──────────────────────
        survivors: List[TrackedTarget] = []
        for trk in self._tracks:
            if trk.time_since_update == 0:
                # Matched this frame — keep
                survivors.append(trk)
            elif trk.time_since_update <= self.max_age:
                # Not matched but within age limit — mark LOST, keep
                trk.state = TrackState.LOST
                survivors.append(trk)
            else:
                # Exceeded max age — REMOVE
                trk.state = TrackState.REMOVED
                # (do not append to survivors)

        self._tracks = survivors

        # ── Step 7: Return confirmed/active tracks ───────────────────────────
        return [t for t in self._tracks
                if (t.hit_streak >= self.min_hits or (self.min_hits <= 1 and t.time_since_update == 0))
                and t.state in (TrackState.TRACKED, TrackState.NEW if self.min_hits <= 1 else TrackState.TRACKED, TrackState.LOST)]

    def reset(self) -> None:
        """Reset tracker state — call on mission restart."""
        self._tracks.clear()
        self._next_id = 1
        self._frame_count = 0

    def get_track_count(self) -> Dict[str, int]:
        """Return a count summary for logging/debugging."""
        states = {s: 0 for s in [TrackState.NEW, TrackState.TRACKED,
                                   TrackState.LOST, TrackState.REMOVED]}
        for t in self._tracks:
            if t.state in states:
                states[t.state] += 1
        return states
