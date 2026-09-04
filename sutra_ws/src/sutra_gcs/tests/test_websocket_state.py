"""
Smart Horizon GCS — WebSocket & Network Connection State Machine Unit Tests
Subsystem: Test Suite (Phase 8)
"""

import pytest
from communication.core.websocket_state import WebSocketStateMachine
from services.event_bus import EventBus
from state.communication_state import ConnectionState


def test_valid_connection_state_lifecycle():
    """Verify nominal sequence: DISCONNECTED -> CONNECTING -> CONNECTED -> AUTHENTICATING -> READY -> CLOSING -> DISCONNECTED."""
    event_bus = EventBus()
    sm = WebSocketStateMachine(event_bus=event_bus)

    assert sm.current_state == ConnectionState.DISCONNECTED

    # 1. Connect
    assert sm.transition_to(ConnectionState.CONNECTING, "Starting connection") is True
    assert sm.current_state == ConnectionState.CONNECTING

    # 2. TCP Connected
    assert sm.transition_to(ConnectionState.CONNECTED, "Socket open") is True
    assert sm.current_state == ConnectionState.CONNECTED

    # 3. Authenticating
    assert sm.transition_to(ConnectionState.AUTHENTICATING, "Sending token") is True
    assert sm.current_state == ConnectionState.AUTHENTICATING

    # 4. Ready
    assert sm.transition_to(ConnectionState.READY, "Handshake complete") is True
    assert sm.current_state == ConnectionState.READY
    assert sm.is_ready() is True

    # 5. Graceful Close
    assert sm.transition_to(ConnectionState.CLOSING, "Disconnecting") is True
    assert sm.transition_to(ConnectionState.DISCONNECTED, "Clean close") is True
    assert sm.current_state == ConnectionState.DISCONNECTED


def test_invalid_state_transition_rejection():
    """Verify that illegal transitions (e.g. DISCONNECTED directly to READY) are strictly rejected."""
    sm = WebSocketStateMachine()
    assert sm.current_state == ConnectionState.DISCONNECTED

    # Attempt illegal jump
    assert sm.transition_to(ConnectionState.READY, "Illegal jump") is False
    assert sm.current_state == ConnectionState.DISCONNECTED

    assert sm.transition_to(ConnectionState.AUTHENTICATING, "Illegal jump") is False
    assert sm.current_state == ConnectionState.DISCONNECTED
