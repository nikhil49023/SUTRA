"""
Smart Horizon GCS — Terrain Topography & Elevation Profile Panel
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
    QVBoxLayout,
    QWidget,
)

from gis.elevation_profile import elevation_profile_generator
from gis.ground_clearance import ground_clearance_analyzer
from gis.slope_analyzer import slope_analyzer
from state.application_state import ApplicationState, StateStore, get_state_store


class TerrainPanel(QFrame):
    """
    Topography, elevation profiling, terrain slope gradient, and ground clearance panel.
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

        hdr = QLabel("TERRAIN & ELEVATION ANALYSIS")
        hdr.setStyleSheet("color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;")
        layout.addWidget(hdr)

        # Source Selection
        s_layout = QHBoxLayout()
        s_lbl = QLabel("DEM SOURCE:")
        s_lbl.setStyleSheet("color: #94a3b8; font-size: 9px; font-weight: bold;")
        s_layout.addWidget(s_lbl)

        self.combo_source = QComboBox()
        self.combo_source.setStyleSheet("background-color: #050811; border: 1px solid #1e293b; color: #f8fafc; font-size: 9px; padding: 2px;")
        self.combo_source.addItem("SYNTHETIC BENCHMARK DEM", "DEM_SYNTHETIC")
        self.combo_source.addItem("LOCAL GEOTIFF TILE", "DEM_LOCAL")
        self.combo_source.addItem("REMOTE USGS / OPEN-ELEVATION", "DEM_REMOTE")
        s_layout.addWidget(self.combo_source)
        layout.addLayout(s_layout)

        # Action Buttons
        btn_layout = QHBoxLayout()
        self.btn_profile = QPushButton("📈 ANALYZE ROUTE PROFILE")
        self.btn_profile.setStyleSheet("background-color: rgba(0, 242, 254, 0.15); border: 1px solid #00f2fe; color: #00f2fe; font-weight: bold; padding: 4px;")
        self.btn_profile.clicked.connect(self._on_run_profile)
        btn_layout.addWidget(self.btn_profile)
        layout.addLayout(btn_layout)

        # Metrics Readout Grid
        self.grid = QGridLayout()
        self.grid.setSpacing(4)

        self.lbl_min_elev = QLabel("-- m")
        self.lbl_max_elev = QLabel("-- m")
        self.lbl_avg_slope = QLabel("-- °")
        self.lbl_clearance = QLabel("-- m")

        row_defs = [
            ("MIN ELEVATION", self.lbl_min_elev),
            ("MAX ELEVATION", self.lbl_max_elev),
            ("MAX SLOPE", self.lbl_avg_slope),
            ("GROUND BUFFER", self.lbl_clearance),
        ]

        for r, (title, widget) in enumerate(row_defs):
            t_lbl = QLabel(title)
            t_lbl.setStyleSheet("color: #64748b; font-size: 8px; font-weight: bold;")
            widget.setStyleSheet("color: #f8fafc; font-size: 10px; font-weight: bold;")
            self.grid.addWidget(t_lbl, r, 0)
            self.grid.addWidget(widget, r, 1)

        layout.addLayout(self.grid)

    def _on_run_profile(self) -> None:
        state = self.state_store.get_state()
        waypoints = state.mission_state.waypoints
        home_lat = state.mission_state.home_latitude
        home_lon = state.mission_state.home_longitude

        rep = elevation_profile_generator.generate_mission_profile(waypoints, home_lat, home_lon)
        slope_rep = slope_analyzer.analyze_profile_slope(rep)

        leader = state.fleet_state.get_leader()
        clearance_str = "SAFE (30.0m)"
        if leader:
            clr = ground_clearance_analyzer.check_position_clearance(
                leader.drone_id, leader.latitude, leader.longitude, leader.altitude
            )
            clearance_str = f"{clr.status.value} ({clr.clearance_m:.1f}m)"

        self.lbl_min_elev.setText(f"{rep.min_elevation_m:.1f} m")
        self.lbl_max_elev.setText(f"{rep.max_elevation_m:.1f} m (WP High)")
        self.lbl_avg_slope.setText(f"{slope_rep.max_slope_deg:.1f}° ({slope_rep.category.value})")
        self.lbl_clearance.setText(clearance_str)
