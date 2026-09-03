"""
Smart Horizon GCS — Production Security Configuration
Subsystem: Security & Governance (Phase 13)
"""

import os
from dataclasses import dataclass, field
from typing import Dict, List, Set


@dataclass
class SecurityConfig:
    # Environment mode: 'DEVELOPMENT' or 'PRODUCTION'
    environment: str = field(
        default_factory=lambda: os.getenv("GCS_ENV", "DEVELOPMENT").upper()
    )

    # Authentication & Session
    websocket_auth_required: bool = field(
        default_factory=lambda: os.getenv("GCS_WS_AUTH_REQUIRED", "false").lower() in ("true", "1", "yes")
        if os.getenv("GCS_ENV", "DEVELOPMENT").upper() == "DEVELOPMENT" else True
    )
    session_timeout_sec: int = field(
        default_factory=lambda: int(os.getenv("GCS_SESSION_TIMEOUT_SEC", "3600"))
    )
    token_expiry_sec: int = field(
        default_factory=lambda: int(os.getenv("GCS_TOKEN_EXPIRY_SEC", "86400"))
    )
    max_active_sessions_per_user: int = 5
    allow_anonymous_read_in_dev: bool = field(
        default_factory=lambda: os.getenv("GCS_ENV", "DEVELOPMENT").upper() == "DEVELOPMENT"
    )

    # Replay Protection & Drift
    max_timestamp_drift_sec: float = 30.0
    command_id_cache_size: int = 2000

    # Payload & Message Sizes (Bytes)
    max_ws_message_size: int = 512 * 1024       # 512 KB
    max_command_payload_size: int = 256 * 1024   # 256 KB
    max_geojson_payload_size: int = 2 * 1024 * 1024 # 2 MB
    max_console_message_size: int = 4096

    # Rate Limiting (calls per window in seconds)
    rate_limits: Dict[str, Dict[str, int]] = field(
        default_factory=lambda: {
            "login": {"max_calls": 10, "window_sec": 60},
            "commands": {"max_calls": 50, "window_sec": 1},
            "mission_edits": {"max_calls": 30, "window_sec": 1},
            "gis_analysis": {"max_calls": 15, "window_sec": 60},
            "ai_requests": {"max_calls": 20, "window_sec": 60},
            "telemetry": {"max_calls": 200, "window_sec": 1},
        }
    )

    # CORS / Allowed Origins
    allowed_origins: List[str] = field(
        default_factory=lambda: [
            o.strip()
            for o in os.getenv(
                "GCS_ALLOWED_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:8765",
            ).split(",")
        ]
    )

    # Audit Retention
    audit_retention_days: int = 90
    audit_max_memory_records: int = 5000

    # Fail-safe behavior: 'REJECT' (fail closed) or 'ALLOW_AUDIT_ERROR'
    audit_failure_policy: str = "REJECT"

    @property
    def is_production(self) -> bool:
        return self.environment == "PRODUCTION"

    @property
    def is_development(self) -> bool:
        return self.environment == "DEVELOPMENT"


_security_config = SecurityConfig()


def get_security_config() -> SecurityConfig:
    global _security_config
    return _security_config
