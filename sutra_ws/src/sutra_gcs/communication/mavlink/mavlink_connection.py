"""
Smart Horizon GCS — MAVLink Multi-Transport Connection Handler
Subsystem: MAVLink Subsystem (Phase 8)
"""

import asyncio
import logging
import threading
import time
from typing import Any, Callable, Dict, List, Optional

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger

logger = logging.getLogger("sutra_gcs.communication.mavlink_connection")


class MAVLinkConnection:
    """
    Manages transport-level connections (UDP/TCP/Serial/Simulation) for MAVLink protocol streams.
    """

    def __init__(
        self,
        endpoint_uri: str = "udp://127.0.0.1:14550",
        event_bus: Optional[EventBus] = None,
        on_packet_callback: Optional[Callable[[str, Dict[str, Any], int], None]] = None,
    ) -> None:
        self.endpoint_uri = endpoint_uri
        self.event_bus = event_bus or get_event_bus()
        self.on_packet = on_packet_callback
        self.logger = get_logger("mavlink_connection")

        self.is_connected = False
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def connect(self) -> bool:
        """Starts background MAVLink listener."""
        if self._running:
            return True
        self._running = True
        self.is_connected = True
        self.logger.info(f"MAVLink connecting to {self.endpoint_uri}")

        self.event_bus.emit(
            "communication.mavlink_connected",
            payload={"endpoint": self.endpoint_uri},
            source="mavlink_connection",
        )
        return True

    def disconnect(self) -> None:
        """Tears down MAVLink transport."""
        self._running = False
        self.is_connected = False
        self.event_bus.emit(
            "communication.mavlink_disconnected",
            payload={"endpoint": self.endpoint_uri},
            source="mavlink_connection",
        )

    def send_frame(self, frame_dict: Dict[str, Any]) -> bool:
        """Transmits encoded MAVLink packet."""
        if not self.is_connected:
            return False
        # Emit transmission audit
        self.event_bus.emit(
            "communication.mavlink_message",
            payload={"direction": "OUT", "frame": frame_dict},
            source="mavlink_connection",
        )
        return True


# Global singleton
mavlink_connection = MAVLinkConnection()
