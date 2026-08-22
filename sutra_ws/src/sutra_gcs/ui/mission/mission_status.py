"""
Smart Horizon GCS — Live Flight Status & Telemetry Readout Widget
Subsystem: UI Layer (Mission Execution)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QGridLayout,
    QLabel,
    QProgressBar,
    QVBoxLayout,
    QWidget,
)

from state.application_state import ApplicationState, StateStore, get_state_store
from widgets.status_card import StatusCard


class MissionStatusWidget(QFrame):
    """
    Live avionics metrics and progress bar panel for real-time mission execution tracking.
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

        hdr_lbl = QLabel("LIVE FLIGHT TELEMETRY & PROGRESS")
        hdr_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(hdr_lbl)

        # Progress Bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(0)
        self.progress_bar.setStyleSheet(
            "QProgressBar { background-color: #050811; border: 1px solid #1e293b; border-radius: 3px; text-align: center; color: #f8fafc; font-size: 9px; font-weight: bold; height: 16px; } "
            "QProgressBar::chunk { background-color: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #00f2fe, stop:1 #10b981); border-radius: 2px; }"
        )
        layout.addWidget(self.progress_bar)

        grid = QGridLayout()
        grid.setContentsMargins(0, 0, 0, 0)
        grid.setSpacing(6)

        self.card_mode = StatusCard("FLIGHT MODE", "IDLE", "", "#94a3b8")
        grid.addWidget(self.card_mode, 0, 0)

        self.card_alt = StatusCard("ALTITUDE AGL", "0.0", "m", "#00f2fe")
        grid.addWidget(self.card_alt, 0, 1)

        self.card_speed = StatusCard("GROUND SPEED", "0.0", "m/s", "#38bdf8")
        grid.addWidget(self.card_speed, 1, 0)

        self.card_battery = StatusCard("BATTERY PACK", "100.0", "%", "#10b981")
        grid.addWidget(self.card_battery, 1, 1)

        layout.addLayout(grid)

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_state_updated(self, state: ApplicationState) -> None:
        telem = state.telemetry_state
        mission = state.mission_state

        mode_color = (
            "#10b981"
            if mission.state.value == "MISSION"
            else ("#f59e0b" if mission.state.value in {"HOLD", "RTL"} else ("#ef4444" if mission.state.value in {"ABORTED", "EMERGENCY"} else "#94a3b8"))
        )
        self.card_mode.set_value(mission.state.value, mode_color)
        self.card_alt.set_value(f"{telem.altitude_agl:.1f}")
        self.card_speed.set_value(f"{telem.ground_speed:.1f}")

        bat_color = "#10b981" if telem.battery_percent >= 50.0 else ("#f59e0b" if telem.battery_percent >= 20.0 else "#ef4444")
        self.card_battery.set_value(f"{telem.battery_percent:.1f}", bat_color)

        self.progress_bar.setValue(int(mission.mission_progress))
        self.progress_bar.setFormat(f"MISSION CORRIDOR PROGRESS: {mission.mission_progress:.1f}%")

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
