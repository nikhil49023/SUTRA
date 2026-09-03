"""
Smart Horizon GCS — Geofence Airspace Registry Table Sidebar
Subsystem: UI Layer (Geofence)
"""

from typing import Optional

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QAbstractItemView,
    QComboBox,
    QFrame,
    QHBoxLayout,
    QLabel,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from geofence.geometry import GeofenceGeometry
from geofence.models import Geofence, GeometryType, ZoneType
from geofence.service import get_geofence_service
from state.application_state import ApplicationState, StateStore, get_state_store


class GeofenceSidebar(QFrame):
    """
    List and filter panel for all active geofence boundaries.
    """

    geofence_selected = Signal(str)

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

        # Header & Filter
        hdr_layout = QHBoxLayout()
        hdr_lbl = QLabel("AIRSPACE GEOFENCE DIRECTORY")
        hdr_lbl.setStyleSheet("color: #00f2fe; font-size: 10px; font-weight: bold;")
        hdr_layout.addWidget(hdr_lbl)

        self.filter_combo = QComboBox()
        self.filter_combo.addItems(["ALL", "NO_FLY", "WARNING", "SAFE"])
        self.filter_combo.currentTextChanged.connect(self._on_filter_changed)
        hdr_layout.addWidget(self.filter_combo)
        layout.addLayout(hdr_layout)

        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(5)
        self.table.setHorizontalHeaderLabels([
            "NAME", "TYPE", "GEOMETRY", "AREA (m²)", "ALTITUDE"
        ])
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SingleSelection)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.setStyleSheet(
            "QTableWidget { background-color: #050811; border: 1px solid #1e293b; gridline-color: #1e293b; font-size: 10px; } "
            "QHeaderView::section { background-color: #0b111e; color: #94a3b8; padding: 4px; font-weight: bold; border: 1px solid #1e293b; font-size: 9px; }"
        )
        self.table.itemSelectionChanged.connect(self._on_table_selection)
        layout.addWidget(self.table)

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_filter_changed(self, text: str) -> None:
        self._on_state_updated(self.state_store.get_state())

    def _on_state_updated(self, state: ApplicationState) -> None:
        geofences = state.geofence_state.geofences
        selected_id = state.geofence_state.selected_geofence_id
        filter_type = self.filter_combo.currentText()

        filtered = [
            g for g in geofences
            if filter_type == "ALL" or g.zone_type.value == filter_type
        ]

        self.table.blockSignals(True)
        self.table.setRowCount(len(filtered))

        selected_row = -1
        for i, g in enumerate(filtered):
            # Calculate Area
            area_m2 = 0.0
            if g.geometry_type == GeometryType.CIRCLE:
                area_m2 = 3.14159 * (g.radius ** 2)
            elif g.coordinates and len(g.coordinates) >= 3:
                area_m2 = GeofenceGeometry.calculate_area(g.coordinates)

            item_name = QTableWidgetItem(g.name)
            item_type = QTableWidgetItem(g.zone_type.value)
            item_geom = QTableWidgetItem(g.geometry_type.value)
            item_area = QTableWidgetItem(f"{area_m2:.0f}")
            item_alt = QTableWidgetItem(f"{g.altitude_min:.0f}-{g.altitude_max:.0f}m")

            for item in (item_name, item_type, item_geom, item_area, item_alt):
                item.setTextAlignment(Qt.AlignCenter)
                item.setData(Qt.UserRole, g.id)

            # Color type
            type_color = (
                "#ef4444"
                if g.zone_type == ZoneType.NO_FLY
                else ("#f59e0b" if g.zone_type == ZoneType.WARNING else "#10b981")
            )
            item_type.setForeground(Qt.GlobalColor.red if g.zone_type == ZoneType.NO_FLY else Qt.GlobalColor.yellow)

            self.table.setItem(i, 0, item_name)
            self.table.setItem(i, 1, item_type)
            self.table.setItem(i, 2, item_geom)
            self.table.setItem(i, 3, item_area)
            self.table.setItem(i, 4, item_alt)

            if g.id == selected_id:
                selected_row = i

        if selected_row >= 0:
            self.table.selectRow(selected_row)
        else:
            self.table.clearSelection()

        self.table.blockSignals(False)

    def _on_table_selection(self) -> None:
        selected = self.table.selectedItems()
        if selected:
            g_id = selected[0].data(Qt.UserRole)
            if g_id:
                get_geofence_service().select_geofence(g_id)
                self.geofence_selected.emit(g_id)

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
