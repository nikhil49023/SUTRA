"""
Smart Horizon GCS — Authoritative Command Gateway
Subsystem: Security & Command Orchestration (Phase 13)
"""

import logging
import time
from typing import Any, Callable, Dict, Optional, Tuple
from security import (
    command_authorizer,
    input_validator,
    rate_limiter,
    security_audit_logger,
    SecurityEventType,
)
from services.event_bus import get_event_bus
from state.application_state import get_state_store

logger = logging.getLogger("sutra_gcs.backend.gateway")


class CommandGateway:
    """
    Central authoritative gateway. Guarantees that EVERY incoming operational command
    undergoes Message Size Validation -> Rate Limiting -> Authentication ->
    RBAC Authorization -> Input & Safety Validation -> Execution -> Audit Logging.
    """

    def __init__(self):
        self.state_store = get_state_store()
        self.event_bus = get_event_bus()

    def process_command(
        self,
        command_type: str,
        command_id: str,
        payload: Dict[str, Any],
        session_id: Optional[str] = None,
        auth_token: Optional[str] = None,
        correlation_id: Optional[str] = None,
        timestamp: Optional[float] = None,
        connection_id: Optional[str] = None,
        executor_func: Optional[Callable[[], Any]] = None,
    ) -> Tuple[str, Optional[Any], Optional[str], int]:
        """
        Processes an operational command through all security and authorization layers.
        Returns (status: 'ACCEPTED' | 'REJECTED' | 'FAILED', result, error_message, state_version).
        """
        corr_id = correlation_id or command_id
        cmd_time = timestamp or time.time()
        client_id = session_id or connection_id or "ANONYMOUS"

        # 1. Rate Limiting Check
        rate_cat = "commands"
        if command_type.startswith("mission.") or "WAYPOINT" in command_type:
            rate_cat = "mission_edits"
        elif command_type.startswith("gis."):
            rate_cat = "gis_analysis"
        elif command_type.startswith("ai."):
            rate_cat = "ai_requests"

        allowed, rate_err = rate_limiter.is_allowed(rate_cat, client_id)
        if not allowed:
            security_audit_logger.log_event(
                user_id="UNKNOWN",
                username="UNKNOWN",
                role="NONE",
                session_id=session_id or "NONE",
                command_id=command_id,
                command_type=command_type,
                permission="NONE",
                authorization_result="DENIED",
                execution_result="REJECTED",
                parameters=payload,
                failure_reason=rate_err,
                severity="WARNING",
            )
            return "REJECTED", None, rate_err, self.state_store.state_version

        # 2. Input & Payload Envelope Validation
        valid_payload, payload_err = input_validator.validate_command_payload(command_type, payload)
        if not valid_payload:
            security_audit_logger.log_event(
                user_id="UNKNOWN",
                username="UNKNOWN",
                role="NONE",
                session_id=session_id or "NONE",
                command_id=command_id,
                command_type=command_type,
                permission="NONE",
                authorization_result="REJECTED",
                execution_result="REJECTED",
                parameters=payload,
                failure_reason=payload_err,
                severity="WARNING",
            )
            return "REJECTED", None, payload_err, self.state_store.state_version

        # 3. RBAC & Security Authorization
        auth_decision = command_authorizer.authorize(
            command_type=command_type,
            command_id=command_id,
            payload=payload,
            session_id=session_id,
            auth_token=auth_token,
            timestamp=cmd_time,
        )

        if not auth_decision.authorized:
            security_audit_logger.log_event(
                user_id=auth_decision.user_id,
                username=auth_decision.username,
                role=auth_decision.role,
                session_id=auth_decision.session_id,
                command_id=command_id,
                command_type=command_type,
                permission=auth_decision.required_permission,
                authorization_result=auth_decision.status,
                execution_result="REJECTED",
                parameters=payload,
                failure_reason=auth_decision.reason,
                severity=auth_decision.severity,
            )
            return "REJECTED", None, auth_decision.reason, self.state_store.state_version

        # 4. Authoritative Execution
        exec_status = "ACCEPTED"
        exec_result = None
        exec_error = None

        if executor_func:
            try:
                exec_result = executor_func()
            except Exception as ex:
                exec_status = "FAILED"
                exec_error = str(ex)
                logger.error(f"Command execution error for {command_type}: {ex}", exc_info=True)

        # 5. Audit Logging
        security_audit_logger.log_event(
            user_id=auth_decision.user_id,
            username=auth_decision.username,
            role=auth_decision.role,
            session_id=auth_decision.session_id,
            command_id=command_id,
            command_type=command_type,
            target_drone=payload.get("drone_id"),
            parameters=payload,
            permission=auth_decision.required_permission,
            authorization_result="AUTHORIZED",
            execution_result=exec_status,
            failure_reason=exec_error,
            severity=auth_decision.severity,
        )

        return exec_status, exec_result, exec_error, self.state_store.state_version


command_gateway = CommandGateway()
