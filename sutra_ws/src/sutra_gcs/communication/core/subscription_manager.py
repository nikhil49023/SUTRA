"""
Smart Horizon GCS — Hierarchical Topic Subscription & Wildcard Matcher
Subsystem: Communication Core (Phase 8)
"""

import fnmatch
from typing import Any, Callable, Dict, List, Set


class SubscriptionManager:
    """
    Manages MQTT-style hierarchical topic subscriptions with '+' and '#' wildcard support.
    """

    def __init__(self) -> None:
        self._subscriptions: Dict[str, Set[Callable]] = {}

    def subscribe(self, topic_pattern: str, callback: Callable[[Dict[str, Any]], None]) -> None:
        if topic_pattern not in self._subscriptions:
            self._subscriptions[topic_pattern] = set()
        self._subscriptions[topic_pattern].add(callback)

    def unsubscribe(self, topic_pattern: str, callback: Callable[[Dict[str, Any]], None]) -> None:
        if topic_pattern in self._subscriptions:
            self._subscriptions[topic_pattern].discard(callback)
            if not self._subscriptions[topic_pattern]:
                del self._subscriptions[topic_pattern]

    def unsubscribe_all(self) -> None:
        self._subscriptions.clear()

    def get_subscribers(self, topic: str) -> List[Callable]:
        """Returns all callbacks whose registered pattern matches the target topic."""
        matching_callbacks = set()

        for pattern, cbs in self._subscriptions.items():
            if self._matches_topic(pattern, topic):
                matching_callbacks.update(cbs)

        return list(matching_callbacks)

    @classmethod
    def _matches_topic(cls, pattern: str, topic: str) -> bool:
        if pattern == topic or pattern == "#":
            return True

        p_parts = pattern.split("/")
        t_parts = topic.split("/")

        for i, p in enumerate(p_parts):
            if p == "#":
                return True
            if i >= len(t_parts):
                return False
            if p != "+" and p != t_parts[i]:
                return False

        return len(p_parts) == len(t_parts)


# Global singleton
subscription_manager = SubscriptionManager()
