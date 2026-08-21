"""
SUTRA GCS — Event Bus Service
Asynchronous publish-subscribe event broker for decoupled subsystem communications.
"""

from typing import Callable, Dict, List, Any
import threading
import logging

logger = logging.getLogger("sutra_gcs.event_bus")


class EventBus:
    """Thread-safe publish-subscribe event bus for GCS internal subsystems."""

    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[Any], None]]] = {}
        self._lock = threading.Lock()

    def subscribe(self, event_type: str, handler: Callable[[Any], None]) -> None:
        """Register a callback for an event type."""
        with self._lock:
            if event_type not in self._subscribers:
                self._subscribers[event_type] = []
            self._subscribers[event_type].append(handler)

    def unsubscribe(self, event_type: str, handler: Callable[[Any], None]) -> None:
        """Unregister a callback from an event type."""
        with self._lock:
            if event_type in self._subscribers and handler in self._subscribers[event_type]:
                self._subscribers[event_type].remove(handler)

    def publish(self, event_type: str, data: Any = None) -> None:
        """Broadcast event to all registered subscribers."""
        with self._lock:
            handlers = list(self._subscribers.get(event_type, []))

        for handler in handlers:
            try:
                handler(data)
            except Exception as e:
                logger.error(f"Error handling event '{event_type}': {e}")


# Global EventBus singleton
event_bus = EventBus()
