"""
Smart Horizon GCS — Mission Execution Event Timeline & Audit Logger
Subsystem: Mission Engine (Phase 5)
"""

import time
from typing import List, Optional

from services.event_bus import EventBus, get_event_bus
from .models import TimelineEvent


class MissionTimeline:
    """
    In-memory append-only chronological log of all flight operations,
    pre-flight milestones, safety alerts, and autopilot mode changes.
    """

    def __init__(self, event_bus: Optional[EventBus] = None, max_events: int = 200) -> None:
        self.event_bus = event_bus or get_event_bus()
        self.max_events = max_events
        self._events: List[TimelineEvent] = []

    def add_event(
        self,
        event_type: str,
        message: str,
        severity: str = "INFO",
        timestamp: Optional[float] = None,
    ) -> TimelineEvent:
        """Appends a new chronological event record."""
        ev = TimelineEvent(
            timestamp=timestamp or time.time(),
            event_type=event_type,
            message=message,
            severity=severity,
        )
        self._events.append(ev)
        if len(self._events) > self.max_events:
            self._events.pop(0)

        # Notify via EventBus
        self.event_bus.emit(
            "mission.timeline_event",
            payload={
                "event_type": event_type,
                "message": message,
                "severity": severity,
                "timestamp": ev.timestamp,
            },
            source="mission_timeline",
        )
        return ev

    def get_events(self) -> List[TimelineEvent]:
        """Returns all recorded timeline events."""
        return list(self._events)

    def clear(self) -> None:
        """Clears the timeline history."""
        self._events.clear()


# Global singleton
_global_timeline: Optional[MissionTimeline] = None


def get_mission_timeline() -> MissionTimeline:
    """Returns global MissionTimeline singleton."""
    global _global_timeline
    if _global_timeline is None:
        _global_timeline = MissionTimeline()
    return _global_timeline
