"""
Smart Horizon GCS — Production Secret Manager & Redaction Service
Subsystem: Security & Governance (Phase 13)
"""

import os
import re
from typing import Any, Dict, List, Set, Union


class SecretManager:
    """
    Manages access to system secrets, API keys, and sensitive environment variables.
    Provides sanitization and redaction to prevent secret leakage in logs, state snapshots, or audits.
    """

    SENSITIVE_KEYS: Set[str] = {
        "password",
        "passwd",
        "secret",
        "token",
        "auth_token",
        "api_key",
        "apikey",
        "private_key",
        "access_key",
        "jwt",
        "credentials",
        "authorization",
        "cookie",
        "session_token",
    }

    REDACTED_VALUE: str = "[REDACTED]"

    @classmethod
    def get_secret(cls, key: str, default: str = "") -> str:
        """Retrieves a secret from the OS environment."""
        return os.environ.get(key, default)

    @classmethod
    def redact_data(cls, data: Any) -> Any:
        """
        Recursively sanitizes dictionaries, lists, and strings, replacing any sensitive keys
        or patterns with [REDACTED].
        """
        if data is None:
            return None
        if isinstance(data, (int, float, bool)):
            return data
        if isinstance(data, str):
            # Check for JWT pattern or bearer tokens in string
            if re.search(r"bearer\s+[a-zA-Z0-9_\-\.]+", data, re.IGNORECASE):
                return re.sub(r"bearer\s+[a-zA-Z0-9_\-\.]+", "Bearer [REDACTED]", data, flags=re.IGNORECASE)
            return data
        if isinstance(data, dict):
            clean_dict = {}
            for k, v in data.items():
                k_str = str(k).lower()
                if any(sensitive in k_str for sensitive in cls.SENSITIVE_KEYS):
                    clean_dict[k] = cls.REDACTED_VALUE
                else:
                    clean_dict[k] = cls.redact_data(v)
            return clean_dict
        if isinstance(data, (list, tuple, set)):
            clean_list = [cls.redact_data(item) for item in data]
            return type(data)(clean_list)
        return data


secret_manager = SecretManager()
