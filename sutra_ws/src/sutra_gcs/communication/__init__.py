"""
Smart Horizon GCS — Production Communication, WebSocket State & MAVLink Package
"""

from .core.websocket_state import WebSocketStateMachine, state_machine
from .core.connection_metrics import ConnectionMetrics, connection_metrics
from .core.reconnect_manager import ReconnectManager, reconnect_manager
from .core.heartbeat_monitor import HeartbeatMonitor, heartbeat_monitor
from .core.subscription_manager import SubscriptionManager, subscription_manager
from .core.message_dispatcher import MessageDispatcher, message_dispatcher
from .core.websocket_manager import WebSocketManager, websocket_manager
from .core.connection_manager import ConnectionManager, connection_manager

from .mavlink.mavlink_messages import MAVType, MAVAutopilot, MAVModeFlag, MAVCmd
from .mavlink.mavlink_parser import MAVLinkParser, mavlink_parser
from .mavlink.mavlink_encoder import MAVLinkEncoder, mavlink_encoder
from .mavlink.mavlink_connection import MAVLinkConnection, mavlink_connection
from .mavlink.mavlink_router import MAVLinkRouter, mavlink_router

from .adapters.autopilot_adapter import AutopilotAdapter
from .adapters.px4_adapter import PX4Adapter, px4_adapter
from .adapters.ardupilot_adapter import ArduPilotAdapter, ardupilot_adapter

from .streams.telemetry_stream import TelemetryStream, telemetry_stream
from .streams.command_stream import CommandStream, CommandStatus, command_stream
from .streams.mission_stream import MissionStream, mission_stream

from .simulation.communication_simulator import CommunicationSimulator, communication_simulator

__all__ = [
    "WebSocketStateMachine",
    "state_machine",
    "ConnectionMetrics",
    "connection_metrics",
    "ReconnectManager",
    "reconnect_manager",
    "HeartbeatMonitor",
    "heartbeat_monitor",
    "SubscriptionManager",
    "subscription_manager",
    "MessageDispatcher",
    "message_dispatcher",
    "WebSocketManager",
    "websocket_manager",
    "ConnectionManager",
    "connection_manager",
    "MAVType",
    "MAVAutopilot",
    "MAVModeFlag",
    "MAVCmd",
    "MAVLinkParser",
    "mavlink_parser",
    "MAVLinkEncoder",
    "mavlink_encoder",
    "MAVLinkConnection",
    "mavlink_connection",
    "MAVLinkRouter",
    "mavlink_router",
    "AutopilotAdapter",
    "PX4Adapter",
    "px4_adapter",
    "ArduPilotAdapter",
    "ardupilot_adapter",
    "TelemetryStream",
    "telemetry_stream",
    "CommandStream",
    "CommandStatus",
    "command_stream",
    "MissionStream",
    "mission_stream",
    "CommunicationSimulator",
    "communication_simulator",
]
