"""
Smart Horizon GCS — Waypoint Properties Parameter Editor Panel
Subsystem: UI Layer (Mission)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QComboBox,
    QDoubleSpinBox,
    QFormLayout,
    QFrame,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from mission.mission_manager import get_mission_manager
from mission.waypoint import Waypoint, WaypointCommand
from state.application_state import ApplicationState, StateStore, get_state_store


class WaypointEditor(QFrame):
    """
    Dedicated properties editor allowing dynamic parameter tuning for the selected waypoint.
    Directly mutates MissionState through MissionManager.
    """

    def __init__(self, state_store: Optional[StateStore] = None, parent=None) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self._current_wp_id: Optional[str] = None
        self._updating_ui = False

        self.setObjectName("panel")
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border: 1px solid #1e293b; border-radius: 4px; padding: 6px; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        self.title_lbl = QLabel("WAYPOINT EDITOR: NO SELECTION")
        self.title_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(self.title_lbl)

        # Form Layout
        form = QFormLayout()
        form.setContentsMargins(0, 4, 0, 4)
        form.setSpacing(6)

        # 1. Command
        self.cmd_combo = QComboBox()
        for cmd in WaypointCommand:
            self.cmd_combo.addItem(cmd.value)
        self.cmd_combo.currentIndexChanged.connect(self._on_param_changed)
        form.addRow("COMMAND:", self.cmd_combo)

        # 2. Latitude & Longitude
        self.spin_lat = QDoubleSpinBox()
        self.spin_lat.setRange(-90.0, 90.0)
        self.spin_lat.setDecimals(6)
        self.spin_lat.setSingleStep(0.0001)
        self.spin_lat.valueChanged.connect(self._on_param_changed)
        form.addRow("LATITUDE (°):", self.spin_lat)

        self.spin_lon = QDoubleSpinBox()
        self.spin_lon.setRange(-180.0, 180.0)
        self.spin_lon.setDecimals(6)
        self.spin_lon.setSingleStep(0.0001)
        self.spin_lon.valueChanged.connect(self._on_param_changed)
        form.addRow("LONGITUDE (°):", self.spin_lon)

        # 3. Altitude AGL
        self.spin_alt = QDoubleSpinBox()
        self.spin_alt.setRange(2.0, 120.0)
        self.spin_alt.setDecimals(1)
        self.spin_alt.setSingleStep(1.0)
        self.spin_alt.valueChanged.connect(self._on_param_changed)
        form.addRow("ALTITUDE (m):", self.spin_alt)

        # 4. Speed
        self.spin_speed = QDoubleSpinBox()
        self.spin_speed.setRange(0.5, 25.0)
        self.spin_speed.setDecimals(1)
        self.spin_speed.setSingleStep(0.5)
        self.spin_speed.valueChanged.connect(self._on_param_changed)
        form.addRow("SPEED (m/s):", self.spin_speed)

        # 5. Heading
        self.spin_heading = QDoubleSpinBox()
        self.spin_heading.setRange(0.0, 360.0)
        self.spin_heading.setDecimals(0)
        self.spin_heading.valueChanged.connect(self._on_param_changed)
        form.addRow("HEADING (°):", self.spin_heading)

        # 6. Hold Time
        self.spin_hold = QDoubleSpinBox()
        self.spin_hold.setRange(0.0, 600.0)
        self.spin_hold.setDecimals(1)
        self.spin_hold.valueChanged.connect(self._on_param_changed)
        form.addRow("HOLD TIME (s):", self.spin_hold)

        # 7. Acceptance Radius
        self.spin_radius = QDoubleSpinBox()
        self.spin_radius.setRange(0.5, 20.0)
        self.spin_radius.setDecimals(1)
        self.spin_radius.valueChanged.connect(self._on_param_changed)
        form.addRow("ACCEPT RADIUS (m):", self.spin_radius)

        layout.addLayout(form)

        # Delete Button
        self.btn_del = QPushButton("🗑️ DELETE THIS WAYPOINT")
        self.btn_del.setStyleSheet(
            "background-color: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; padding: 6px; font-weight: bold;"
        )
        self.btn_del.clicked.connect(self._on_delete_clicked)
        layout.addWidget(self.btn_del)

        layout.addStretch()

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_state_updated(self, state: ApplicationState) -> None:
        selected_id = state.mission_state.selected_waypoint_id
        if not selected_id:
            self._current_wp_id = None
            self.title_lbl.setText("WAYPOINT EDITOR: NO SELECTION")
            self.setEnabled(False)
            return

        wp = None
        for w in state.mission_state.waypoints:
            if w.id == selected_id:
                wp = w
                break

        if not wp:
            self._current_wp_id = None
            self.title_lbl.setText("WAYPOINT EDITOR: NO SELECTION")
            self.setEnabled(False)
            return

        self._current_wp_id = wp.id
        self.setEnabled(True)
        self.title_lbl.setText(f"WAYPOINT EDITOR: WP{wp.index:02d}")

        self._updating_ui = True
        try:
            self.cmd_combo.setCurrentText(wp.command.value)
            self.spin_lat.setValue(wp.latitude)
            self.spin_lon.setValue(wp.longitude)
            self.spin_alt.setValue(wp.altitude)
            self.spin_speed.setValue(wp.speed)
            self.spin_heading.setValue(wp.heading)
            self.spin_hold.setValue(wp.hold_time)
            self.spin_radius.setValue(wp.acceptance_radius)
        finally:
            self._updating_ui = False

    def _on_param_changed(self) -> None:
        if self._updating_ui or not self._current_wp_id:
            return

        cmd_enum = WaypointCommand(self.cmd_combo.currentText())
        get_mission_manager().update_waypoint(
            self._current_wp_id,
            command=cmd_enum,
            latitude=self.spin_lat.value(),
            longitude=self.spin_lon.value(),
            altitude=self.spin_alt.value(),
            speed=self.spin_speed.value(),
            heading=self.spin_heading.value(),
            hold_time=self.spin_hold.value(),
            acceptance_radius=self.spin_radius.value(),
        )

    def _on_delete_clicked(self) -> None:
        if self._current_wp_id:
            get_mission_manager().delete_waypoint(self._current_wp_id)

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
