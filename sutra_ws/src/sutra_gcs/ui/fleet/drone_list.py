"""
Smart Horizon GCS — Swarm Drone Fleet Registry & Roster Table Widget
Subsystem: UI Layer (Fleet Management)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from fleet.fleet_manager import get_fleet_manager
from state.application_state import ApplicationState, StateStore, get_state_store
from state.map_state import MapState


class DroneListWidget(QFrame):
    """
    Interactive swarm roster table displaying live status, battery levels,
    roles, and leader promotion controls for all registered aircraft.
    """

    def __init__(self, state_store: Optional[StateStore] = None, parent=None) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self.fleet_manager = get_fleet_manager()

        self.setObjectName("panel")
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border: 1px solid #1e293b; border-radius: 4px; padding: 6px; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        hdr_lbl = QLabel("SWARM AIRCRAFT ROSTER")
        hdr_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(hdr_lbl)

        # Roster Table
        self.table = QTableWidget()
        self.table.setColumnCount(5)
        self.table.setHorizontalHeaderLabels(["CALLSIGN", "ROLE", "BATTERY", "ALTITUDE", "STATUS"])
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        self.table.setSelectionMode(QTableWidget.SingleSelection)
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.setStyleSheet(
            "QTableWidget { background-color: #050811; border: 1px solid #1e293b; gridline-color: #1e293b; font-size: 10px; color: #f8fafc; } "
            "QHeaderView::section { background-color: #0b111e; color: #94a3b8; padding: 4px; font-weight: bold; border: 1px solid #1e293b; font-size: 9px; }"
        )
        self.table.itemSelectionChanged.connect(self._on_row_selected)
        layout.addWidget(self.table)

        # Actions Toolbar
        btn_layout = QHBoxLayout()
        self.btn_add_drone = QPushButton("➕ ADD DRONE")
        self.btn_add_drone.setStyleSheet(
            "background-color: rgba(0, 242, 254, 0.15); border: 1px solid #00f2fe; color: #00f2fe; font-weight: bold; padding: 4px 8px;"
        )
        self.btn_add_drone.clicked.connect(self._on_add_drone_clicked)
        btn_layout.addWidget(self.btn_add_drone)

        self.btn_make_leader = QPushButton("★ SET LEADER")
        self.btn_make_leader.setStyleSheet(
            "background-color: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; color: #fde68a; font-weight: bold; padding: 4px 8px;"
        )
        self.btn_make_leader.clicked.connect(self._on_make_leader_clicked)
        btn_layout.addWidget(self.btn_make_leader)

        self.btn_remove_drone = QPushButton("🗑️ REMOVE")
        self.btn_remove_drone.setStyleSheet(
            "background-color: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; font-weight: bold; padding: 4px 8px;"
        )
        self.btn_remove_drone.clicked.connect(self._on_remove_drone_clicked)
        btn_layout.addWidget(self.btn_remove_drone)

        layout.addLayout(btn_layout)

        # Initial populate and state subscription
        self._populate_table()
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _populate_table(self) -> None:
        fleet = self.state_store.get_state().fleet_state
        drones = fleet.get_all_drones()

        self.table.blockSignals(True)
        self.table.setRowCount(len(drones))

        selected_id = self.state_store.get_state().map_state.selected_drone_id
        selected_row = -1

        for r, d in enumerate(drones):
            cs_item = QTableWidgetItem(f"{'★ ' if d.is_leader else ''}{d.callsign}")
            role_item = QTableWidgetItem(d.role)
            bat_item = QTableWidgetItem(f"{d.battery:.0f}%")
            alt_item = QTableWidgetItem(f"{d.altitude:.1f}m")
            stat_item = QTableWidgetItem(d.connection_status)

            for item in (cs_item, role_item, bat_item, alt_item, stat_item):
                item.setTextAlignment(Qt.AlignCenter)
                if d.is_leader:
                    item.setForeground(Qt.GlobalColor.yellow)

            self.table.setItem(r, 0, cs_item)
            self.table.setItem(r, 1, role_item)
            self.table.setItem(r, 2, bat_item)
            self.table.setItem(r, 3, alt_item)
            self.table.setItem(r, 4, stat_item)

            if d.drone_id == selected_id:
                selected_row = r

        if selected_row >= 0:
            self.table.selectRow(selected_row)

        self.table.blockSignals(False)

    def _on_row_selected(self) -> None:
        row = self.table.currentRow()
        if row < 0:
            return

        fleet = self.state_store.get_state().fleet_state
        drones = fleet.get_all_drones()
        if 0 <= row < len(drones):
            target_drone = drones[row]
            from dataclasses import replace
            self.state_store.update_state(
                lambda s: replace(
                    s,
                    map_state=replace(s.map_state, selected_drone_id=target_drone.drone_id),
                )
            )

    def _on_add_drone_clicked(self) -> None:
        fleet = self.state_store.get_state().fleet_state
        count = len(fleet.drones)
        names = ["Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet"]
        name = names[count % len(names)]
        drone_id = f"drone_{name.lower()}"

        leader = fleet.get_leader()
        origin_lat = leader.latitude if leader else 37.774929
        origin_lon = leader.longitude if leader else -122.419416

        self.fleet_manager.register_drone(
            drone_id=drone_id,
            callsign=f"{name.upper()} (SCOUT)",
            role="SCOUT",
            latitude=origin_lat,
            longitude=origin_lon,
            altitude=25.0,
            battery=100.0,
        )

    def _on_make_leader_clicked(self) -> None:
        row = self.table.currentRow()
        fleet = self.state_store.get_state().fleet_state
        drones = fleet.get_all_drones()
        if 0 <= row < len(drones):
            self.fleet_manager.set_leader(drones[row].drone_id)

    def _on_remove_drone_clicked(self) -> None:
        row = self.table.currentRow()
        fleet = self.state_store.get_state().fleet_state
        drones = fleet.get_all_drones()
        if 0 <= row < len(drones):
            self.fleet_manager.remove_drone(drones[row].drone_id)

    def _on_state_updated(self, state: ApplicationState) -> None:
        self._populate_table()

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
