"""
Smart Horizon GCS — Authoritative Command Authorization & Emergency Guard
Subsystem: Security & Governance (Phase 13)
"""

import logging
import time
from collections import deque
from dataclasses import dataclass
from typing import Any, Dict, Optional, Set, Tuple
from .rbac_manager import UserRole, rbac_manager
from .permission_manager import Permission
from .session_manager import Session, session_manager
from .security_config import get_security_config
from .security_events import SecurityEventType
from services.event_bus import get_event_bus

logger = logging.getLogger("sutra_gcs.security.authorizer")


@dataclass
class AuthorizationDecision:
    authorized: bool
    status: str             # "AUTHORIZED", "DENIED", "REJECTED"
    required_permission: str
    user_id: str
    username: str
    role: str
    session_id: str
    reason: Optional[str] = None
    severity: str = "INFO"


class CommandAuthorizer:
    """
    Authoritative decision engine validating session authenticity, role-based permissions,
    replay protection, and safety constraints on every incoming GCS command.
    """

    EMERGENCY_COMMANDS: Set[str] = {
        "mission.rtl",
        "EMERGENCY_RTL",
        "drone.rtl",
        "drone.land",
        "DRONE_LAND",
        "drone.emergency_stop",
        "EMERGENCY_STOP",
        "mission.abort",
        "MISSION_ABORT",
        "drone.disarm",
        "DRONE_DISARM",
    }

    FLIGHT_CRITICAL_COMMANDS: Set[str] = {
        "drone.arm",
        "DRONE_ARM",
        "drone.takeoff",
        "DRONE_TAKEOFF",
        "mission.start",
        "MISSION_START",
    }

    def __init__(self):
        self.config = get_security_config()
        self.event_bus = get_event_bus()
        self._processed_command_ids: deque = deque(maxlen=self.config.command_id_cache_size)
        self._command_id_set: Set[str] = set()

    def authorize(
        self,
        command_type: str,
        command_id: str,
        payload: Dict[str, Any],
        session_id: Optional[str] = None,
        auth_token: Optional[str] = None,
        timestamp: Optional[float] = None,
        source: str = "GCS_CLIENT",
    ) -> AuthorizationDecision:
        """
        Executes full authorization pipeline.
        Returns AuthorizationDecision.
        """
        now = time.time()
        req_perm = rbac_manager.get_required_permission_for_command(command_type)

        # 1. Replay Protection & Timestamp Check
        if timestamp:
            drift = abs(now - timestamp)
            if drift > self.config.max_timestamp_drift_sec:
                self._emit_event(SecurityEventType.REPLAY_ATTACK_DETECTED, {"command_id": command_id, "drift_sec": drift})
                return AuthorizationDecision(
                    authorized=False,
                    status="REJECTED",
                    required_permission=req_perm.value,
                    user_id="UNKNOWN",
                    username="UNKNOWN",
                    role="NONE",
                    session_id=session_id or "NONE",
                    reason=f"Command rejected: timestamp drift ({drift:.1f}s) exceeds threshold ({self.config.max_timestamp_drift_sec}s).",
                    severity="WARNING",
                )

        if command_id in self._command_id_set:
            return AuthorizationDecision(
                authorized=False,
                status="REJECTED",
                required_permission=req_perm.value,
                user_id="UNKNOWN",
                username="UNKNOWN",
                role="NONE",
                session_id=session_id or "NONE",
                reason=f"Duplicate command_id '{command_id}' detected.",
                severity="INFO",
            )

        # 2. Session Validation
        session: Optional[Session] = None
        if auth_token:
            session = session_manager.get_session_by_token(auth_token)
        elif session_id:
            session = session_manager.get_session(session_id)

        if not session:
            # Check development bypass
            if self.config.is_development and not self.config.websocket_auth_required:
                # Default development operator session
                user_id = "usr_dev_operator"
                username = "dev_operator"
                role = "COMMANDER"
                sess_id = "sess_dev_default"
            else:
                self._emit_event(
                    SecurityEventType.AUTHENTICATION_FAILURE,
                    {"command_type": command_type, "command_id": command_id, "reason": "No active session"},
                )
                return AuthorizationDecision(
                    authorized=False,
                    status="DENIED",
                    required_permission=req_perm.value,
                    user_id="ANONYMOUS",
                    username="ANONYMOUS",
                    role="NONE",
                    session_id="NONE",
                    reason="Authentication required: No valid session found.",
                    severity="WARNING",
                )
        else:
            user_id = session.user_id
            username = session.username
            role = session.role
            sess_id = session.session_id
            session.touch(self.config.session_timeout_sec)

        # 3. RBAC Permission Check
        if not rbac_manager.has_permission(role, req_perm):
            self._emit_event(
                SecurityEventType.PERMISSION_DENIED,
                {"user": username, "role": role, "command_type": command_type, "required_permission": req_perm.value},
            )
            return AuthorizationDecision(
                authorized=False,
                status="DENIED",
                required_permission=req_perm.value,
                user_id=user_id,
                username=username,
                role=role,
                session_id=sess_id,
                reason=f"Insufficient permissions: Role '{role}' lacks permission '{req_perm.value}' required for '{command_type}'.",
                severity="WARNING",
            )

        # 4. Emergency & Critical Command Checks
        severity = "INFO"
        if command_type in self.EMERGENCY_COMMANDS:
            severity = "EMERGENCY"
        elif command_type in self.FLIGHT_CRITICAL_COMMANDS:
            severity = "CRITICAL"

        # Record command_id in deduplication set
        self._record_command_id(command_id)

        return AuthorizationDecision(
            authorized=True,
            status="AUTHORIZED",
            required_permission=req_perm.value,
            user_id=user_id,
            username=username,
            role=role,
            session_id=sess_id,
            reason=None,
            severity=severity,
        )

    def _record_command_id(self, command_id: str):
        if not command_id:
            return
        if len(self._processed_command_ids) >= self.config.command_id_cache_size:
            old = self._processed_command_ids.popleft()
            self._command_id_set.discard(old)
        self._processed_command_ids.append(command_id)
        self._command_id_set.add(command_id)

    def _emit_event(self, event_type: SecurityEventType, payload: Dict[str, Any]):
        try:
            self.event_bus.emit(event_type.value, payload=payload, source="command_authorizer")
        except Exception:
            pass


command_authorizer = CommandAuthorizer()
