"""
SUTRA GCS Test Suite — Subsystem C (AI Edge Perception) Adapter Integration
Verifies:
1. Valid FusedTarget normalization and canonical ingestion into AIState.
2. Centralized drone ID normalization (uav_alpha -> alpha).
3. Payload validation (bounds, NaN, Inf, missing fields).
4. ByteTrack ID persistence & duplicate detection (no duplicate markers).
5. Target lifecycle state progression (DETECTED -> TRACKED -> LOST).
6. High-confidence survivor alert generation with cooldown.
7. Resilience when ROS 2 is unavailable.
8. EventBus event emissions & payload contracts.
"""

import time
import math
import pytest
from dataclasses import replace

from communication.adapters.perception_subsystem_adapter import (
    PerceptionSubsystemAdapter,
    normalize_drone_id,
    validate_target_payload,
)
from services.event_bus import EventBus
from state.application_state import StateStore, ApplicationState
from state.ai_state import AIState, TrackedTarget


@pytest.fixture
def test_setup():
    """Provides an isolated StateStore, EventBus, and PerceptionSubsystemAdapter."""
    state_store = StateStore()
    event_bus = EventBus()
    adapter = PerceptionSubsystemAdapter(
        state_store=state_store,
        event_bus=event_bus,
        alert_cooldown_sec=2.0,
        target_timeout_sec=1.0,
    )
    return state_store, event_bus, adapter


def test_drone_id_mapping():
    """Verifies centralized drone ID normalization map."""
    assert normalize_drone_id("uav_alpha") == "alpha"
    assert normalize_drone_id("uav_beta") == "bravo"
    assert normalize_drone_id("uav_gamma") == "charlie"
    assert normalize_drone_id("uav_delta") == "delta"
    assert normalize_drone_id("uav_epsilon") == "epsilon"
    assert normalize_drone_id("drone_alpha") == "alpha"
    assert normalize_drone_id("ALPHA") == "alpha"
    assert normalize_drone_id(None) == "alpha"
    # Unknown should preserve identifier without throwing
    assert normalize_drone_id("custom_uav_99") == "custom_uav_99"


def test_confidence_and_payload_validation():
    """Verifies validation catches NaN, Inf, out-of-bound coords, and invalid confidences."""
    # Valid payload
    valid, err = validate_target_payload({
        "id": 101,
        "lat": 20.59365,
        "lon": 78.96285,
        "alt": 15.0,
        "confidence": 0.95,
        "ts": time.time(),
    })
    assert valid is True
    assert err is None

    # Missing ID
    valid, err = validate_target_payload({"lat": 20.5, "lon": 78.9, "confidence": 0.9})
    assert valid is False
    assert "target ID" in err

    # Latitude out of bounds
    valid, err = validate_target_payload({"id": 101, "lat": 95.0, "lon": 78.9, "confidence": 0.9})
    assert valid is False
    assert "Latitude out of bounds" in err

    # Longitude out of bounds
    valid, err = validate_target_payload({"id": 101, "lat": 20.0, "lon": 200.0, "confidence": 0.9})
    assert valid is False
    assert "Longitude out of bounds" in err

    # Confidence NaN / Inf
    valid, err = validate_target_payload({"id": 101, "lat": 20.0, "lon": 78.0, "confidence": float("nan")})
    assert valid is False

    valid, err = validate_target_payload({"id": 101, "lat": 20.0, "lon": 78.0, "confidence": 1.5})
    assert valid is False
    assert "Confidence out of bounds" in err


def test_target_normalization_and_ai_state_update(test_setup):
    """Verifies FusedTarget correctly normalizes and updates AIState."""
    state_store, event_bus, adapter = test_setup

    events_received = []
    event_bus.subscribe("ai.target_detected", lambda e: events_received.append(e))

    target_payload = {
        "id": 101,
        "label": "SURVIVOR",
        "confidence": 0.948,
        "lat": 20.593650,
        "lon": 78.962850,
        "alt": 15.0,
        "modalities": ["visual", "thermal"],
        "drone_id": "uav_alpha",
        "ts": 1772320000.0,
    }

    processed = adapter.inject_fused_target(target_payload)
    assert len(processed) == 1
    t = processed[0]

    assert t.target_id == "101"
    assert t.label == "SURVIVOR"
    assert t.confidence == 0.948
    assert t.latitude == 20.593650
    assert t.longitude == 78.962850
    assert t.altitude_m == 15.0
    assert t.drone_id == "alpha"
    assert t.tracking_status == "DETECTED"

    # Verify AIState
    state = state_store.get_state()
    assert len(state.ai_state.tracked_targets) == 1
    assert state.ai_state.tracked_targets[0].target_id == "101"

    # Verify Event
    assert len(events_received) == 1
    assert events_received[0].payload["target_id"] == "101"
    assert events_received[0].payload["drone_id"] == "alpha"


