"""
Smart Horizon GCS — Production Authentication & User Identity Management
Subsystem: Security & Governance (Phase 13)
"""

import hashlib
import hmac
import logging
import secrets
import time
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Set
from .rbac_manager import UserRole, rbac_manager
from .session_manager import Session, session_manager
from .security_events import SecurityEventType
from .security_config import get_security_config
from services.event_bus import get_event_bus

logger = logging.getLogger("sutra_gcs.security.auth")


@dataclass
class User:
    user_id: str
    username: str
    display_name: str
    role: str
    salt: str
    password_hash: str
    status: str = "ACTIVE"  # "ACTIVE", "DISABLED", "LOCKED"
    created_at: float = field(default_factory=time.time)
    failed_attempts: int = 0
    lockout_until: float = 0.0

    def to_safe_dict(self) -> Dict[str, Any]:
        """Returns safe user object omitting password hashes and salts."""
        perms = [p.value for p in rbac_manager.get_role_permissions(self.role)]
        return {
            "user_id": self.user_id,
            "username": self.username,
            "display_name": self.display_name,
            "role": self.role,
            "permissions": perms,
            "status": self.status,
            "created_at": self.created_at,
        }


class AuthManager:
    """
    Manages user authentication, salted PBKDF2-HMAC password verification,
    lockout protection, and session issuance.
    """

    PBKDF2_ITERATIONS = 100_000

    def __init__(self):
        self._users: Dict[str, User] = {}  # username.lower() -> User
        self.config = get_security_config()
        self.event_bus = get_event_bus()
        self._seed_default_users()

    @classmethod
    def hash_password(cls, password: str, salt: Optional[str] = None) -> tuple[str, str]:
        """Hashes password using PBKDF2-HMAC-SHA256 with 100,000 iterations and a unique salt."""
        if not salt:
            salt = secrets.token_hex(16)
        key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            cls.PBKDF2_ITERATIONS,
        )
        return key.hex(), salt

    @classmethod
    def verify_password(cls, password: str, salt: str, expected_hash: str) -> bool:
        """Constant-time password verification."""
        computed_hash, _ = cls.hash_password(password, salt)
        return hmac.compare_digest(computed_hash, expected_hash)

    def _seed_default_users(self):
        """Initializes default tactical operator accounts with distinct roles."""
        defaults = [
            ("commander", "Col. Siva", "COMMANDER", "Commander@GCS2026!"),
            ("pilot", "Capt. Alpha (Flight Pilot)", "PILOT", "Pilot@GCS2026!"),
            ("planner", "Maj. Sarah (Mission Planner)", "MISSION_PLANNER", "Planner@GCS2026!"),
            ("operator", "Lt. Alex (Tactical Operator)", "OPERATOR", "Operator@GCS2026!"),
            ("viewer", "Observer / Analyst", "VIEWER", "Viewer@GCS2026!"),
            ("admin", "System Administrator", "ADMIN", "Admin@GCS2026!"),
        ]

        for username, display_name, role, pwd in defaults:
            pwd_hash, salt = self.hash_password(pwd)
            user_id = f"usr_{username}"
            self._users[username.lower()] = User(
                user_id=user_id,
                username=username,
                display_name=display_name,
                role=role,
                salt=salt,
                password_hash=pwd_hash,
                status="ACTIVE",
            )
        logger.info(f"🛡️ Seeded {len(self._users)} default tactical user accounts.")

    def authenticate(
        self,
        username: str,
        password: str,
        connection_id: Optional[str] = None,
    ) -> tuple[Optional[User], Optional[Session], Optional[str]]:
        """
        Authenticates username and password against PBKDF2 hash.
        Returns (User, Session, error_message).
        """
        now = time.time()
        user = self._users.get(username.lower().strip())

        if not user:
            self._emit_security_event(SecurityEventType.LOGIN_FAILED, {"username": username, "reason": "User not found"})
            return None, None, "Invalid username or password"

        if user.status != "ACTIVE":
            self._emit_security_event(SecurityEventType.LOGIN_FAILED, {"username": username, "reason": f"Account {user.status}"})
            return None, None, f"Account is {user.status.lower()}"

        if user.lockout_until > now:
            wait_sec = int(user.lockout_until - now)
            self._emit_security_event(SecurityEventType.LOGIN_FAILED, {"username": username, "reason": "Account locked"})
            return None, None, f"Account temporarily locked. Retry in {wait_sec}s"

        # Verify password hash
        if not self.verify_password(password, user.salt, user.password_hash):
            user.failed_attempts += 1
            if user.failed_attempts >= 5:
                user.lockout_until = now + 300  # 5 min lockout
                logger.warning(f"🔒 Account locked due to repeated failed logins: {username}")
            self._emit_security_event(SecurityEventType.LOGIN_FAILED, {"username": username, "reason": "Invalid credentials"})
            return None, None, "Invalid username or password"

        # Success - reset failed attempts
        user.failed_attempts = 0
        user.lockout_until = 0.0

        # Create session
        session = session_manager.create_session(
            user_id=user.user_id,
            username=user.username,
            role=user.role,
            connection_id=connection_id,
        )

        self._emit_security_event(
            SecurityEventType.LOGIN_SUCCESS,
            {"user_id": user.user_id, "username": user.username, "role": user.role, "session_id": session.session_id},
        )
        return user, session, None

    def resume_session(self, token: str, connection_id: Optional[str] = None) -> tuple[Optional[User], Optional[Session]]:
        """Validates token and resumes an active session."""
        session = session_manager.get_session_by_token(token)
        if not session or session.is_expired:
            return None, None

        user = self._users.get(session.username.lower())
        if not user or user.status != "ACTIVE":
            return None, None

        if connection_id:
            session.connection_id = connection_id

        session_manager.validate_and_touch(session.session_id)
        return user, session

    def logout(self, session_id: str) -> bool:
        """Terminates session."""
        session = session_manager.get_session(session_id)
        if session:
            self._emit_security_event(SecurityEventType.LOGOUT, {"session_id": session_id, "username": session.username})
        return session_manager.revoke_session(session_id)

    def get_user(self, username: str) -> Optional[User]:
        return self._users.get(username.lower().strip())

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        for u in self._users.values():
            if u.user_id == user_id:
                return u
        return None

    def _emit_security_event(self, event_type: SecurityEventType, payload: Dict[str, Any]):
        try:
            self.event_bus.emit(
                event_type.value,
                payload=payload,
                source="auth_manager",
            )
        except Exception:
            pass


auth_manager = AuthManager()
