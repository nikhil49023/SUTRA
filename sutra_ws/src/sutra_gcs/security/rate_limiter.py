"""
Smart Horizon GCS — Rate Limiting & DoS Protection Service
Subsystem: Security & Governance (Phase 13)
"""

import time
from collections import defaultdict, deque
from typing import Dict, Optional, Tuple
from .security_config import get_security_config
from .security_events import SecurityEventType
from services.event_bus import get_event_bus


class RateLimiter:
    """
    Sliding window rate limiter guarding operational endpoints from flooding or brute force.
    """

    def __init__(self):
        self.config = get_security_config()
        self.event_bus = get_event_bus()
        # key (category:identifier) -> deque of timestamps
        self._buckets: Dict[str, deque] = defaultdict(deque)

    def is_allowed(self, category: str, identifier: str) -> Tuple[bool, Optional[str]]:
        """
        Checks if a request under the category is within allowed rate limits for identifier.
        Returns (is_allowed, error_message).
        """
        limits = self.config.rate_limits.get(category, {"max_calls": 100, "window_sec": 1})
        max_calls = limits["max_calls"]
        window_sec = limits["window_sec"]

        now = time.time()
        key = f"{category}:{identifier}"
        bucket = self._buckets[key]

        # Purge timestamps outside sliding window
        while bucket and bucket[0] <= now - window_sec:
            bucket.popleft()

        if len(bucket) >= max_calls:
            try:
                self.event_bus.emit(
                    SecurityEventType.RATE_LIMIT_EXCEEDED.value,
                    payload={"category": category, "identifier": identifier, "max_calls": max_calls, "window_sec": window_sec},
                    source="rate_limiter",
                )
            except Exception:
                pass
            return False, f"Rate limit exceeded for '{category}'. Limit: {max_calls} requests per {window_sec}s."

        bucket.append(now)
        return True, None

    def reset(self, category: Optional[str] = None, identifier: Optional[str] = None) -> None:
        """Clears rate limit buckets for testing or administrative reset."""
        if category and identifier:
            self._buckets.pop(f"{category}:{identifier}", None)
        elif category:
            keys = [k for k in self._buckets if k.startswith(f"{category}:")]
            for k in keys:
                del self._buckets[k]
        else:
            self._buckets.clear()


rate_limiter = RateLimiter()
