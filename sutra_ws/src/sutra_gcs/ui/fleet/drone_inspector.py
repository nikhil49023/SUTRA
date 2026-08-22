"""
Smart Horizon GCS — Swarm Drone Detail Inspector Widget
Subsystem: UI Layer (Fleet Management)
"""

import math
from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QGridLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from mission.route_calculator import RouteCalculator
from state.application_state import ApplicationState, StateStore, get_state_store
from state.fleet_state import DroneState


class DroneInspectorWidget(QFrame):
    """
    Dedicated drone inspector detailing individual telemetry parameters,
    formation index, target setpoints, and distance to formation position.
    """

    def __init__(self, state_store: Optional[StateStore] = None, parent=None) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()

        self.setObjectName("panel")
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border: 1px solid #1e293b; border-radius: 4px; padding: 6px; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        self.hdr_lbl = QLabel("AIRCRAFT TELEMETRY INSPECTOR")
        self.hdr_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(self.hdr_lbl)

        # Attribute Grid
        self.attr_layout = QGridLayout()
        self.attr_layout.setContentsMargins(0, 0, 0, 0)
        self.attr_layout.setSpacing(4)
        layout.addLayout(self.attr_layout)

        layout.addStretch()

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_state_updated(self, state: ApplicationState) -> None:
        selected_id = state.map_state.selected_drone_id
        drone = state.fleet_state.get_drone(selected_id) if selected_id else state.fleet_state.get_leader()

        while self.attr_layout.count():
            item = self.attr_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        if not drone:
            self.hdr_lbl.setText("AIRCRAFT TELEMETRY INSPECTOR")
            lbl = QLabel("No drone selected in swarm fleet.")
            lbl.setStyleSheet("color: #64748b; font-size: 9px;")
            self.attr_layout.addWidget(lbl, 0, 0)
            return

        self.hdr_lbl.setText(f"INSPECTOR: {drone.callsign.upper()}")

        # Distance to formation target
        dist_to_target = 0.0
        if drone.target_latitude is not None and drone.target_longitude is not None:
            dist_to_target = RouteCalculator.calculate_distance(
                drone.latitude, drone.longitude, drone.target_latitude, drone.target_longitude
            )

        attrs = [
            ("CALLSIGN", drone.callsign),
            ("SWARM ROLE", "★ APEX LEADER" if drone.is_leader else drone.role),
            ("COORDINATES", f"{drone.latitude:.6f}, {drone.longitude:.6f}"),
            ("ALTITUDE AGL", f"{drone.altitude:.1f} m"),
            ("GROUND SPEED", f"{drone.speed:.1f} m/s"),
            ("HEADING", f"{drone.heading:.0f}°"),
            ("BATTERY PACK", f"{drone.battery:.1f}%"),
            ("FLIGHT MODE", drone.flight_mode),
            ("LINK STATUS", drone.connection_status),
            ("FORMATION SLOT", f"#{drone.formation_index} ({drone.formation})"),
            ("OFFSET (E / N)", f"{drone.offset_x:+.1f}m / {drone.offset_y:+.1f}m"),
            ("DIST TO TARGET", f"{dist_to_target:.2f} m"),
        ]

        for r, (k, v) in enumerate(attrs):
            k_lbl = QLabel(k)
            k_lbl.setStyleSheet("color: #64748b; font-size: 8px; font-weight: bold;")
            v_lbl = QLabel(str(v))
            v_lbl.setStyleSheet("color: #f8fafc; font-size: 10px; font-weight: bold;")
            if "LEADER" in str(v):
                v_lbl.setStyleSheet("color: #fbbf24; font-size: 10px; font-weight: bold;")
            self.attr_layout.addWidget(k_lbl, r, 0)
            self.attr_layout.addWidget(v_lbl, r, 1)

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
