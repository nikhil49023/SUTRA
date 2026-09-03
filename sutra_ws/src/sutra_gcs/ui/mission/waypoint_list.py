"""
Smart Horizon GCS — Waypoint Sequence Table View
Subsystem: UI Layer (Mission)
"""

from typing import List, Optional

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QAbstractItemView,
    QFrame,
    QHBoxLayout,
    QLabel,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from mission.mission_manager import get_mission_manager
from mission.route_calculator import RouteCalculator
from mission.waypoint import Waypoint
from state.application_state import ApplicationState, StateStore, get_state_store


class WaypointList(QFrame):
    """
    Interactive tactical waypoint table sequence view.
    Observes MissionState and updates selection and ordering.
    """

    waypoint_selected = Signal(str)

    def __init__(self, state_store: Optional[StateStore] = None, parent=None) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self.setObjectName("panel")
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border: 1px solid #1e293b; border-radius: 4px; padding: 4px; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        hdr_lbl = QLabel("WAYPOINT FLIGHT SEQUENCE")
        hdr_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(hdr_lbl)

        # Table Widget
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels([
            "#", "COMMAND", "ALT (m)", "SPD (m/s)", "LEG DIST", "STATUS"
        ])
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SingleSelection)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.setStyleSheet(
            "QTableWidget { background-color: #050811; border: 1px solid #1e293b; gridline-color: #1e293b; font-size: 10px; } "
            "QHeaderView::section { background-color: #0b111e; color: #94a3b8; padding: 4px; font-weight: bold; border: 1px solid #1e293b; font-size: 9px; }"
        )
        self.table.itemSelectionChanged.connect(self._on_table_selection_changed)

        layout.addWidget(self.table)

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_state_updated(self, state: ApplicationState) -> None:
        """Refreshes table content directly from MissionState (Single Source of Truth)."""
        wps = state.mission_state.waypoints
        selected_id = state.mission_state.selected_waypoint_id
        home_lat = state.mission_state.home_latitude
        home_lon = state.mission_state.home_longitude

        segment_distances = RouteCalculator.calculate_segment_distances(wps, home_lat, home_lon)

        self.table.blockSignals(True)
        self.table.setRowCount(len(wps))

        selected_row = -1
        for i, wp in enumerate(wps):
            leg_m = segment_distances[i] if i < len(segment_distances) else 0.0

            item_num = QTableWidgetItem(f"WP{wp.index:02d}")
            item_cmd = QTableWidgetItem(wp.command.value)
            item_alt = QTableWidgetItem(f"{wp.altitude:.1f}")
            item_spd = QTableWidgetItem(f"{wp.speed:.1f}")
            item_dist = QTableWidgetItem(f"{leg_m:.1f} m")
            item_status = QTableWidgetItem("READY" if wp.enabled else "DISABLED")

            for item in (item_num, item_cmd, item_alt, item_spd, item_dist, item_status):
                item.setTextAlignment(Qt.AlignCenter)
                item.setData(Qt.UserRole, wp.id)

            self.table.setItem(i, 0, item_num)
            self.table.setItem(i, 1, item_cmd)
            self.table.setItem(i, 2, item_alt)
            self.table.setItem(i, 3, item_spd)
            self.table.setItem(i, 4, item_dist)
            self.table.setItem(i, 5, item_status)

            if wp.id == selected_id:
                selected_row = i

        if selected_row >= 0:
            self.table.selectRow(selected_row)
        else:
            self.table.clearSelection()

        self.table.blockSignals(False)

    def _on_table_selection_changed(self) -> None:
        selected_items = self.table.selectedItems()
        if selected_items:
            wp_id = selected_items[0].data(Qt.UserRole)
            if wp_id:
                get_mission_manager().select_waypoint(wp_id)
                self.waypoint_selected.emit(wp_id)

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
