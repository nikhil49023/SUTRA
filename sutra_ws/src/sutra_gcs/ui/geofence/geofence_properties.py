"""
Smart Horizon GCS — Geofence Spatial Geometry Metrics Card
Subsystem: UI Layer (Geofence)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QGridLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from geofence.geometry import GeofenceGeometry
from geofence.models import GeometryType
from state.application_state import ApplicationState, StateStore, get_state_store
from widgets.status_card import StatusCard


class GeofenceProperties(QFrame):
    """
    Real-time spatial property metric cards for the selected geofence.
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

        hdr_lbl = QLabel("AIRSPACE SPATIAL METRICS")
        hdr_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(hdr_lbl)

        grid = QGridLayout()
        grid.setContentsMargins(0, 0, 0, 0)
        grid.setSpacing(6)

        self.card_area = StatusCard("SURFACE AREA", "0.0", "m²", "#00f2fe")
        grid.addWidget(self.card_area, 0, 0)

        self.card_perim = StatusCard("PERIMETER", "0.0", "m", "#38bdf8")
        grid.addWidget(self.card_perim, 0, 1)

        self.card_vertices = StatusCard("VERTICES", "0", "", "#10b981")
        grid.addWidget(self.card_vertices, 1, 0)

        self.card_breach = StatusCard("AIRSPACE AUDIT", "SECURE", "", "#10b981")
        grid.addWidget(self.card_breach, 1, 1)

        layout.addLayout(grid)

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_state_updated(self, state: ApplicationState) -> None:
        selected = state.geofence_state.get_selected()
        if not selected:
            self.card_area.set_value("0.0")
            self.card_perim.set_value("0.0")
            self.card_vertices.set_value("0")
            self.card_breach.set_value("NO SELECTION", "#94a3b8")
            return

        if selected.geometry_type == GeometryType.CIRCLE:
            area_m2 = 3.14159 * (selected.radius ** 2)
            perim_m = 2 * 3.14159 * selected.radius
            v_count = 1
        elif selected.coordinates and len(selected.coordinates) >= 3:
            area_m2 = GeofenceGeometry.calculate_area(selected.coordinates)
            perim_m = GeofenceGeometry.calculate_perimeter(selected.coordinates)
            v_count = len(selected.coordinates)
        else:
            area_m2 = 0.0
            perim_m = 0.0
            v_count = len(selected.coordinates)

        if area_m2 > 1_000_000:
            self.card_area.set_value(f"{area_m2 / 1_000_000:.2f} km²")
        else:
            self.card_area.set_value(f"{area_m2:.0f} m²")

        self.card_perim.set_value(f"{perim_m:.0f} m")
        self.card_vertices.set_value(str(v_count))

        # Breach audit
        if selected.zone_type.value == "NO_FLY":
            self.card_breach.set_value("RESTRICTED", "#ef4444")
        elif selected.zone_type.value == "WARNING":
            self.card_breach.set_value("ADVISORY", "#f59e0b")
        else:
            self.card_breach.set_value("SAFE HAVEN", "#10b981")

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
