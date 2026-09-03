"""
Smart Horizon GCS — Swarm Fleet Aggregated Status Summary Widget
Subsystem: UI Layer (Fleet Management)
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

from fleet.fleet_statistics import FleetStatisticsCalculator
from state.application_state import ApplicationState, StateStore, get_state_store
from widgets.status_card import StatusCard


class FleetStatusWidget(QFrame):
    """
    Real-time aggregated fleet status metrics displaying total active UAVs,
    average battery levels, formation type, spacing, and flight modes.
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

        hdr_lbl = QLabel("SWARM FLEET OVERVIEW & METRICS")
        hdr_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(hdr_lbl)

        grid = QGridLayout()
        grid.setContentsMargins(0, 0, 0, 0)
        grid.setSpacing(6)

        self.card_fleet_size = StatusCard("SWARM SIZE", "4", "Units", "#00f2fe")
        grid.addWidget(self.card_fleet_size, 0, 0)

        self.card_formation = StatusCard("ACTIVE FORMATION", "V_FORMATION", "", "#f59e0b")
        grid.addWidget(self.card_formation, 0, 1)

        self.card_spacing = StatusCard("SPACING", "25.0", "m", "#38bdf8")
        grid.addWidget(self.card_spacing, 1, 0)

        self.card_avg_bat = StatusCard("AVG BATTERY", "95.0", "%", "#10b981")
        grid.addWidget(self.card_avg_bat, 1, 1)

        layout.addLayout(grid)

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_state_updated(self, state: ApplicationState) -> None:
        stats = FleetStatisticsCalculator.compute_statistics(state.fleet_state)

        self.card_fleet_size.set_value(f"{stats.total_drones}")
        self.card_formation.set_value(stats.formation.replace("_", " "))
        self.card_spacing.set_value(f"{stats.spacing:.0f}")

        bat_color = "#10b981" if stats.avg_battery >= 50.0 else ("#f59e0b" if stats.avg_battery >= 20.0 else "#ef4444")
        self.card_avg_bat.set_value(f"{stats.avg_battery:.1f}", bat_color)

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
