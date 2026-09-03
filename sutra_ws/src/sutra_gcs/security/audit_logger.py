"""
Smart Horizon GCS — Production Security & Operational Command Audit Logger
Subsystem: Security & Governance (Phase 13)
"""

import json
import logging
import threading
import time
from collections import deque
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
from .secret_manager import SecretManager
from .security_config import get_security_config

logger = logging.getLogger("sutra_gcs.security.audit")


@dataclass
class AuditRecord:
    timestamp: float
    user_id: str
    username: str
    role: str
    session_id: str
    command_id: str
    command_type: str
    target_drone: Optional[str]
    parameters_safe: Dict[str, Any]
    permission: str
    authorization_result: str  # "AUTHORIZED", "DENIED", "REJECTED"
    execution_result: str      # "SUCCESS", "FAILED", "REJECTED"
    failure_reason: Optional[str] = None
    severity: str = "INFO"     # "INFO", "WARNING", "CRITICAL", "EMERGENCY"


class SecurityAuditLogger:
    """
    Immutable, bounded operational command audit logger ensuring regulatory compliance
    and forensic traceability. Automatically redacts credentials and secrets.
    """

    def __init__(self, log_dir: Optional[Path] = None):
        self.config = get_security_config()
        self._lock = threading.Lock()
        self._records: deque = deque(maxlen=self.config.audit_max_memory_records)

        # Setup audit file storage
        self.log_dir = log_dir or Path(self.config.environment.lower() + "_audit_logs")
        try:
            self.log_dir.mkdir(parents=True, exist_ok=True)
            self._log_file = self.log_dir / "operational_audit.jsonl"
        except Exception:
            self._log_file = None

    def log_event(
        self,
        user_id: str,
        username: str,
        role: str,
        session_id: str,
        command_id: str,
        command_type: str,
        permission: str,
        authorization_result: str,
        execution_result: str,
        parameters: Optional[Dict[str, Any]] = None,
        target_drone: Optional[str] = None,
        failure_reason: Optional[str] = None,
        severity: str = "INFO",
    ) -> AuditRecord:
        """Records an audit event with sanitized parameters."""
        safe_params = SecretManager.redact_data(parameters or {})
        now = time.time()

        record = AuditRecord(
            timestamp=now,
            user_id=user_id or "ANONYMOUS",
            username=username or "ANONYMOUS",
            role=role or "NONE",
            session_id=session_id or "NONE",
            command_id=command_id or "UNKNOWN",
            command_type=command_type,
            target_drone=target_drone,
            parameters_safe=safe_params,
            permission=permission or "NONE",
            authorization_result=authorization_result,
            execution_result=execution_result,
            failure_reason=failure_reason,
            severity=severity,
        )

        with self._lock:
            self._records.append(record)

        # Persist to disk
        if self._log_file:
            try:
                with open(self._log_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(asdict(record)) + "\n")
            except Exception as e:
                logger.error(f"Failed to append to audit log file: {e}")
                if self.config.audit_failure_policy == "REJECT" and severity in ("CRITICAL", "EMERGENCY"):
                    raise RuntimeError(f"Audit log write failed under strict security policy: {e}")

        log_level = logging.WARNING if authorization_result == "DENIED" else logging.INFO
        logger.log(
            log_level,
            f"📋 AUDIT: [{record.severity}] user={record.username} role={record.role} cmd={record.command_type} "
            f"auth={record.authorization_result} exec={record.execution_result} reason={record.failure_reason or 'None'}",
        )
        return record

    def query(
        self,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        command_type: Optional[str] = None,
        authorization_result: Optional[str] = None,
        severity: Optional[str] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        search_text: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Searches and filters audit logs."""
        results = []
        with self._lock:
            snapshot = list(self._records)

        for rec in reversed(snapshot):
            if user_id and rec.user_id != user_id:
                continue
            if username and rec.username.lower() != username.lower():
                continue
            if command_type and rec.command_type.lower() != command_type.lower():
                continue
            if authorization_result and rec.authorization_result != authorization_result:
                continue
            if severity and rec.severity != severity:
                continue
            if start_time and rec.timestamp < start_time:
                continue
            if end_time and rec.timestamp > end_time:
                continue
            if search_text:
                q = search_text.lower()
                rec_str = f"{rec.username} {rec.command_type} {rec.target_drone or ''} {rec.failure_reason or ''}".lower()
                if q not in rec_str:
                    continue

            results.append(asdict(rec))
            if len(results) >= limit:
                break

        return results

    def clear_in_memory(self):
        """Clears memory records (for tests)."""
        with self._lock:
            self._records.clear()


security_audit_logger = SecurityAuditLogger()
