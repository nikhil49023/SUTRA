"""
Smart Horizon GCS — Real-Time Network & Protocol Connection Metrics Tracker
Subsystem: Communication Core (Phase 8)
"""

import time
from dataclasses import dataclass, field
from typing import Optional
from state.communication_state import ConnectionState


@dataclass
class ConnectionMetrics:
    """
    Real-time performance metrics tracking bandwidth, latency, queue health, and packet loss.
    """

    connection_state: ConnectionState = ConnectionState.DISCONNECTED
    connected_since: Optional[float] = None
    reconnect_count: int = 0
    messages_sent: int = 0
    messages_received: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    last_message_time: float = field(default_factory=time.time)
    latency_ms: float = 0.0
    heartbeat_loss_count: int = 0
    dropped_messages: int = 0
    queue_size: int = 0

    def record_sent(self, bytes_count: int = 0) -> None:
        self.messages_sent += 1
        self.bytes_sent += bytes_count
        self.last_message_time = time.time()

    def record_received(self, bytes_count: int = 0) -> None:
        self.messages_received += 1
        self.bytes_received += bytes_count
        self.last_message_time = time.time()

    def record_dropped(self) -> None:
        self.dropped_messages += 1

    def record_latency(self, latency_ms: float) -> None:
        self.latency_ms = max(0.0, latency_ms)

    def record_connect(self) -> None:
        self.connected_since = time.time()

    def record_disconnect(self) -> None:
        self.connected_since = None

    def reset(self) -> None:
        self.messages_sent = 0
        self.messages_received = 0
        self.bytes_sent = 0
        self.bytes_received = 0
        self.reconnect_count = 0
        self.heartbeat_loss_count = 0
        self.dropped_messages = 0
        self.latency_ms = 0.0


# Global metrics tracker
connection_metrics = ConnectionMetrics()
