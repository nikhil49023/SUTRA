"""
Smart Horizon GCS — Tactical Dashboard View Coordinator
Subsystem: UI Layer
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from map.map_widget import MapWidget
from state.application_state import ApplicationState, StateStore, get_state_store
from widgets.status_card import StatusCard


class DashboardView(QWidget):
    """
    Primary Tactical Dashboard coordinating live operational status cards,
    persistent GIS map viewport, and active mission summaries.
    """

    def __init__(
        self,
        map_widget: MapWidget,
        state_store: Optional[StateStore] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.map_widget = map_widget
        self.state_store = state_store or get_state_store()

        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(4, 4, 4, 4)
        main_layout.setSpacing(6)

        # 1. Top Metric Cards Row
        cards_layout = QHBoxLayout()
        cards_layout.setContentsMargins(0, 0, 0, 0)
        cards_layout.setSpacing(6)

        self.card_swarm = StatusCard("SWARM FLEET", "3", "DRONES", "#00f2fe")
        cards_layout.addWidget(self.card_swarm)

        self.card_battery = StatusCard("FLEET BATTERY", "91.0", "%", "#10b981")
        cards_layout.addWidget(self.card_battery)

        self.card_speed = StatusCard("AVG SPEED", "12.4", "m/s", "#38bdf8")
        cards_layout.addWidget(self.card_speed)

        self.card_altitude = StatusCard("LEADER ALT", "25.0", "m AGL", "#f59e0b")
        cards_layout.addWidget(self.card_altitude)

        self.card_alerts = StatusCard("ACTIVE ALERTS", "0", "TOTAL", "#10b981")
        cards_layout.addWidget(self.card_alerts)

        main_layout.addLayout(cards_layout)

        # 2. Central Map Area (Embeds the persistent map)
        self.map_frame = QFrame()
        self.map_frame.setObjectName("panel")
        self.map_frame.setStyleSheet(
            "QFrame#panel { background-color: #050811; border: 1px solid #1e293b; border-radius: 4px; }"
        )
        self.map_layout = QVBoxLayout(self.map_frame)
        self.map_layout.setContentsMargins(0, 0, 0, 0)
        self.map_layout.addWidget(self.map_widget)

        main_layout.addWidget(self.map_frame, stretch=1)

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_state_updated(self, state: ApplicationState) -> None:
        # Update Swarm Count
        drones = state.fleet_state.get_all_drones()
        self.card_swarm.set_value(str(len(drones)))

        # Update Fleet Battery Average
        if drones:
            avg_bat = sum(d.battery for d in drones) / len(drones)
            color = "#10b981" if avg_bat > 40 else ("#f59e0b" if avg_bat > 20 else "#ef4444")
            self.card_battery.set_value(f"{avg_bat:.1f}", color)

        # Update Leader Altitude & Speed
        leader = state.fleet_state.get_leader()
        if leader:
            self.card_altitude.set_value(f"{leader.altitude:.1f}")
            self.card_speed.set_value(f"{leader.speed:.1f}")
        else:
            telem = state.telemetry_state
            self.card_altitude.set_value(f"{telem.altitude_agl:.1f}")
            self.card_speed.set_value(f"{telem.ground_speed:.1f}")

        # Update Active Alerts Count
        alerts = state.alert_state.get_unacknowledged()
        alert_color = "#ef4444" if alerts else "#10b981"
        self.card_alerts.set_value(str(len(alerts)), alert_color)

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
