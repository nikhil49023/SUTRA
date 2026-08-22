"""
Smart Horizon GCS — Tactical Measurement & Spatial Tool Panel
Subsystem: UI Layer (GIS Subsystem)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from gis.gis_controller import get_gis_controller
from gis.measurement import measurement_tool
from state.application_state import ApplicationState, StateStore, get_state_store


class MeasurementPanel(QFrame):
    """
    Tactical distance, azimuth, elevation delta, and geodesic polygon area measurement panel.
    """

    def __init__(self, state_store: Optional[StateStore] = None, parent=None) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self.gis_controller = get_gis_controller()

        self.setObjectName("panel")
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border: 1px solid #1e293b; border-radius: 4px; padding: 6px; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        hdr = QLabel("TACTICAL MEASUREMENT TOOLS")
        hdr.setStyleSheet("color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;")
        layout.addWidget(hdr)

        btn_layout = QHBoxLayout()
        self.btn_measure = QPushButton("📏 MEASURE VECTOR (P1 → P2)")
        self.btn_measure.setStyleSheet("background-color: rgba(0, 242, 254, 0.15); border: 1px solid #00f2fe; color: #00f2fe; font-weight: bold; padding: 4px;")
        self.btn_measure.clicked.connect(self._on_measure_sample)
        btn_layout.addWidget(self.btn_measure)

        self.btn_clear = QPushButton("🗑️ CLEAR")
        self.btn_clear.setStyleSheet("background-color: rgba(148, 163, 184, 0.1); border: 1px solid #64748b; color: #cbd5e1; font-weight: bold; padding: 4px;")
        self.btn_clear.clicked.connect(self._on_clear_measure)
        btn_layout.addWidget(self.btn_clear)

        layout.addLayout(btn_layout)

        # Metrics Grid
        grid = QGridLayout()
        grid.setSpacing(4)

        self.lbl_dist = QLabel("-- m")
        self.lbl_bearing = QLabel("-- °")
        self.lbl_elev_diff = QLabel("-- m")
        self.lbl_area = QLabel("-- m²")

        grid.addWidget(QLabel("GEODESIC DISTANCE:"), 0, 0)
        grid.addWidget(self.lbl_dist, 0, 1)
        grid.addWidget(QLabel("TRUE AZIMUTH:"), 1, 0)
        grid.addWidget(self.lbl_bearing, 1, 1)
        grid.addWidget(QLabel("ELEVATION DELTA:"), 2, 0)
        grid.addWidget(self.lbl_elev_diff, 2, 1)
        grid.addWidget(QLabel("POLYGON SURFACE AREA:"), 3, 0)
        grid.addWidget(self.lbl_area, 3, 1)

        layout.addLayout(grid)

    def _on_measure_sample(self) -> None:
        state = self.state_store.get_state()
        p1 = (state.mission_state.home_latitude, state.mission_state.home_longitude)
        leader = state.fleet_state.get_leader()
        p2 = (leader.latitude, leader.longitude) if leader else (p1[0] + 0.003, p1[1] + 0.004)

        res = self.gis_controller.run_measurement(p1, p2)

        self.lbl_dist.setText(f"{res.distance_m:.1f} m")
        self.lbl_bearing.setText(f"{res.bearing_deg:.1f}°")
        self.lbl_elev_diff.setText(f"{res.elevation_diff_m:+.1f} m")
        self.lbl_area.setText("N/A (Linear Vector)")

    def _on_clear_measure(self) -> None:
        self.gis_controller.toggle_overlay("measurement", False)
        self.lbl_dist.setText("-- m")
        self.lbl_bearing.setText("-- °")
        self.lbl_elev_diff.setText("-- m")
        self.lbl_area.setText("-- m²")
