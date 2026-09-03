"""
Smart Horizon GCS — Security Event Definitions
Subsystem: Security & Governance (Phase 13)
"""

from enum import Enum


class SecurityEventType(str, Enum):
    LOGIN_SUCCESS = "security.login_success"
    LOGIN_FAILED = "security.login_failed"
    LOGOUT = "security.logout"
    SESSION_EXPIRED = "security.session_expired"
    PERMISSION_DENIED = "security.permission_denied"
    COMMAND_REJECTED = "security.command_rejected"
    INVALID_MESSAGE = "security.invalid_message"
    RATE_LIMIT_EXCEEDED = "security.rate_limit"
    CONNECTION_REJECTED = "security.connection_rejected"
    AUTHENTICATION_FAILURE = "security.authentication_failure"
    REPLAY_ATTACK_DETECTED = "security.replay_attack_detected"
    EMERGENCY_OVERRIDE = "security.emergency_override"
    ADMIN_CONFIG_CHANGE = "security.admin_config_change"
