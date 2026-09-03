"""
Smart Horizon GCS — EventBus Unit & Integration Tests
Subsystem: Test Suite (Phase 1)
"""

import asyncio
import pytest
from services.event_bus import EventBus, Event, EventNames


def test_subscribe_and_emit():
    """Verify that a subscribed handler receives published events with payload and metadata."""
    bus = EventBus()
    received_events = []

    def handler(event: Event) -> None:
        received_events.append(event)

    unsub = bus.subscribe(EventNames.TELEMETRY_UPDATED, handler)
    assert bus.has_subscribers(EventNames.TELEMETRY_UPDATED) is True

    bus.emit(
        EventNames.TELEMETRY_UPDATED,
        payload={"altitude": 50.0, "battery": 95.0},
        source="test_source",
        correlation_id="corr-1234",
    )

    assert len(received_events) == 1
    ev = received_events[0]
    assert ev.event_name == "telemetry.updated"
    assert ev.payload == {"altitude": 50.0, "battery": 95.0}
    assert ev.source == "test_source"
    assert ev.correlation_id == "corr-1234"
    assert ev.timestamp > 0

    # Test unsubscribe callable
    unsub()
    assert bus.has_subscribers(EventNames.TELEMETRY_UPDATED) is False


def test_multiple_subscribers():
    """Verify that multiple subscribers to the same topic all receive the event."""
    bus = EventBus()
    calls_a = []
    calls_b = []

    bus.subscribe(EventNames.MISSION_STARTED, lambda ev: calls_a.append(ev))
    bus.subscribe(EventNames.MISSION_STARTED, lambda ev: calls_b.append(ev))

    bus.emit(EventNames.MISSION_STARTED, payload={"mission_id": "m-001"})

    assert len(calls_a) == 1
    assert len(calls_b) == 1
    assert calls_a[0].payload["mission_id"] == "m-001"
    assert calls_b[0].payload["mission_id"] == "m-001"


def test_wildcard_subscription():
    """Verify that wildcard subscriptions ('telemetry.*' and '*') receive matching events."""
    bus = EventBus()
    wildcard_events = []
    all_events = []

    bus.subscribe("telemetry.*", lambda ev: wildcard_events.append(ev))
    bus.subscribe("*", lambda ev: all_events.append(ev))

    bus.emit(EventNames.TELEMETRY_UPDATED, payload={"lat": 37.77})
    bus.emit(EventNames.TELEMETRY_LOST, payload={"reason": "timeout"})
    bus.emit(EventNames.MISSION_STARTED, payload={"mission_id": "m-001"})

    # 'telemetry.*' should match both telemetry.updated and telemetry.lost
    assert len(wildcard_events) == 2
    # '*' should match all three events
    assert len(all_events) == 3


def test_exception_isolation():
    """
    CRITICAL: Verify that if one subscriber raises an unhandled exception,
    the EventBus does NOT crash and subsequent subscribers still receive the event.
    """
    bus = EventBus()
    good_subscriber_received = []

    def failing_subscriber(event: Event) -> None:
        raise RuntimeError("Intentional Subscriber Crash for Testing")

    def good_subscriber(event: Event) -> None:
        good_subscriber_received.append(event)

    bus.subscribe(EventNames.ALERT_CREATED, failing_subscriber)
    bus.subscribe(EventNames.ALERT_CREATED, good_subscriber)

    # Must NOT raise RuntimeError
    bus.emit(EventNames.ALERT_CREATED, payload={"alert_id": "a-999"})

    assert len(good_subscriber_received) == 1
    assert good_subscriber_received[0].payload["alert_id"] == "a-999"


@pytest.mark.asyncio
async def test_async_emit():
    """Verify asynchronous event emission with async coroutine handlers."""
    bus = EventBus()
    async_received = []

    async def async_handler(event: Event) -> None:
        await asyncio.sleep(0.01)
        async_received.append(event)

    bus.subscribe(EventNames.FLEET_DRONE_ADDED, async_handler)

    await bus.emit_async(EventNames.FLEET_DRONE_ADDED, payload={"drone_id": "drone_bravo"})

    assert len(async_received) == 1
    assert async_received[0].payload["drone_id"] == "drone_bravo"
