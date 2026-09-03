"""
Smart Horizon GCS — Connection & WebSocket Deterministic State Machine
Subsystem: Communication Core (Phase 8)
"""

import logging
from typing import Callable, Dict, Optional, Set

from services.event_bus import EventBus, get_event_bus
from state.communication_state import ConnectionState, VALID_TRANSITIONS

logger = logging.getLogger("sutra_gcs.communication.state_machine")


class WebSocketStateMachine:
    """
    Guarantees deterministic lifecycle transitions for communication endpoints.
    Rejects invalid state jumps and emits audit events.
    """

    def __init__(
        self,
        initial_state: ConnectionState = ConnectionState.DISCONNECTED,
        event_bus: Optional[EventBus] = None,
        on_transition_callback: Optional[Callable[[ConnectionState, ConnectionState], None]] = None,
    ) -> None:
        self._current_state = initial_state
        self.event_bus = event_bus or get_event_bus()
        self.on_transition = on_transition_callback
        self.logger = logger

    @property
    def current_state(self) -> ConnectionState:
        return self._current_state

    def is_connected(self) -> bool:
        return self._current_state in (ConnectionState.CONNECTED, ConnectionState.AUTHENTICATING, ConnectionState.READY)

    def is_ready(self) -> bool:
        return self._current_state == ConnectionState.READY

    def transition_to(self, target_state: ConnectionState, reason: str = "") -> bool:
        """
        Attempts to transition to a new state.
        Returns True if successful, False if rejected.
        """
        valid_next_states = VALID_TRANSITIONS.get(self._current_state, set())
        if target_state not in valid_next_states:
            self.logger.warning(
                f"REJECTED invalid state transition: {self._current_state.value} -> {target_state.value} (Reason: {reason})"
            )
            return False

        old_state = self._current_state
        self._current_state = target_state
        self.logger.info(f"State transition: {old_state.value} -> {target_state.value} [{reason}]")

        # Notify callback if provided
        if self.on_transition:
            try:
                self.on_transition(old_state, target_state)
            except Exception as e:
                self.logger.error(f"Error in on_transition callback: {e}")

        # Emit standard EventBus event
        event_map = {
            ConnectionState.CONNECTING: "communication.connecting",
            ConnectionState.CONNECTED: "communication.connected",
            ConnectionState.AUTHENTICATING: "communication.authenticated",
            ConnectionState.READY: "communication.ready",
            ConnectionState.DISCONNECTED: "communication.disconnected",
            ConnectionState.RECONNECTING: "communication.reconnecting",
            ConnectionState.TIMEOUT: "communication.timeout",
            ConnectionState.ERROR: "communication.error",
        }

        if target_state in event_map:
            self.event_bus.emit(
                event_map[target_state],
                payload={"from_state": old_state.value, "to_state": target_state.value, "reason": reason},
                source="websocket_state_machine",
            )

        return True


# Backward-compatible global singleton
state_machine = WebSocketStateMachine()
