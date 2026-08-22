"""
Smart Horizon GCS — Reconnect Backoff & Jitter Unit Tests
Subsystem: Test Suite (Phase 8)
"""

import pytest
from communication.core.reconnect_manager import ReconnectManager


def test_reconnect_exponential_backoff():
    """Verify exponential backoff sequence and upper cap."""
    rm = ReconnectManager(initial_delay_sec=1.0, max_delay_sec=16.0, backoff_multiplier=2.0, jitter_factor=0.0)

    d1 = rm.next_delay()
    d2 = rm.next_delay()
    d3 = rm.next_delay()
    d4 = rm.next_delay()
    d5 = rm.next_delay()

    assert d1 == 1.0
    assert d2 == 2.0
    assert d3 == 4.0
    assert d4 == 8.0
    assert d5 == 16.0
    assert rm.next_delay() == 16.0  # Capped at 16s


def test_reconnect_retry_limits_and_reset():
    """Verify retry exhaustion and state reset."""
    rm = ReconnectManager(max_retries=3)

    assert rm.should_retry() is True
    rm.next_delay()  # 1
    rm.next_delay()  # 2
    rm.next_delay()  # 3

    assert rm.should_retry() is False
    assert rm.is_max_retries_exceeded() is True

    # Reset on success
    rm.reset()
    assert rm.should_retry() is True
    assert rm.retry_count == 0
