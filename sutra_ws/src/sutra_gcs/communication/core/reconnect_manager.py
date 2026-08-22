"""
Smart Horizon GCS — Exponential Backoff & Jittered Reconnect Manager
Subsystem: Communication Core (Phase 8)
"""

import random
from typing import Optional


class ReconnectManager:
    """
    Manages exponential backoff with randomized jitter to prevent reconnect storms.
    """

    def __init__(
        self,
        initial_delay_sec: float = 1.0,
        max_delay_sec: float = 30.0,
        backoff_multiplier: float = 2.0,
        jitter_factor: float = 0.15,
        max_retries: int = 10,
    ) -> None:
        self.initial_delay_sec = initial_delay_sec
        self.max_delay_sec = max_delay_sec
        self.backoff_multiplier = backoff_multiplier
        self.jitter_factor = jitter_factor
        self.max_retries = max_retries
        self.retry_count = 0
        self._current_delay = initial_delay_sec

    def next_delay(self) -> float:
        """Calculates next backoff interval with random jitter."""
        base_delay = min(self.max_delay_sec, self._current_delay)
        jitter = base_delay * self.jitter_factor * (2.0 * random.random() - 1.0)
        delay = max(0.5, base_delay + jitter)

        # Advance exponential multiplier for next query
        self._current_delay = min(self.max_delay_sec, self._current_delay * self.backoff_multiplier)
        self.retry_count += 1
        return delay

    def should_retry(self) -> bool:
        """Returns True if within retry limit."""
        return self.retry_count < self.max_retries

    def is_max_retries_exceeded(self) -> bool:
        return self.retry_count >= self.max_retries

    def reset(self) -> None:
        """Resets backoff state after a successful connection."""
        self.retry_count = 0
        self._current_delay = self.initial_delay_sec


# Global singleton
reconnect_manager = ReconnectManager()
