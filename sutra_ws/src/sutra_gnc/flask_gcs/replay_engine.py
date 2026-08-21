"""
SUTRA Flight Replay & Blackbox Telemetry Engine
Subsystem D: Keyframe Flight Recorder, Timeline Scrubber & GCS Log Exporter
"""

import time
import json
from typing import List, Dict, Any, Optional


class FlightReplayEngine:
    """
    Records high-frequency keyframe telemetry into memory/file and provides
    time-travel flight replay with variable speed scrubbing.
    """

    def __init__(self, max_keyframes: int = 5000):
        self.max_keyframes = max_keyframes
        self.is_recording = True
        self.is_replaying = False
        self.playback_speed = 1.0  # 0.5x, 1.0x, 2.0x, 5.0x, 10.0x
        self.current_frame_idx = 0
        self.keyframes: List[Dict[str, Any]] = []
        self.flight_logs_metadata: List[Dict[str, Any]] = []

    def record_frame(self, fleet_telemetry: Dict[str, Any]) -> None:
        """Capture live telemetry snapshot if recording is active."""
        if not self.is_recording or self.is_replaying:
            return

        frame = {
            "timestamp": round(time.time(), 3),
            "frame_id": len(self.keyframes),
            "fleet": fleet_telemetry
        }
        self.keyframes.append(frame)

        # Ring buffer retention
        if len(self.keyframes) > self.max_keyframes:
            self.keyframes.pop(0)

    def start_recording(self) -> None:
        self.is_recording = True
        self.is_replaying = False

    def stop_recording(self) -> None:
        self.is_recording = False

    def start_replay(self) -> None:
        if self.keyframes:
            self.is_replaying = True
            self.current_frame_idx = 0

    def stop_replay(self) -> None:
        self.is_replaying = False

    def seek_frame(self, frame_idx: int) -> Optional[Dict[str, Any]]:
        """Scrub to a specific keyframe on the replay timeline."""
        if 0 <= frame_idx < len(self.keyframes):
            self.current_frame_idx = frame_idx
            return self.keyframes[frame_idx]
        return None

    def step_replay(self) -> Optional[Dict[str, Any]]:
        """Advance replay by 1 step according to playback speed."""
        if not self.is_replaying or not self.keyframes:
            return None

        step = max(1, int(self.playback_speed))
        self.current_frame_idx = (self.current_frame_idx + step) % len(self.keyframes)
        return self.keyframes[self.current_frame_idx]

    def export_gcslog(self, mission_name: str = "MISSION_ALPHA") -> str:
        """Export session keyframes into standard .gcslog JSON string."""
        log_data = {
            "mission_name": mission_name,
            "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "total_frames": len(self.keyframes),
            "duration_sec": round(len(self.keyframes) * 0.1, 1),
            "keyframes": self.keyframes
        }
        return json.dumps(log_data, indent=2)

    def load_gcslog(self, json_str: str) -> bool:
        """Load external .gcslog file into replay memory."""
        try:
            data = json.loads(json_str)
            if "keyframes" in data:
                self.keyframes = data["keyframes"]
                self.current_frame_idx = 0
                self.is_replaying = True
                return True
        except Exception:
            pass
        return False
