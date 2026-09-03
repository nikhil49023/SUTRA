"""
Smart Horizon GCS — Operational Command Audit Logger
Subsystem: Security & Governance (Phase 12 Production Hardening)
"""

import json
import logging
import threading
import time
from collections import deque
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("sutra_gcs.audit")


@dataclass(frozen=True)
class AuditEntry:
    """
    Immutable audit record for every operational command executed on the system.
    """

    audit_id: str
    command_id: str
    command_type: str
    user: str
    target: str
    timestamp: float
    result: str  # "ACCEPTED", "REJECTED", "COMPLETED", "FAILED"
    reason: Optional[str] = None
    state_version: Optional[int] = None
    payload_summary: Optional[Dict[str, Any]] = None


class AuditLogger:
    """
    Thread-safe operational audit logger with bounded memory history and structured logging.
    """

    def __init__(self, max_records: int = 2000, log_file: Optional[Path] = None):
        self._records: deque = deque(maxlen=max_records)
        self._lock = threading.RLock()
        self._log_file = log_file

    def log_command(
        self,
        command_id: str,
        command_type: str,
        user: str,
        target: str,
        result: str,
        reason: Optional[str] = None,
        state_version: Optional[int] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> AuditEntry:
        """
        Records an authoritative command audit entry.
        Never logs sensitive credentials or private keys.
        """
        import uuid

        # Sanitize payload for logging
        safe_payload = None
        if payload and isinstance(payload, dict):
            safe_payload = {
                k: v for k, v in payload.items()
                if not any(secret in k.lower() for secret in ["secret", "password", "token", "key"])
            }

        entry = AuditEntry(
            audit_id=str(uuid.uuid4()),
            command_id=command_id,
            command_type=command_type,
            user=user,
            target=target,
            timestamp=time.time(),
            result=result,
            reason=reason,
            state_version=state_version,
            payload_summary=safe_payload,
        )

        with self._lock:
            self._records.append(entry)

        logger.info(
            f"🛡️ [AUDIT] user='{user}' cmd='{command_type}' id='{command_id}' target='{target}' result='{result}' reason='{reason or 'OK'}'"
        )
        return entry

    def get_recent_entries(self, limit: int = 100) -> List[Dict[str, Any]]:
        with self._lock:
            return [asdict(r) for r in list(self._records)[-limit:]]


# Global singleton instance
_global_audit_logger: Optional[AuditLogger] = None


def get_audit_logger() -> AuditLogger:
    global _global_audit_logger
    if _global_audit_logger is None:
        _global_audit_logger = AuditLogger()
    return _global_audit_logger


audit_logger = get_audit_logger()
