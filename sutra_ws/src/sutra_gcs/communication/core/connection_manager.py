"""
Smart Horizon GCS — Master Hardware & Telemetry Link Connection Coordinator
Subsystem: Communication Core (Phase 8)
"""

from typing import Dict, Optional

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.application_state import ApplicationState, StateStore, get_state_store
from state.communication_state import ConnectionState

from .connection_metrics import ConnectionMetrics, connection_metrics
from .websocket_manager import WebSocketManager, websocket_manager


class ConnectionManager:
    """
    Coordinates simultaneous transport interfaces (Simulation, WebSocket, UDP/TCP MAVLink)
    and unifies link health reporting.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
        ws_manager: Optional[WebSocketManager] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.ws_manager = ws_manager or websocket_manager
        self.logger = get_logger("connection_manager")

    def set_connection_mode(self, mode: str) -> None:
        """Configures active hardware/telemetry connection mode."""
        self.logger.info(f"Setting connection mode: {mode}")
        from dataclasses import replace
        self.state_store.update_state(
            lambda s: replace(
                s,
                communication_state=replace(s.communication_state, connection_mode=mode),
            )
        )


# Global singleton
connection_manager = ConnectionManager()
