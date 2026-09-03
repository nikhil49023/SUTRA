"""
SUTRA GCS — Heartbeat & Failsafe Watchdog
"""

import time
from typing import Dict, Any


class HeartbeatWatchdog:
    """Monitors incoming telemetry heartbeats and flags link loss when timeout > 3.0s."""

    def __init__(self, timeout_sec: float = 3.0):
        self.timeout_sec = timeout_sec
        self.last_heartbeat_time: Dict[str, float] = {}

    def beat(self, drone_id: str) -> None:
        self.last_heartbeat_time[drone_id] = time.time()

    def is_alive(self, drone_id: str) -> bool:
        last = self.last_heartbeat_time.get(drone_id, 0.0)
        return (time.time() - last) < self.timeout_sec

    def get_latency_ms(self, drone_id: str) -> float:
        last = self.last_heartbeat_time.get(drone_id, time.time())
        return max(5.0, (time.time() - last) * 1000.0)


heartbeat = HeartbeatWatchdog()
