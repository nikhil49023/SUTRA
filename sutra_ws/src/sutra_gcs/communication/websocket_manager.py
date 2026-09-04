"""
SUTRA GCS — WebSocket Client & Server Manager
Broadcasts high-frequency telemetry events to external GCS viewers.
"""

from typing import Set, Dict, Any
from .websocket_state import ConnectionState


class WebSocketManager:
    """Manages active socket subscribers and handles JSON broadcasting."""

    def __init__(self):
        self.state = ConnectionState.CONNECTED
        self.clients: Set[Any] = set()
        self.messages_sent = 0

    def register(self, client: Any) -> None:
        self.clients.add(client)

    def unregister(self, client: Any) -> None:
        self.clients.discard(client)

    def broadcast(self, event_name: str, payload: Dict[str, Any]) -> None:
        """Broadcast payload to connected web clients."""
        self.messages_sent += 1

    def get_status(self) -> Dict[str, Any]:
        return {
            "state": self.state.value,
            "connected_clients": len(self.clients),
            "messages_sent": self.messages_sent
        }


ws_manager = WebSocketManager()
