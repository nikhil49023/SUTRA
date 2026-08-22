"""
Smart Horizon GCS — Mission Execution Chronological Timeline Widget
Subsystem: UI Layer (Mission Execution)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QVBoxLayout,
    QWidget,
)

from engine.mission_timeline import MissionTimeline, get_mission_timeline
from services.event_bus import EventBus, get_event_bus


class MissionTimelineWidget(QFrame):
    """
    Chronological operational timeline viewer displaying color-badged flight events and safety milestones.
    """

    def __init__(
        self,
        timeline: Optional[MissionTimeline] = None,
        event_bus: Optional[EventBus] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.timeline = timeline or get_mission_timeline()
        self.event_bus = event_bus or get_event_bus()

        self.setObjectName("panel")
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border: 1px solid #1e293b; border-radius: 4px; padding: 4px; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        hdr_lbl = QLabel("MISSION EXECUTION TIMELINE")
        hdr_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(hdr_lbl)

        self.list_widget = QListWidget()
        self.list_widget.setStyleSheet(
            "QListWidget { background-color: #050811; border: 1px solid #1e293b; font-family: monospace; font-size: 9px; color: #f8fafc; } "
            "QListWidget::item { padding: 4px; border-bottom: 1px solid #111827; }"
        )
        layout.addWidget(self.list_widget)

        # Load initial events
        self._refresh_timeline()

        # Subscribe to timeline events
        self.event_bus.subscribe("mission.timeline_event", self._on_timeline_event)

    def _refresh_timeline(self) -> None:
        self.list_widget.clear()
        for ev in self.timeline.get_events():
            self._add_event_item(ev.event_type, ev.message, ev.severity, ev.timestamp)

    def _on_timeline_event(self, event) -> None:
        p = event.payload
        self._add_event_item(
            p.get("event_type", "INFO"),
            p.get("message", ""),
            p.get("severity", "INFO"),
            p.get("timestamp"),
        )

    def _add_event_item(self, ev_type: str, msg: str, severity: str, timestamp: Optional[float]) -> None:
        import datetime
        time_str = datetime.datetime.fromtimestamp(timestamp or 0).strftime("%H:%M:%S")
        item_text = f"[{time_str}] [{ev_type}] {msg}"
        item = QListWidgetItem(item_text)

        if severity == "EMERGENCY":
            item.setForeground(Qt.GlobalColor.red)
        elif severity == "CRITICAL":
            item.setForeground(Qt.GlobalColor.magenta)
        elif severity == "WARNING":
            item.setForeground(Qt.GlobalColor.yellow)
        else:
            item.setForeground(Qt.GlobalColor.cyan)

        self.list_widget.addItem(item)
        self.list_widget.scrollToBottom()
