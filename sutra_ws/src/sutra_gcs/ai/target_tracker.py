"""
SUTRA GCS — Multi-Target Tracker
"""

import time
from typing import Dict, Any, List


class TargetTracker:
    """ByteTrack / DeepSORT multi-object persistent tracking."""

    def __init__(self):
        self.tracks: Dict[str, Dict[str, Any]] = {}

    def update_tracks(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        for det in detections:
            tid = det["target_id"]
            if tid not in self.tracks:
                self.tracks[tid] = {"first_seen": time.time(), "updates": 0}
            self.tracks[tid]["updates"] += 1
            self.tracks[tid]["last_seen"] = time.time()
            self.tracks[tid]["lat"] = det["lat"]
            self.tracks[tid]["lon"] = det["lon"]
        return detections


target_tracker = TargetTracker()
