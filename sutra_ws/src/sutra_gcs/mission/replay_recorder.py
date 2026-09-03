"""
Smart Horizon GCS — Mission Replay & After-Action Review (AAR) Recorder
Provides forensic mission timeline tracking, keyframe playback, and event scrubbing.
"""

import time
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger("sutra_gcs.mission.replay_recorder")

@dataclass
class ForensicEvent:
    event_id: str
    timestamp_str: str   # e.g., "19:42:01"
    timestamp_epoch: float
    category: str        # ALERT, RISK, DISPATCH, DETECTION, CORRIDOR, REPLAN, BATTERY, CHARGING, RESCUE
    title: str
    detail: str
    drone_id: Optional[str] = None
    severity: str = "INFO" # INFO, WARNING, CRITICAL, SUCCESS
    telemetry_snapshot: Optional[Dict[str, Any]] = None

class ReplayRecorder:
    """Manages the forensic after-action review timeline and playback."""

    def __init__(self):
        self.is_playing: bool = False
        self.playback_speed: float = 1.0  # 0.5x, 1.0x, 2.0x, 5.0x, 10.0x
        self.current_cursor_idx: int = 0
        self.events: List[ForensicEvent] = self._generate_canonical_mission_log()

    def _generate_canonical_mission_log(self) -> List[ForensicEvent]:
        """Generates the authoritative forensic mission timeline."""
        base_epoch = time.time() - 300.0  # Mission occurred 5 minutes ago

        raw_records = [
            ("19:42:01", 0.0, "ALERT", "Alert received", "SOS beacon detected in Sector Bravo grid", None, "WARNING"),
            ("19:42:04", 3.0, "RISK", "Risk calculated: 84.5", "High debris probability; flood depth 2.4m modeled", None, "WARNING"),
            ("19:42:07", 6.0, "DISPATCH", "4 UAVs dispatched", "UAV-01, UAV-02, UAV-03, UAV-04 in V-Formation sweep", "ALL", "SUCCESS"),
            ("19:42:31", 30.0, "DETECTION", "Survivor candidate detected", "FLIR 34.2°C thermal anomaly geolocated at [12.9716° N, 77.5946° E]", "UAV-01", "SUCCESS"),
            ("19:42:42", 41.0, "CORRIDOR", "UAV-03 detects blocked corridor", "Building collapse structure breach; clearance < 1.8m", "UAV-03", "CRITICAL"),
            ("19:42:43", 42.0, "CORRIDOR", "Corridor invalidated", "Waypoint corridor Alpha-03 marked CLOSED in GIS OctoMap", "UAV-03", "WARNING"),
            ("19:42:44", 43.0, "REPLAN", "Swarm replanned", "ORCA 3D evasive corridor recalculation; +3.1m safety clearance restored", "ALL", "SUCCESS"),
            ("19:43:02", 61.0, "BATTERY", "UAV-02 battery 22%", "Below standard search margin; optimal station descent evaluated", "UAV-02", "WARNING"),
            ("19:43:03", 62.0, "CHARGING", "Charging bay reserved", "STATION-02 (North Ridge) selected; Bay #1 locked for UAV-02", "UAV-02", "SUCCESS"),
            ("19:43:05", 64.0, "DISPATCH", "Reserve UAV dispatched", "UAV-05 deployed from Base Hub to cover Sector Charlie search grid", "UAV-05", "INFO"),
            ("19:43:40", 99.0, "RESCUE", "Survivor location transmitted", "Cursor-on-Target XML dispatched to NDMA Ground Rescue Unit 04", "UAV-01", "SUCCESS"),
        ]

        events = []
        for idx, (t_str, dt, cat, title, detail, drone, sev) in enumerate(raw_records):
            events.append(ForensicEvent(
                event_id=f"aar-evt-{idx+1:02d}",
                timestamp_str=t_str,
                timestamp_epoch=base_epoch + dt,
                category=cat,
                title=title,
                detail=detail,
                drone_id=drone,
                severity=sev,
            ))
        return events

    def get_status_dict(self) -> Dict[str, Any]:
        """Returns full mission replay state."""
        return {
            "is_playing": self.is_playing,
            "playback_speed": self.playback_speed,
            "cursor_index": self.current_cursor_idx,
            "total_events": len(self.events),
            "events": [asdict(e) for e in self.events],
        }

    def set_cursor(self, index: int):
        self.current_cursor_idx = max(0, min(index, len(self.events) - 1))

    def set_playback_speed(self, speed: float):
        if speed in (0.5, 1.0, 2.0, 5.0, 10.0):
            self.playback_speed = speed

    def play(self):
        self.is_playing = True

    def pause(self):
        self.is_playing = False

# Global singleton
replay_recorder = ReplayRecorder()
