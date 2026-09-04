"""
Smart Horizon GCS — Geofence Properties & Configuration Editor Panel
Subsystem: UI Layer (Geofence)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QDoubleSpinBox,
    QFormLayout,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from geofence.models import Geofence, GeometryType, ZoneType
from geofence.service import get_geofence_service
from state.application_state import ApplicationState, StateStore, get_state_store


class GeofenceEditor(QFrame):
    """
    Parameter editor for adjusting geofence boundaries, altitude safety buffers, and zone categories.
    """

    def __init__(self, state_store: Optional[StateStore] = None, parent=None) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self._current_geofence_id: Optional[str] = None
        self._updating_ui = False

        self.setObjectName("panel")
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border: 1px solid #1e293b; border-radius: 4px; padding: 6px; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        self.title_lbl = QLabel("GEOFENCE EDITOR: NO SELECTION")
        self.title_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(self.title_lbl)

        form = QFormLayout()
        form.setContentsMargins(0, 4, 0, 4)
        form.setSpacing(6)

        # 1. Name
        self.edit_name = QLineEdit()
        self.edit_name.textChanged.connect(self._on_param_changed)
        form.addRow("NAME:", self.edit_name)

        # 2. Zone Type
        self.combo_type = QComboBox()
        for zt in ZoneType:
            self.combo_type.addItem(zt.value, zt)
        self.combo_type.currentIndexChanged.connect(self._on_param_changed)
        form.addRow("ZONE TYPE:", self.combo_type)

        # 3. Altitude Min / Max
        self.spin_alt_min = QDoubleSpinBox()
        self.spin_alt_min.setRange(0.0, 500.0)
        self.spin_alt_min.setSingleStep(5.0)
        self.spin_alt_min.valueChanged.connect(self._on_param_changed)
        form.addRow("ALT MIN (m):", self.spin_alt_min)

        self.spin_alt_max = QDoubleSpinBox()
        self.spin_alt_max.setRange(0.0, 500.0)
        self.spin_alt_max.setSingleStep(5.0)
        self.spin_alt_max.valueChanged.connect(self._on_param_changed)
        form.addRow("ALT MAX (m):", self.spin_alt_max)

        # 4. Circle Radius / Corridor Width
        self.spin_size = QDoubleSpinBox()
        self.spin_size.setRange(5.0, 5000.0)
        self.spin_size.setSingleStep(10.0)
        self.spin_size.valueChanged.connect(self._on_param_changed)
        self.lbl_size = QLabel("RADIUS (m):")
        form.addRow(self.lbl_size, self.spin_size)

        # 5. Enabled / Visible
        self.chk_enabled = QCheckBox("Enforce Safety Rules")
        self.chk_enabled.toggled.connect(self._on_param_changed)
        form.addRow("STATUS:", self.chk_enabled)

        self.chk_visible = QCheckBox("Show On Map")
        self.chk_visible.toggled.connect(self._on_param_changed)
        form.addRow("VISIBILITY:", self.chk_visible)

        layout.addLayout(form)

        # Delete Button
        self.btn_del = QPushButton("🗑️ DELETE THIS GEOFENCE")
        self.btn_del.setStyleSheet(
            "background-color: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; padding: 6px; font-weight: bold;"
        )
        self.btn_del.clicked.connect(self._on_delete_clicked)
        layout.addWidget(self.btn_del)

        layout.addStretch()

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_state_updated(self, state: ApplicationState) -> None:
        selected = state.geofence_state.get_selected()
        if not selected:
            self._current_geofence_id = None
            self.title_lbl.setText("GEOFENCE EDITOR: NO SELECTION")
            self.setEnabled(False)
            return

        self._current_geofence_id = selected.id
        self.setEnabled(True)
        self.title_lbl.setText(f"GEOFENCE EDITOR: {selected.name.upper()}")

        self._updating_ui = True
        try:
            self.edit_name.setText(selected.name)
            self.combo_type.setCurrentText(selected.zone_type.value)
            self.spin_alt_min.setValue(selected.altitude_min)
            self.spin_alt_max.setValue(selected.altitude_max)

            if selected.geometry_type == GeometryType.CIRCLE:
                self.lbl_size.setText("RADIUS (m):")
                self.spin_size.setValue(selected.radius)
                self.spin_size.setEnabled(True)
            elif selected.geometry_type == GeometryType.CORRIDOR:
                self.lbl_size.setText("WIDTH (m):")
                self.spin_size.setValue(selected.corridor_width)
                self.spin_size.setEnabled(True)
            else:
                self.lbl_size.setText("SIZE (m):")
                self.spin_size.setEnabled(False)

            self.chk_enabled.setChecked(selected.enabled)
            self.chk_visible.setChecked(selected.visible)
        finally:
            self._updating_ui = False

    def _on_param_changed(self) -> None:
        if self._updating_ui or not self._current_geofence_id:
            return

        srv = get_geofence_service()
        selected = srv.get_geofence(self._current_geofence_id)
        if not selected:
            return

        zone_type = self.combo_type.currentData() or ZoneType.NO_FLY
        kwargs = {
            "name": self.edit_name.text(),
            "zone_type": zone_type,
            "altitude_min": self.spin_alt_min.value(),
            "altitude_max": self.spin_alt_max.value(),
            "enabled": self.chk_enabled.isChecked(),
            "visible": self.chk_visible.isChecked(),
        }

        if selected.geometry_type == GeometryType.CIRCLE:
            kwargs["radius"] = self.spin_size.value()
        elif selected.geometry_type == GeometryType.CORRIDOR:
            kwargs["corridor_width"] = self.spin_size.value()

        srv.update_geofence(self._current_geofence_id, **kwargs)

    def _on_delete_clicked(self) -> None:
        if self._current_geofence_id:
            get_geofence_service().delete_geofence(self._current_geofence_id)

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
