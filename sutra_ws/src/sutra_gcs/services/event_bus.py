"""
Smart Horizon GCS — Centralized Event Bus & Reactive Messaging Infrastructure
Subsystem: Core Services (Phase 12 Production Hardening)
"""

import asyncio
import fnmatch
import logging
import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Union

logger = logging.getLogger("sutra_gcs.event_bus")


class EventNames(str, Enum):
    """
    Centralized event taxonomy for all Ground Control Station subsystems.
    """

    # Telemetry
    TELEMETRY_UPDATED = "telemetry.updated"
    TELEMETRY_LOST = "telemetry.lost"

    # Mission Lifecycle
    MISSION_CREATED = "mission.created"
    MISSION_UPDATED = "mission.updated"
    MISSION_STARTED = "mission.started"
    MISSION_PAUSED = "mission.paused"
    MISSION_RESUMED = "mission.resumed"
    MISSION_RTL = "mission.rtl"
    MISSION_WAYPOINT_REACHED = "mission.waypoint_reached"
    MISSION_WAYPOINT_ADDED = "mission.waypoint_added"
    MISSION_WAYPOINT_UPDATED = "mission.waypoint_updated"
    MISSION_WAYPOINT_DELETED = "mission.waypoint_deleted"
    MISSION_COMPLETED = "mission.completed"
    MISSION_ABORTED = "mission.aborted"
    MISSION_WAYPOINTS_UPDATED = "mission.waypoints_updated"

    # Fleet Coordination
    FLEET_DRONE_ADDED = "fleet.drone_added"
    FLEET_DRONE_REMOVED = "fleet.drone_removed"
    FLEET_DRONE_UPDATED = "fleet.drone_updated"
    FLEET_FORMATION_CHANGED = "fleet.formation_changed"

    # Map & GIS
    MAP_CAMERA_CHANGED = "map.camera_changed"
    MAP_LAYER_CHANGED = "map.layer_changed"

    # Geofence
    GEOFENCE_CREATED = "geofence.created"
    GEOFENCE_UPDATED = "geofence.updated"
    GEOFENCE_DELETED = "geofence.deleted"

    # Alerts & Safety
    ALERT_CREATED = "alert.created"
    ALERT_ACKNOWLEDGED = "alert.acknowledged"

    # Communications Gateway
    COMMUNICATION_CONNECTED = "communication.connected"
    COMMUNICATION_DISCONNECTED = "communication.disconnected"
    COMMUNICATION_RECONNECTING = "communication.reconnecting"

    # AI Subsystem
    AI_RECOMMENDATION = "ai.recommendation"
    AI_PREDICTION = "ai.prediction"
    AI_ASSISTANT_REPLY = "ai.assistant_reply"

    # System Lifecycle
    SYSTEM_ERROR = "system.error"
    SYSTEM_SHUTDOWN = "system.shutdown"


@dataclass(frozen=True)
class Event:
    """
    Standard immutable event envelope delivered to subscribers and frontend WebSocket clients.
    """

    event_name: str
    payload: Any = None
    timestamp: float = field(default_factory=time.time)
    source: str = "system"
    correlation_id: Optional[str] = None
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    state_version: Optional[int] = None

    @property
    def event_type(self) -> str:
        return self.event_name


EventHandler = Callable[[Event], None]
AsyncEventHandler = Callable[[Event], Any]


