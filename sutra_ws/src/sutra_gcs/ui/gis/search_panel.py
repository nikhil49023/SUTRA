"""
Smart Horizon GCS — Tactical SAR / Survey Search Grid Control Panel
Subsystem: UI Layer (GIS Subsystem)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QComboBox,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QSlider,
    QVBoxLayout,
    QWidget,
)

from gis.gis_controller import get_gis_controller
from gis.models import SearchGridConfig, SearchPattern
from state.application_state import ApplicationState, StateStore, get_state_store


class SearchPanel(QFrame):
    """
    Autonomous Search & Rescue (SAR) transects, lawn-mower coverage, and perimeter sweep generator.
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

        hdr = QLabel("SAR & SURVEY SEARCH PATTERNS")
        hdr.setStyleSheet("color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;")
        layout.addWidget(hdr)

        # Pattern Selection
        p_layout = QHBoxLayout()
        p_lbl = QLabel("PATTERN:")
        p_lbl.setStyleSheet("color: #94a3b8; font-size: 9px; font-weight: bold;")
        p_layout.addWidget(p_lbl)

        self.combo_pattern = QComboBox()
        self.combo_pattern.setStyleSheet("background-color: #050811; border: 1px solid #1e293b; color: #f8fafc; font-size: 9px; padding: 2px;")
        self.combo_pattern.addItem("LAWN-MOWER (PARALLEL SWEEP)", SearchPattern.LAWN_MOWER)
        self.combo_pattern.addItem("PERIMETER (BOUNDARY CONTOUR)", SearchPattern.PERIMETER)
        self.combo_pattern.addItem("2D MATRIX GRID (AREA SCAN)", SearchPattern.GRID)
        p_layout.addWidget(self.combo_pattern)
        layout.addLayout(p_layout)

        # Spacing Slider
        s_layout = QVBoxLayout()
        self.lbl_spacing = QLabel("LANE SPACING: 25 METERS")
        self.lbl_spacing.setStyleSheet("color: #94a3b8; font-size: 9px; font-weight: bold;")
        s_layout.addWidget(self.lbl_spacing)

        self.slider_spacing = QSlider(Qt.Horizontal)
        self.slider_spacing.setRange(10, 80)
        self.slider_spacing.setValue(25)
        self.slider_spacing.valueChanged.connect(lambda v: self.lbl_spacing.setText(f"LANE SPACING: {v} METERS"))
        s_layout.addWidget(self.slider_spacing)
        layout.addLayout(s_layout)

        # Generate Button
        self.btn_gen = QPushButton("⚡ INJECT SAR WAYPOINTS INTO MISSION")
        self.btn_gen.setStyleSheet("background-color: rgba(0, 242, 254, 0.2); border: 1px solid #00f2fe; color: #00f2fe; font-weight: bold; padding: 6px;")
        self.btn_gen.clicked.connect(self._on_generate_grid)
        layout.addWidget(self.btn_gen)

    def _on_generate_grid(self) -> None:
        state = self.state_store.get_state()
        home_lat = state.mission_state.home_latitude
        home_lon = state.mission_state.home_longitude
        spacing = float(self.slider_spacing.value())
        pattern = self.combo_pattern.currentData()

        # Bounds around current area (~300m box)
        d_lat = 0.002
        d_lon = 0.003
        bounds = [
            (home_lat - d_lat, home_lon - d_lon),
            (home_lat + d_lat, home_lon - d_lon),
            (home_lat + d_lat, home_lon + d_lon),
            (home_lat - d_lat, home_lon + d_lon),
        ]

        cfg = SearchGridConfig(
            bounds_coordinates=bounds,
            spacing_m=spacing,
            pattern=pattern,
            altitude_m=35.0,
            speed_mps=8.0,
        )

        self.gis_controller.run_search_grid(cfg)
