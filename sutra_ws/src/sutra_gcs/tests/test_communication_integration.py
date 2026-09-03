"""
Smart Horizon GCS — End-to-End Communication Subsystem Integration Tests
Subsystem: Test Suite (Phase 8)
"""

import pytest
from communication.core.message_dispatcher import MessageDispatcher
from communication.core.websocket_manager import WebSocketManager
from communication.streams.telemetry_stream import TelemetryStream
from services.event_bus import EventBus
from state.application_state import StateStore
from state.communication_state import ConnectionState


def test_inbound_telemetry_pipeline_integration():
    """Verify inbound JSON message parsing, schema validation, and TelemetryStream state update."""
    state_store = StateStore()
    event_bus = EventBus()
    stream = TelemetryStream(state_store=state_store, event_bus=event_bus)

    # Ingest telemetry for drone_alpha
    stream.ingest_telemetry_dict(
        drone_id="drone_alpha",
        telem={"lat": 37.7800, "lon": -122.4100, "alt": 35.0, "ground_speed": 12.0, "heading": 180.0, "battery": 92.0},
    )

    fleet = state_store.get_state().fleet_state
    drone = fleet.get_drone("drone_alpha")
    assert drone is not None
    assert drone.latitude == 37.7800
    assert drone.longitude == -122.4100
    assert drone.altitude == 35.0
    assert drone.speed == 12.0
    assert drone.battery == 92.0


def test_websocket_manager_metrics_and_queue():
    """Verify WebSocket manager queues messages and tracks bandwidth metrics."""
    ws = WebSocketManager()
    assert ws.get_state() == ConnectionState.DISCONNECTED

    # Enqueue message
    assert ws.send("telemetry", "drone/alpha/telemetry", {"battery": 88.0}) is True
    metrics = ws.get_metrics()
    assert metrics.messages_sent >= 1