class EventBus:
    """
    Production-quality thread-safe and async-compatible Event Bus with topic routing,
    wildcard matching, and exception isolation.
    """

    def __init__(self) -> None:
        self._subscribers: Dict[str, List[EventHandler]] = {}
        self._lock = threading.RLock()

    def subscribe(self, topic: Union[str, EventNames], handler: EventHandler) -> Callable[[], None]:
        """
        Subscribes a callback handler to a specific topic or wildcard pattern (e.g. 'telemetry.*').
        Returns an un-subscriber callable.
        """
        topic_str = topic.value if isinstance(topic, EventNames) else str(topic)
        with self._lock:
            if topic_str not in self._subscribers:
                self._subscribers[topic_str] = []
            if handler not in self._subscribers[topic_str]:
                self._subscribers[topic_str].append(handler)

        def _unsub() -> None:
            self.unsubscribe(topic_str, handler)

        return _unsub

    def unsubscribe(self, topic: Union[str, EventNames], handler: EventHandler) -> bool:
        """
        Unregisters a handler from a topic. Returns True if removed, False otherwise.
        """
        topic_str = topic.value if isinstance(topic, EventNames) else str(topic)
        with self._lock:
            if topic_str in self._subscribers:
                if handler in self._subscribers[topic_str]:
                    self._subscribers[topic_str].remove(handler)
                    if not self._subscribers[topic_str]:
                        del self._subscribers[topic_str]
                    return True
        return False

    def emit(
        self,
        event_name: Union[str, EventNames],
        payload: Any = None,
        source: str = "system",
        correlation_id: Optional[str] = None,
        event_id: Optional[str] = None,
        state_version: Optional[int] = None,
    ) -> Event:
        """
        Synchronously publishes an event to matching topic and wildcard subscribers.
        Strict exception isolation ensures subscriber errors do not halt propagation.
        """
        name_str = event_name.value if isinstance(event_name, EventNames) else str(event_name)
        event = Event(
            event_name=name_str,
            payload=payload,
            timestamp=time.time(),
            source=source,
            correlation_id=correlation_id,
            event_id=event_id or str(uuid.uuid4()),
            state_version=state_version,
        )
        self.emit_event(event)
        return event

    def emit_event(self, event: Event) -> None:
        """
        Delivers an existing Event instance to matching subscribers with error isolation.
        """
        matching_handlers: List[EventHandler] = []

        with self._lock:
            for pattern, handlers in self._subscribers.items():
                if pattern == event.event_name or pattern == "*" or fnmatch.fnmatch(event.event_name, pattern):
                    matching_handlers.extend(handlers)

        # Invoke outside of lock to prevent subscriber deadlocks
        for handler in matching_handlers:
            try:
                res = handler(event)
                # If handler returned a coroutine, schedule it if a loop is running
                if asyncio.iscoroutine(res):
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(res)
                    except RuntimeError:
                        asyncio.run(res)
            except Exception as e:
                logger.error(
                    f"Error in EventBus subscriber '{handler}' for event '{event.event_name}': {e}",
                    exc_info=True,
                    extra={
                        "source": event.source,
                        "correlation_id": event.correlation_id,
                    },
                )

    async def emit_async(
        self,
        event_name: Union[str, EventNames],
        payload: Any = None,
        source: str = "system",
        correlation_id: Optional[str] = None,
        event_id: Optional[str] = None,
        state_version: Optional[int] = None,
    ) -> Event:
        """
        Asynchronously publishes an event across matching synchronous and asynchronous handlers.
        """
        name_str = event_name.value if isinstance(event_name, EventNames) else str(event_name)
        event = Event(
            event_name=name_str,
            payload=payload,
            timestamp=time.time(),
            source=source,
            correlation_id=correlation_id,
            event_id=event_id or str(uuid.uuid4()),
            state_version=state_version,
        )

        matching_handlers: List[EventHandler] = []
        with self._lock:
            for pattern, handlers in self._subscribers.items():
                if pattern == event.event_name or pattern == "*" or fnmatch.fnmatch(event.event_name, pattern):
                    matching_handlers.extend(handlers)

        for handler in matching_handlers:
            try:
                res = handler(event)
                if asyncio.iscoroutine(res):
                    await res
            except Exception as e:
                logger.error(
                    f"Error in async EventBus subscriber '{handler}' for event '{event.event_name}': {e}",
                    exc_info=True,
                )

        return event

    def publish(self, topic: Union[str, EventNames], payload: Any = None) -> Event:
        """Alias for emit() to maintain backward compatibility."""
        return self.emit(topic, payload)

    def has_subscribers(self, topic: Union[str, EventNames]) -> bool:
        """
        Checks whether any subscribers match the given topic (including wildcard matches).
        """
        topic_str = topic.value if isinstance(topic, EventNames) else str(topic)
        with self._lock:
            for pattern, handlers in self._subscribers.items():
                if handlers and (pattern == topic_str or pattern == "*" or fnmatch.fnmatch(topic_str, pattern)):
                    return True
        return False

    def clear(self) -> None:
        """
        Removes all registered event subscribers.
        """
        with self._lock:
            self._subscribers.clear()


# Global EventBus singleton instance
_global_event_bus: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """Returns the central global EventBus instance."""
    global _global_event_bus
    if _global_event_bus is None:
        _global_event_bus = EventBus()
    return _global_event_bus


# Global EventBus singleton
event_bus = get_event_bus()
