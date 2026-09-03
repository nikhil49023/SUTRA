"""
Smart Horizon GCS — Heartbeat & Latency Monitor Unit Tests
Subsystem: Test Suite (Phase 8)
"""

import time
import pytest
from communication.core.heartbeat_monitor import HeartbeatMonitor
from services.event_bus import EventBus


def test_heartbeat_latency_and_pulse():
    """Verify round-trip latency calculation from heartbeat pulse."""
    event_bus = EventBus()
    monitor = HeartbeatMonitor(timeout_sec=2.0, event_bus=event_bus)

    sent_t = time.time() - 0.035  # 35ms ago
    monitor.record_received(echo_timestamp=sent_t)

    assert 30.0 < monitor.latency_ms < 45.0
    assert monitor.check_health() is True
    assert monitor.missed_count == 0


def test_heartbeat_timeout_detection():
    """Verify timeout flagging when pulses cease."""
    events = []
    event_bus = EventBus()
    event_bus.subscribe("communication.heartbeat_lost", lambda e: events.append(e))

    monitor = HeartbeatMonitor(timeout_sec=0.1, event_bus=event_bus)
    time.sleep(0.15)

    assert monitor.check_health() is False
    assert len(events) >= 1