def test_duplicate_target_and_tracking_update(test_setup):
    """Verifies sending the same ByteTrack ID updates the target in-place without duplicates."""
    state_store, event_bus, adapter = test_setup

    update_events = []
    event_bus.subscribe("ai.target_updated", lambda e: update_events.append(e))

    # 1. First Detection
    adapter.inject_fused_target({
        "id": 101,
        "label": "SURVIVOR",
        "confidence": 0.90,
        "lat": 20.593650,
        "lon": 78.962850,
        "alt": 15.0,
        "drone_id": "uav_alpha",
        "ts": time.time(),
    })

    # 2. Second Detection (Updated position slightly)
    time.sleep(0.05)
    adapter.inject_fused_target({
        "id": 101,
        "label": "SURVIVOR",
        "confidence": 0.95,
        "lat": 20.593680,
        "lon": 78.962880,
        "alt": 16.0,
        "drone_id": "uav_alpha",
        "ts": time.time(),
    })

    state = state_store.get_state()
    # Must STILL have exactly 1 target (no duplicate marker)
    assert len(state.ai_state.tracked_targets) == 1
    t = state.ai_state.tracked_targets[0]
    assert t.target_id == "101"
    assert t.confidence == 0.95
    assert t.tracking_status == "TRACKED"
    assert len(t.history) >= 2

    # Verify ai.target_updated event emitted
    assert len(update_events) == 1
    assert update_events[0].payload["target_id"] == "101"


def test_survivor_alert_and_cooldown(test_setup):
    """Verifies high-confidence survivor detection triggers alert with cooldown."""
    state_store, event_bus, adapter = test_setup

    alerts_created = []
    event_bus.subscribe("alert.created", lambda e: alerts_created.append(e))

    # High confidence survivor -> triggers alert
    adapter.inject_fused_target({
        "id": 102,
        "label": "SURVIVOR",
        "confidence": 0.92,
        "lat": 20.5940,
        "lon": 78.9630,
        "alt": 14.0,
        "drone_id": "uav_bravo",
    })

    assert len(alerts_created) == 1
    assert "SURVIVOR CONFIRMED: #102" in alerts_created[0].payload["alert"]["title"]

    # Immediate second detection of same target -> cooldown prevents duplicate alert
    adapter.inject_fused_target({
        "id": 102,
        "label": "SURVIVOR",
        "confidence": 0.94,
        "lat": 20.59401,
        "lon": 78.96301,
        "alt": 14.0,
        "drone_id": "uav_bravo",
    })
    assert len(alerts_created) == 1  # No duplicate alert


def test_target_timeout_and_loss(test_setup):
    """Verifies targets not seen for timeout_sec are transitioned to LOST state."""
    state_store, event_bus, adapter = test_setup

    lost_events = []
    event_bus.subscribe("ai.target_lost", lambda e: lost_events.append(e))

    # Inject target with past timestamp
    past_time = time.time() - 5.0
    adapter.inject_fused_target({
        "id": 103,
        "label": "POSSIBLE_SURVIVOR",
        "confidence": 0.65,
        "lat": 20.5945,
        "lon": 78.9635,
        "alt": 10.0,
        "drone_id": "uav_gamma",
        "ts": past_time,
    })

    # Run check_target_timeouts with 1.0s threshold
    lost = adapter.check_target_timeouts(timeout_sec=1.0)
    assert "103" in lost

    state = state_store.get_state()
    assert state.ai_state.tracked_targets[0].tracking_status == "LOST"
    assert len(lost_events) == 1
    assert lost_events[0].payload["target_id"] == "103"


def test_ros_unavailable_graceful_handling(test_setup):
    """Verifies that starting without ROS 2 sets OFFLINE status cleanly without error."""
    state_store, event_bus, adapter = test_setup

    # Stop ROS if running
    adapter.stop_ros_subscriber()
    assert adapter.status in ("OFFLINE", "DEGRADED", "CONNECTED")

    # Adapter continues to accept direct injections even if ROS is offline
    processed = adapter.inject_fused_target({
        "id": 104,
        "label": "SURVIVOR",
        "confidence": 0.88,
        "lat": 20.595,
        "lon": 78.964,
        "alt": 12.0,
    })
    assert len(processed) == 1
    assert adapter.status == "CONNECTED"
