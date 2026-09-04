"""
SUTRA GCS — Auto-Reconnect & Link Recovery Manager
"""

import time
import math


class ReconnectManager:
    """Implements exponential backoff reconnect logic for telemetry sockets."""

    def __init__(self, initial_delay: float = 1.0, max_delay: float = 30.0, backoff_factor: float = 2.0):
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor
        self.attempt = 0
        self.next_attempt_time = 0.0

    def record_failure(self) -> float:
        delay = min(self.max_delay, self.initial_delay * (self.backoff_factor ** self.attempt))
        self.attempt += 1
        self.next_attempt_time = time.time() + delay
        return delay

    def record_success(self) -> None:
        self.attempt = 0
        self.next_attempt_time = 0.0

    def should_retry(self) -> bool:
        return time.time() >= self.next_attempt_time
