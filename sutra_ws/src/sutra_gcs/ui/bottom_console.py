"""
Smart Horizon GCS — Bottom Tactical Console Component
Subsystem: UI Layer
"""

import time
from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QPushButton,
    QTabWidget,
    QVBoxLayout,
    QWidget,
)

from services.event_bus import Event, EventBus, EventNames, get_event_bus
from state.alert_state import Alert, AlertSeverity, AlertState
from state.application_state import ApplicationState, StateStore, get_state_store
from widgets.alert_card import AlertCard


class BottomConsole(QFrame):
    """
    Tabbed operational log & telemetry stream console.
    Listens directly to the EventBus without coupling to internal subsystem implementations.
    """

    def __init__(
        self,
        event_bus: Optional[EventBus] = None,
        state_store: Optional[StateStore] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.event_bus = event_bus or get_event_bus()
        self.state_store = state_store or get_state_store()

        self.setObjectName("panel")
        self.setFixedHeight(160)
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border-top: 1px solid #1e293b; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 4, 6, 4)
        layout.setSpacing(4)

        # Tab Widget
        self.tabs = QTabWidget()
        self.tabs.setStyleSheet(
            "QTabWidget::pane { border: 1px solid #1e293b; background-color: #050811; } "
            "QTabBar::tab { background-color: #0b111e; color: #94a3b8; padding: 4px 10px; font-size: 9px; font-weight: bold; } "
            "QTabBar::tab:selected { background-color: #090e1a; color: #00f2fe; border-bottom: 2px solid #00f2fe; }"
        )

        # 1. Telemetry Log List
        self.telemetry_list = self._create_log_list()
        self.tabs.addTab(self.telemetry_list, "📡 TELEMETRY")

        # 2. Mission Events Log List
        self.mission_list = self._create_log_list()
        self.tabs.addTab(self.mission_list, "🗺️ MISSION EVENTS")

        # 3. Alerts Panel (with acknowledge buttons)
        self.alerts_widget = QWidget()
        self.alerts_layout = QVBoxLayout(self.alerts_widget)
        self.alerts_layout.setContentsMargins(4, 4, 4, 4)
        self.alerts_layout.setSpacing(4)
        self.alerts_list = self._create_log_list()
        self.alerts_layout.addWidget(self.alerts_list)
        self.tabs.addTab(self.alerts_widget, "⚠️ ALERTS")

        # 4. System Log List
        self.system_list = self._create_log_list()
        self.tabs.addTab(self.system_list, "💻 SYSTEM LOG")

        # 5. Communication Log List
        self.comms_list = self._create_log_list()
        self.tabs.addTab(self.comms_list, "📻 COMMUNICATION")

        # 6. AI Intel Log List
        self.ai_list = self._create_log_list()
        self.tabs.addTab(self.ai_list, "🧠 AI INTEL")

        layout.addWidget(self.tabs)

        # Subscribe to EventBus topics
        self._unsub_all = self.event_bus.subscribe("*", self._on_any_event)

        # Initial seed log
        self._add_log(self.system_list, "SYSTEM", "Tactical Bottom Console initialized and listening to EventBus.")

    def _create_log_list(self) -> QListWidget:
        list_w = QListWidget()
        list_w.setStyleSheet(
            "background-color: #03060c; border: none; color: #f8fafc; font-family: monospace; font-size: 9px;"
        )
        return list_w

    def _add_log(self, list_widget: QListWidget, source: str, message: str, color: str = "#94a3b8") -> None:
        t_str = time.strftime("%H:%M:%S")
        item = QListWidgetItem(f"[{t_str}] [{source.upper()}] {message}")
        item.setForeground(Qt.GlobalColor.white)
        list_widget.insertItem(0, item)
        if list_widget.count() > 100:
            list_widget.takeItem(100)

    def _on_any_event(self, event: Event) -> None:
        name = event.event_name

        if name.startswith("telemetry."):
            payload_str = str(event.payload) if event.payload else ""
            self._add_log(self.telemetry_list, event.source, f"{name}: {payload_str}")

        elif name.startswith("mission."):
            self._add_log(self.mission_list, event.source, f"{name} -> {event.payload}")

        elif name.startswith("alert.") or name == "system.emergency":
            self._add_log(self.alerts_list, event.source, f"ALERT: {event.payload}")

        elif name.startswith("communication."):
            self._add_log(self.comms_list, event.source, f"{name} -> {event.payload}")

        elif name.startswith("ai."):
            self._add_log(self.ai_list, event.source, f"{name} -> {event.payload}")

        elif name.startswith("system.") or name.startswith("fleet.") or name.startswith("map."):
            self._add_log(self.system_list, event.source, f"{name}: {event.payload}")

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_all"):
            self._unsub_all()
        event.accept()
