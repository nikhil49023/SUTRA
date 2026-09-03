"""
Smart Horizon GCS — Cryptographic Session Management Service
Subsystem: Security & Governance (Phase 13)
"""

import logging
import secrets
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from .security_config import get_security_config

logger = logging.getLogger("sutra_gcs.security.session")


@dataclass
class Session:
    session_id: str
    user_id: str
    username: str
    role: str
    token: str
    created_at: float
    last_activity: float
    expires_at: float
    connection_id: Optional[str] = None
    status: str = "ACTIVE"  # "ACTIVE", "EXPIRED", "REVOKED"

    @property
    def is_expired(self) -> bool:
        if self.status != "ACTIVE":
            return True
        return time.time() > self.expires_at

    def touch(self, timeout_sec: int) -> None:
        """Updates last activity and extends expiry."""
        now = time.time()
        self.last_activity = now
        self.expires_at = now + timeout_sec


class SessionManager:
    """
    Tracks and enforces authenticated sessions across active WebSocket connections.
    """

    def __init__(self):
        self._sessions: Dict[str, Session] = {}       # session_id -> Session
        self._token_map: Dict[str, str] = {}         # token -> session_id
        self._connection_map: Dict[str, Set[str]] = {} # connection_id -> Set[session_id]
        self._user_sessions: Dict[str, Set[str]] = {}  # user_id -> Set[session_id]
        self.config = get_security_config()

    def create_session(
        self,
        user_id: str,
        username: str,
        role: str,
        connection_id: Optional[str] = None,
        duration_sec: Optional[int] = None,
    ) -> Session:
        """Creates and stores a cryptographically secure session."""
        self.cleanup_expired()
        timeout = duration_sec or self.config.session_timeout_sec
        now = time.time()

        session_id = f"sess_{secrets.token_hex(16)}"
        token = secrets.token_urlsafe(32)

        session = Session(
            session_id=session_id,
            user_id=user_id,
            username=username,
            role=role,
            token=token,
            created_at=now,
            last_activity=now,
            expires_at=now + timeout,
            connection_id=connection_id,
            status="ACTIVE",
        )

        # Enforce max sessions per user
        user_sess_set = self._user_sessions.setdefault(user_id, set())
        if len(user_sess_set) >= self.config.max_active_sessions_per_user:
            oldest_id = min(user_sess_set, key=lambda sid: self._sessions[sid].created_at if sid in self._sessions else 0)
            self.revoke_session(oldest_id)

        self._sessions[session_id] = session
        self._token_map[token] = session_id
        user_sess_set.add(session_id)

        if connection_id:
            self._connection_map.setdefault(connection_id, set()).add(session_id)

        logger.info(f"🔑 Session created: session_id={session_id} user={username} role={role}")
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """Retrieves session by ID if active and unexpired."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        if session.is_expired:
            session.status = "EXPIRED"
            return None
        return session

    def get_session_by_token(self, token: str) -> Optional[Session]:
        """Retrieves session by auth token if active and unexpired."""
        session_id = self._token_map.get(token)
        if not session_id:
            return None
        return self.get_session(session_id)

    def validate_and_touch(self, session_id: str) -> Optional[Session]:
        """Validates session activity and updates expiry."""
        session = self.get_session(session_id)
        if not session:
            return None
        session.touch(self.config.session_timeout_sec)
        return session

    def revoke_session(self, session_id: str) -> bool:
        """Explicitly revokes an active session."""
        session = self._sessions.get(session_id)
        if not session:
            return False
        session.status = "REVOKED"
        if session.token in self._token_map:
            del self._token_map[session.token]
        if session.user_id in self._user_sessions:
            self._user_sessions[session.user_id].discard(session_id)
        logger.info(f"🚫 Session revoked: session_id={session_id} user={session.username}")
        return True

    def revoke_connection_sessions(self, connection_id: str) -> None:
        """Revokes all sessions linked to a disconnected client connection."""
        sids = self._connection_map.pop(connection_id, set())
        for sid in sids:
            self.revoke_session(sid)

    def cleanup_expired(self) -> int:
        """Purges expired sessions from memory."""
        now = time.time()
        expired_ids = [sid for sid, s in self._sessions.items() if s.expires_at < now or s.status != "ACTIVE"]
        for sid in expired_ids:
            self.revoke_session(sid)
            self._sessions.pop(sid, None)
        return len(expired_ids)


session_manager = SessionManager()
