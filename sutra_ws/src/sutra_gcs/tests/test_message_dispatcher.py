"""
Smart Horizon GCS — Message Envelope Validation & Dispatcher Unit Tests
Subsystem: Test Suite (Phase 8)
"""

import pytest
from communication.core.message_dispatcher import MessageDispatcher
from communication.core.subscription_manager import SubscriptionManager
from services.event_bus import EventBus


def test_envelope_validation():
    """Verify standard message envelope schema validation."""
    dispatcher = MessageDispatcher()

    # 1. Valid envelope
    valid_msg = {"type": "telemetry", "topic": "drone/alpha/telemetry", "payload": {"lat": 37.77}}
    valid, err = dispatcher.validate_envelope(valid_msg)
    assert valid is True
    assert err is None

    # 2. Invalid envelope (missing topic)
    invalid_msg = {"type": "telemetry", "payload": {}}
    valid, err = dispatcher.validate_envelope(invalid_msg)
    assert valid is False
    assert "topic" in err


def test_hierarchical_topic_subscriptions_and_wildcards():
    """Verify single-level (+) and multi-level (#) MQTT-style topic routing."""
    sub_mgr = SubscriptionManager()
    received_plus = []
    received_hash = []

    sub_mgr.subscribe("drone/+/telemetry", lambda msg: received_plus.append(msg))
    sub_mgr.subscribe("system/#", lambda msg: received_hash.append(msg))

    # Matches drone/+/telemetry
    cbs_alpha = sub_mgr.get_subscribers("drone/alpha/telemetry")
    cbs_bravo = sub_mgr.get_subscribers("drone/bravo/telemetry")
    assert len(cbs_alpha) == 1
    assert len(cbs_bravo) == 1

    # Matches system/#
    cbs_sys = sub_mgr.get_subscribers("system/alerts/critical")
    assert len(cbs_sys) == 1
