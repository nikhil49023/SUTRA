"""
Smart Horizon GCS — Asynchronous Command ACK Correlation Stream
Subsystem: Communication Streams (Phase 8)
"""

import time
import uuid
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional

from services.event_bus import EventBus, get_event_bus


class CommandStatus(str, Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    FAILED = "FAILED"
    TIMEOUT = "TIMEOUT"


@dataclass
class PendingCommand:
    command_id: int
    correlation_id: str
    target_system: int
    status: CommandStatus
    sent_time: float
    timeout_sec: float = 3.0


class CommandStream:
    """
    Manages asynchronous flight commands and correlates MAVLink COMMAND_ACK response packets.
    """

    def __init__(self, event_bus: Optional[EventBus] = None) -> None:
        self.event_bus = event_bus or get_event_bus()
        self._pending: Dict[str, PendingCommand] = {}

    def dispatch_command(
        self,
        command_id: int,
        target_system: int = 1,
        params: Optional[Dict[str, float]] = None,
        timeout_sec: float = 3.0,
    ) -> str:
        """Enqueues and registers a new command with unique correlation UUID."""
        corr_id = str(uuid.uuid4())
        cmd = PendingCommand(
            command_id=command_id,
            correlation_id=corr_id,
            target_system=target_system,
            status=CommandStatus.SENT,
            sent_time=time.time(),
            timeout_sec=timeout_sec,
        )
        self._pending[corr_id] = cmd

        self.event_bus.emit(
            "communication.command_sent",
            payload={"correlation_id": corr_id, "command_id": command_id, "target_system": target_system},
            source="command_stream",
        )
        return corr_id

    def handle_ack(self, command_id: int, result_code: int, target_system: int = 1) -> Optional[PendingCommand]:
        """Correlates an incoming COMMAND_ACK message to pending commands."""
        # Find matching command
        for corr_id, cmd in list(self._pending.items()):
            if cmd.command_id == command_id and cmd.target_system == target_system and cmd.status == CommandStatus.SENT:
                if result_code == 0:  # MAV_RESULT_ACCEPTED
                    cmd.status = CommandStatus.ACKNOWLEDGED
                    self.event_bus.emit(
                        "communication.command_ack",
                        payload={"correlation_id": corr_id, "result": "ACCEPTED"},
                        source="command_stream",
                    )
                else:
                    cmd.status = CommandStatus.FAILED
                    self.event_bus.emit(
                        "communication.command_failed",
                        payload={"correlation_id": corr_id, "result_code": result_code},
                        source="command_stream",
                    )
                return cmd
        return None

    def get_status(self, correlation_id: str) -> CommandStatus:
        if correlation_id in self._pending:
            cmd = self._pending[correlation_id]
            if cmd.status == CommandStatus.SENT and time.time() - cmd.sent_time > cmd.timeout_sec:
                cmd.status = CommandStatus.TIMEOUT
            return cmd.status
        return CommandStatus.FAILED


# Global singleton
command_stream = CommandStream()
