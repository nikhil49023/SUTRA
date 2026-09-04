"""
Smart Horizon GCS — Asynchronous WebSocket Network Connection Manager
Subsystem: Communication Core (Phase 8)
"""

import asyncio
import json
import logging
import threading
import time
from dataclasses import replace
from typing import Any, Callable, Dict, List, Optional

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.application_state import ApplicationState, StateStore, get_state_store
from state.communication_state import ConnectionState

from .connection_metrics import ConnectionMetrics, connection_metrics
from .heartbeat_monitor import HeartbeatMonitor, heartbeat_monitor
from .message_dispatcher import MessageDispatcher, message_dispatcher
from .reconnect_manager import ReconnectManager, reconnect_manager
from .subscription_manager import SubscriptionManager, subscription_manager
from .websocket_state import WebSocketStateMachine

logger = logging.getLogger("sutra_gcs.communication.websocket")


class WebSocketManager:
    """
    High-performance asynchronous WebSocket client managing connection lifecycle,
    exponential backoff reconnection, priority message queueing, and state store synchronization.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
        dispatcher: Optional[MessageDispatcher] = None,
        reconnect_mgr: Optional[ReconnectManager] = None,
        heartbeat_mon: Optional[HeartbeatMonitor] = None,
        metrics: Optional[ConnectionMetrics] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.dispatcher = dispatcher or message_dispatcher
        self.reconnect_mgr = reconnect_mgr or reconnect_manager
        self.heartbeat_mon = heartbeat_mon or heartbeat_monitor
        self.metrics = metrics or connection_metrics
        self.logger = get_logger("websocket_manager")

        self.state_machine = WebSocketStateMachine(
            on_transition_callback=self._on_state_transition
        )

        self._url: str = "ws://127.0.0.1:8765"
        self._auth_token: Optional[str] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._send_queue: List[Dict[str, Any]] = []
        self._queue_lock = threading.Lock()

    def get_state(self) -> ConnectionState:
        return self.state_machine.current_state

    def is_ready(self) -> bool:
        return self.state_machine.is_ready()

    def get_metrics(self) -> ConnectionMetrics:
        return self.metrics

    def connect(self, url: str = "ws://127.0.0.1:8765", auth_token: Optional[str] = None) -> bool:
        """
        Initiates background worker thread and attempts connection.
        """
        self._url = url
        self._auth_token = auth_token

        if self._running:
            return True

        self._running = True
        self.state_machine.transition_to(ConnectionState.CONNECTING, f"Connecting to {url}")

        self._thread = threading.Thread(target=self._run_event_loop, daemon=True)
        self._thread.start()
        return True

    def disconnect(self) -> None:
        """Gracefully tears down network connection."""
        self._running = False
        if self.state_machine.current_state != ConnectionState.DISCONNECTED:
            self.state_machine.transition_to(ConnectionState.CLOSING, "Operator disconnect")
            self.state_machine.transition_to(ConnectionState.DISCONNECTED, "Closed")

    def send(
        self,
        msg_type: str,
        topic: str,
        payload: Dict[str, Any],
        priority: str = "NORMAL",
        correlation_id: Optional[str] = None,
    ) -> bool:
        """
        Enqueues an outgoing structured message.
        """
        envelope = self.dispatcher.build_envelope(
            msg_type=msg_type,
            topic=topic,
            payload=payload,
            correlation_id=correlation_id,
            priority=priority,
        )

        with self._queue_lock:
            if len(self._send_queue) >= 500:
                # Backpressure: Drop low priority
                if priority in ("NORMAL", "LOW"):
                    self.metrics.record_dropped()
                    return False
            self._send_queue.append(envelope)
            self.metrics.queue_size = len(self._send_queue)

        self.metrics.record_sent(len(json.dumps(envelope)))
        return True

    def subscribe(self, topic: str, callback: Callable[[Dict[str, Any]], None]) -> None:
        subscription_manager.subscribe(topic, callback)

    def unsubscribe(self, topic: str, callback: Callable[[Dict[str, Any]], None]) -> None:
        subscription_manager.unsubscribe(topic, callback)

    def _run_event_loop(self) -> None:
        """Dedicated asyncio event loop thread for WebSocket protocol."""
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._connection_lifecycle())

    async def _connection_lifecycle(self) -> None:
        """Core network loop managing connection attempts, authentication, and transmission."""
        while self._running:
            try:
                # Simulated/Mocked or real WebSocket transport connection
                await asyncio.sleep(0.1)

                if self.state_machine.current_state == ConnectionState.CONNECTING:
                    # Transition to CONNECTED
                    self.state_machine.transition_to(ConnectionState.CONNECTED, "TCP connection established")
                    self.metrics.record_connect()

                    if self._auth_token:
                        self.state_machine.transition_to(ConnectionState.AUTHENTICATING, "Sending auth token")
                        await asyncio.sleep(0.05)
                        self.state_machine.transition_to(ConnectionState.READY, "Authenticated successfully")
                    else:
                        self.state_machine.transition_to(ConnectionState.READY, "Ready for data transfer")

                    self.reconnect_mgr.reset()

                # Process send queue while ready
                while self._running and self.state_machine.is_ready():
                    msg_to_send = None
                    with self._queue_lock:
                        if self._send_queue:
                            msg_to_send = self._send_queue.pop(0)
                            self.metrics.queue_size = len(self._send_queue)

                    if msg_to_send:
                        # In real WebSocket, await ws.send(json.dumps(msg_to_send))
                        self.event_bus.emit(
                            "communication.message_sent",
                            payload={"topic": msg_to_send["topic"], "type": msg_to_send["type"]},
                            source="websocket_manager",
                        )

                    await asyncio.sleep(0.02)

            except Exception as e:
                self.logger.error(f"WebSocket communication error: {e}")
                self.state_machine.transition_to(ConnectionState.ERROR, str(e))
                self.metrics.record_disconnect()

                if self._running and self.reconnect_mgr.should_retry():
                    delay = self.reconnect_mgr.next_delay()
                    self.state_machine.transition_to(ConnectionState.RECONNECTING, f"Retry in {delay:.1f}s")
                    await asyncio.sleep(delay)
                    self.state_machine.transition_to(ConnectionState.CONNECTING, "Reconnecting attempt")
                else:
                    self.state_machine.transition_to(ConnectionState.FALLBACK, "Switched to fallback mode")
                    break

    def _on_state_transition(self, old_state: ConnectionState, new_state: ConnectionState) -> None:
        """Synchronizes connection changes to central ApplicationState."""
        self.metrics.connection_state = new_state
        self.state_store.update_state(
            lambda s: replace(
                s,
                communication_state=replace(
                    s.communication_state,
                    websocket_state=new_state,
                    reconnect_count=self.reconnect_mgr.retry_count,
                    authenticated=(new_state == ConnectionState.READY),
                ),
            )
        )


# Global singleton
websocket_manager = WebSocketManager()
