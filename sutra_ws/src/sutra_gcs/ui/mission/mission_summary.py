"""
Smart Horizon GCS — Mission Statistics Summary Card View
Subsystem: UI Layer (Mission)
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

from state.application_state import ApplicationState, StateStore, get_state_store
from widgets.status_card import StatusCard


class MissionSummary(QFrame):
    """
    Real-time aggregated mission statistics display card.
    """

    def __init__(self, state_store: Optional[StateStore] = None, parent=None) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()

        self.setObjectName("panel")
        self.setStyleSheet(
            "QFrame#panel { background-color: #0b111e; border: 1px solid #1e293b; border-radius: 4px; padding: 6px; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        hdr_lbl = QLabel("MISSION METRICS SUMMARY")
        hdr_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(hdr_lbl)

        grid = QGridLayout()
        grid.setContentsMargins(0, 0, 0, 0)
        grid.setSpacing(6)

        self.card_dist = StatusCard("TOTAL DISTANCE", "0.0", "m", "#00f2fe")
        grid.addWidget(self.card_dist, 0, 0)

        self.card_time = StatusCard("EST FLIGHT TIME", "0:00", "min", "#38bdf8")
        grid.addWidget(self.card_time, 0, 1)

        self.card_battery = StatusCard("EST BATTERY", "0.0", "%", "#10b981")
        grid.addWidget(self.card_battery, 1, 0)

        self.card_val = StatusCard("PRE-FLIGHT AUDIT", "EMPTY", "", "#94a3b8")
        grid.addWidget(self.card_val, 1, 1)

        layout.addLayout(grid)

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_state_updated(self, state: ApplicationState) -> None:
        m = state.mission_state
        self.card_dist.set_value(f"{m.distance_remaining:.1f}")

        # Format flight time MM:SS
        total_sec = int(m.estimated_time_remaining)
        mins = total_sec // 60
        secs = total_sec % 60
        self.card_time.set_value(f"{mins}:{secs:02d}")

        bat_color = "#10b981" if m.estimated_battery_required < 60 else ("#f59e0b" if m.estimated_battery_required < 80 else "#ef4444")
        self.card_battery.set_value(f"{m.estimated_battery_required:.1f}", bat_color)

        val_color = (
            "#10b981"
            if m.validation_status == "READY"
            else ("#ef4444" if m.validation_status == "INVALID" else "#94a3b8")
        )
        self.card_val.set_value(m.validation_status, val_color)

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
