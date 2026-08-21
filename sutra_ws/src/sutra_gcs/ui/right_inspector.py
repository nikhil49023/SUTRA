"""
Smart Horizon GCS — Right Inspector Context-Aware Panel
Subsystem: UI Layer
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QScrollArea,
    QVBoxLayout,
    QWidget,
)

from state.application_state import ApplicationState, StateStore, get_state_store
from state.fleet_state import DroneState
from widgets.telemetry_card import TelemetryCard


class RightInspector(QFrame):
    """
    Context-aware telemetry and asset inspector. Dynamically switches between
    Swarm Overview, Selected Drone Avionics, and Mission Progress modes.
    """

    def __init__(self, state_store: Optional[StateStore] = None, parent=None) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()

        self.setObjectName("panel")
        self.setFixedWidth(280)
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border-left: 1px solid #1e293b; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 10, 8, 10)
        layout.setSpacing(8)

        # Header Title
        self.header_title = QLabel("INSPECTOR: SYSTEM")
        self.header_title.setStyleSheet(
            "color: #00f2fe; font-size: 11px; font-weight: 800; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(self.header_title)

        # Scrollable Container for Dynamic Content
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("background: transparent; border: none;")

        self.content_widget = QWidget()
        self.content_layout = QVBoxLayout(self.content_widget)
        self.content_layout.setContentsMargins(0, 0, 0, 0)
        self.content_layout.setSpacing(8)

        # Primary Telemetry Card Widget
        self.telem_card = TelemetryCard("AIRCRAFT AVIONICS")
        self.content_layout.addWidget(self.telem_card)

        # Key-Value Attributes Grid
        self.attr_frame = QFrame()
        self.attr_frame.setStyleSheet(
            "background-color: #0b111e; border: 1px solid #1e293b; border-radius: 4px; padding: 6px;"
        )
        self.attr_layout = QGridLayout(self.attr_frame)
        self.attr_layout.setContentsMargins(4, 4, 4, 4)
        self.attr_layout.setSpacing(6)
        self.content_layout.addWidget(self.attr_frame)

        # Dynamic Action Buttons
        self.actions_frame = QFrame()
        self.actions_layout = QVBoxLayout(self.actions_frame)
        self.actions_layout.setContentsMargins(0, 0, 0, 0)
        self.actions_layout.setSpacing(4)

        self.btn_action1 = QPushButton("⚡ ENGAGE RTL")
        self.btn_action1.setStyleSheet(
            "background-color: #1e293b; border: 1px solid #38bdf8; color: #38bdf8; font-weight: bold; padding: 6px;"
        )
        self.actions_layout.addWidget(self.btn_action1)

        self.btn_action2 = QPushButton("🎯 DESELECT")
        self.btn_action2.setStyleSheet(
            "background-color: #111827; border: 1px solid #334155; color: #94a3b8; padding: 4px;"
        )
        self.btn_action2.clicked.connect(self._on_deselect_clicked)
        self.actions_layout.addWidget(self.btn_action2)

        self.content_layout.addWidget(self.actions_frame)
        self.content_layout.addStretch()

        scroll.setWidget(self.content_widget)
        layout.addWidget(scroll)

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_deselect_clicked(self) -> None:
        self.state_store.update_state(
            lambda s: s.map_state.__class__(
                **{**s.map_state.__dict__, "selected_drone_id": None}
            ) and s
        )

    def _on_state_updated(self, state: ApplicationState) -> None:
        selected_drone_id = state.map_state.selected_drone_id
        fleet = state.fleet_state

        if selected_drone_id and fleet.get_drone(selected_drone_id):
            # 1. DRONE SELECTED CONTEXT
            drone = fleet.get_drone(selected_drone_id)
            self.header_title.setText(f"INSPECTOR: {drone.callsign.upper()}")

            self.telem_card.update_telemetry(
                alt_agl=drone.altitude,
                speed=drone.speed,
                climb=0.0,
                heading=drone.heading,
                battery=drone.battery,
                pitch=0.0,
                roll=0.0,
            )
            self._render_drone_attributes(drone)
        else:
            # 2. SYSTEM OVERVIEW CONTEXT
            self.header_title.setText("INSPECTOR: SWARM OVERVIEW")
            telem = state.telemetry_state
            self.telem_card.update_telemetry(
                alt_agl=telem.altitude_agl,
                speed=telem.ground_speed,
                climb=telem.vertical_speed,
                heading=telem.heading,
                battery=telem.battery_percent,
                pitch=telem.pitch,
                roll=telem.roll,
            )
            self._render_system_attributes(state)

    def _render_drone_attributes(self, drone: DroneState) -> None:
        self._clear_attributes()
        attrs = [
            ("CALLSIGN", drone.callsign),
            ("ROLE", drone.role),
            ("FLIGHT MODE", drone.flight_mode),
            ("STATUS", drone.connection_status),
            ("POSITION", f"{drone.latitude:.5f}, {drone.longitude:.5f}"),
            ("SWARM LEADER", "YES (APEX)" if drone.is_leader else "NO (FOLLOWER)"),
            ("FORMATION", drone.formation),
        ]
        for r, (k, v) in enumerate(attrs):
            k_lbl = QLabel(k)
            k_lbl.setStyleSheet("color: #64748b; font-size: 8px; font-weight: bold;")
            v_lbl = QLabel(str(v))
            v_lbl.setStyleSheet("color: #f8fafc; font-size: 10px; font-weight: bold;")
            self.attr_layout.addWidget(k_lbl, r, 0)
            self.attr_layout.addWidget(v_lbl, r, 1)

    def _render_system_attributes(self, state: ApplicationState) -> None:
        self._clear_attributes()
        drones = state.fleet_state.get_all_drones()
        mission = state.mission_state

        attrs = [
            ("TOTAL DRONES", f"{len(drones)} Units"),
            ("MISSION ID", mission.mission_name),
            ("MISSION STATE", mission.state.value),
            ("PROGRESS", f"{mission.mission_progress:.1f}%"),
            ("RISK LEVEL", mission.risk_level),
            ("VALIDATION", mission.validation_status),
            ("CLEARANCE", state.current_user),
        ]
        for r, (k, v) in enumerate(attrs):
            k_lbl = QLabel(k)
            k_lbl.setStyleSheet("color: #64748b; font-size: 8px; font-weight: bold;")
            v_lbl = QLabel(str(v))
            v_lbl.setStyleSheet("color: #f8fafc; font-size: 10px; font-weight: bold;")
            self.attr_layout.addWidget(k_lbl, r, 0)
            self.attr_layout.addWidget(v_lbl, r, 1)

    def _clear_attributes(self) -> None:
        while self.attr_layout.count():
            item = self.attr_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
