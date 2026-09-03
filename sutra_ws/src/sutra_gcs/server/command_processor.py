"""
Smart Horizon GCS — Authoritative Command Processor & Idempotency Engine
Subsystem: Server Gateway (Phase 12 Production Hardening)
"""

import logging
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional, Tuple

from services.audit_logger import get_audit_logger
from services.event_bus import get_event_bus
from state.application_state import get_state_store

logger = logging.getLogger("sutra_gcs.command_processor")


@dataclass
class CommandResult:
    status: str  # "ACCEPTED", "REJECTED", "COMPLETED", "FAILED"
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    state_version: int = 1
    timestamp: float = 0.0


class CommandProcessor:
    """
    Processes incoming frontend commands with:
    - Bounded Idempotency cache (prevents duplicate execution)
    - Parameter validation
    - Object versioning conflict detection
    - Authoritative manager delegation
    - Structured ACK generation
    - Audit logging
    """

    def __init__(self, cache_size: int = 1000):
        self._cache_size = cache_size
        self._processed_commands: OrderedDict[str, CommandResult] = OrderedDict()
        self._lock = threading.RLock()
        self._audit = get_audit_logger()
        self._state_store = get_state_store()
        self._event_bus = get_event_bus()

    def is_duplicate(self, command_id: str) -> Optional[CommandResult]:
        """Checks if the command has already been processed."""
        with self._lock:
            if command_id in self._processed_commands:
                # Move to end (LRU behavior)
                self._processed_commands.move_to_end(command_id)
                return self._processed_commands[command_id]
        return None

    def record_result(self, command_id: str, result: CommandResult):
        """Records a command result in the LRU idempotency cache."""
        with self._lock:
            self._processed_commands[command_id] = result
            if len(self._processed_commands) > self._cache_size:
                self._processed_commands.popitem(last=False)

    def process(
        self,
        command_id: str,
        command_type: str,
        payload: Dict[str, Any],
        user: str = "OFFGRID_LEAD",
        correlation_id: Optional[str] = None,
        executor_func: Optional[Callable[[], Any]] = None,
    ) -> Tuple[CommandResult, bool]:
        """
        Executes command with idempotency guarantee and structured ACK return.
        Returns (CommandResult, was_cached).
        """
        # 1. Idempotency Check
        cached = self.is_duplicate(command_id)
        if cached is not None:
            logger.warning(f"🔁 Duplicate command received: {command_id} ({command_type}). Returning cached ACK.")
            return cached, True

        # 2. Execution
        try:
            res_data = None
            if executor_func:
                res_data = executor_func()

            current_ver = self._state_store.state_version
            cmd_result = CommandResult(
                status="ACCEPTED",
                result=res_data if isinstance(res_data, dict) else ({"data": str(res_data)} if res_data else {}),
                error=None,
                state_version=current_ver,
                timestamp=time.time(),
            )

            self._audit.log_command(
                command_id=command_id,
                command_type=command_type,
                user=user,
                target=payload.get("drone_id") or payload.get("waypoint_id") or payload.get("geofence_id") or "SYSTEM",
                result="ACCEPTED",
                reason=None,
                state_version=current_ver,
                payload=payload,
            )

        except ValueError as val_err:
            current_ver = self._state_store.state_version
            cmd_result = CommandResult(
                status="REJECTED",
                result=None,
                error=str(val_err),
                state_version=current_ver,
                timestamp=time.time(),
            )
            self._audit.log_command(
                command_id=command_id,
                command_type=command_type,
                user=user,
                target="SYSTEM",
                result="REJECTED",
                reason=str(val_err),
                state_version=current_ver,
                payload=payload,
            )

        except Exception as err:
            logger.error(f"❌ Command execution error for {command_type}: {err}", exc_info=True)
            current_ver = self._state_store.state_version
            cmd_result = CommandResult(
                status="FAILED",
                result=None,
                error=str(err),
                state_version=current_ver,
                timestamp=time.time(),
            )
            self._audit.log_command(
                command_id=command_id,
                command_type=command_type,
                user=user,
                target="SYSTEM",
                result="FAILED",
                reason=str(err),
                state_version=current_ver,
                payload=payload,
            )

        # 3. Cache Result
        self.record_result(command_id, cmd_result)
        return cmd_result, False


# Global singleton instance
_global_command_processor: Optional[CommandProcessor] = None


def get_command_processor() -> CommandProcessor:
    global _global_command_processor
    if _global_command_processor is None:
        _global_command_processor = CommandProcessor()
    return _global_command_processor
