"""
Smart Horizon GCS — Production Communication & MAVLink State Model
Subsystem: State Management (Phase 8)
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple


class ConnectionState(str, Enum):
    """
    Deterministic finite state machine states for network & WebSocket communication.
    """

    DISCONNECTED = "DISCONNECTED"
    CONNECTING = "CONNECTING"
    AUTHENTICATING = "AUTHENTICATING"
    CONNECTED = "CONNECTED"
    READY = "READY"
    RECONNECTING = "RECONNECTING"
    TIMEOUT = "TIMEOUT"
    ERROR = "ERROR"
    FALLBACK = "FALLBACK"
    CLOSING = "CLOSING"


# Strict State Transition Validation Table
VALID_TRANSITIONS: Dict[ConnectionState, Set[ConnectionState]] = {
    ConnectionState.DISCONNECTED: {ConnectionState.CONNECTING},
    ConnectionState.CONNECTING: {ConnectionState.CONNECTED, ConnectionState.ERROR, ConnectionState.CLOSING},
    ConnectionState.CONNECTED: {ConnectionState.AUTHENTICATING, ConnectionState.READY, ConnectionState.ERROR, ConnectionState.CLOSING},
    ConnectionState.AUTHENTICATING: {ConnectionState.READY, ConnectionState.ERROR, ConnectionState.CLOSING},
    ConnectionState.READY: {ConnectionState.RECONNECTING, ConnectionState.TIMEOUT, ConnectionState.CLOSING, ConnectionState.ERROR},
    ConnectionState.RECONNECTING: {ConnectionState.CONNECTING, ConnectionState.FALLBACK, ConnectionState.CLOSING, ConnectionState.ERROR},
    ConnectionState.TIMEOUT: {ConnectionState.RECONNECTING, ConnectionState.FALLBACK, ConnectionState.CLOSING},
    ConnectionState.ERROR: {ConnectionState.RECONNECTING, ConnectionState.FALLBACK, ConnectionState.CLOSING, ConnectionState.DISCONNECTED},
    ConnectionState.FALLBACK: {ConnectionState.CONNECTING, ConnectionState.CLOSING, ConnectionState.DISCONNECTED},
    ConnectionState.CLOSING: {ConnectionState.DISCONNECTED},
}


@dataclass(frozen=True)
class CommunicationState:
    """
    Single source of truth for telemetry links, WebSocket lifecycle, MAVLink connections,
    heartbeat health, and latency statistics.
    """

    websocket_state: ConnectionState = ConnectionState.DISCONNECTED
    mavlink_state: str = "DISCONNECTED"  # DISCONNECTED, CONNECTING, CONNECTED, ACTIVE
    authenticated: bool = False
    heartbeat_ok: bool = True
    latency_ms: float = 0.0
    reconnect_count: int = 0
    messages_sent: int = 0
    messages_received: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    last_error: Optional[str] = None
    active_connections: Dict[str, str] = field(default_factory=dict)
    connection_mode: str = "SIMULATION"  # SIMULATION, WEBSOCKET, MAVLINK_UDP, MAVLINK_TCP, MAVLINK_SERIAL


communication_state = CommunicationState()
