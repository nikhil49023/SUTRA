"""
Smart Horizon GCS — Application-Level Heartbeat & Link Health Monitor
Subsystem: Communication Core (Phase 8)
"""

import time
from typing import Optional

from services.event_bus import EventBus, get_event_bus


class HeartbeatMonitor:
    """
    Monitors bidirectional application-level heartbeat pulses and measures link latency.
    """

    def __init__(
        self,
        timeout_sec: float = 3.0,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.timeout_sec = timeout_sec
        self.event_bus = event_bus or get_event_bus()
        self.last_received: float = time.time()
        self.last_sent: float = time.time()
        self.latency_ms: float = 0.0
        self.missed_count: int = 0
        self.is_healthy: bool = True

    def record_sent(self) -> None:
        self.last_sent = time.time()

    def record_received(self, echo_timestamp: Optional[float] = None) -> None:
        now = time.time()
        self.last_received = now
        self.missed_count = 0
        if not self.is_healthy:
            self.is_healthy = True
            self.event_bus.emit("communication.heartbeat", payload={"healthy": True}, source="heartbeat_monitor")

        if echo_timestamp:
            rtt = (now - echo_timestamp) * 1000.0
            self.latency_ms = max(1.0, rtt)
            self.event_bus.emit(
                "communication.latency_updated",
                payload={"latency_ms": round(self.latency_ms, 1)},
                source="heartbeat_monitor",
            )

    def check_health(self) -> bool:
        """
        Audits time elapsed since last received heartbeat pulse.
        """
        elapsed = time.time() - self.last_received
        if elapsed > self.timeout_sec:
            self.missed_count += 1
            if self.is_healthy:
                self.is_healthy = False
                self.event_bus.emit(
                    "communication.heartbeat_lost",
                    payload={"elapsed_sec": round(elapsed, 1), "missed": self.missed_count},
                    source="heartbeat_monitor",
                )
            return False
        return True


# Global singleton
heartbeat_monitor = HeartbeatMonitor()
