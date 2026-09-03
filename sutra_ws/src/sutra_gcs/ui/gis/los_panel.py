"""
Smart Horizon GCS — Line-of-Sight (LOS) Ray Tracing Control Panel
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

from gis.gis_controller import get_gis_controller
from state.application_state import ApplicationState, StateStore, get_state_store


class LOSPanel(QFrame):
    """
    Controls 3D optical/RF line-of-sight ray tracing between GCS and swarm drones.
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

        hdr = QLabel("LINE-OF-SIGHT (LOS) RAY TRACER")
        hdr.setStyleSheet("color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;")
        layout.addWidget(hdr)

        # Pair Selection
        p_layout = QHBoxLayout()
        p_lbl = QLabel("LINK PAIR:")
        p_lbl.setStyleSheet("color: #94a3b8; font-size: 9px; font-weight: bold;")
        p_layout.addWidget(p_lbl)

        self.combo_pair = QComboBox()
        self.combo_pair.setStyleSheet("background-color: #050811; border: 1px solid #1e293b; color: #f8fafc; font-size: 9px; padding: 2px;")
        self.combo_pair.addItem("GCS → ALPHA (LEADER)", "GCS_ALPHA")
        self.combo_pair.addItem("GCS → BRAVO (WINGMAN)", "GCS_BRAVO")
        self.combo_pair.addItem("ALPHA (LEADER) → CHARLIE", "ALPHA_CHARLIE")
        p_layout.addWidget(self.combo_pair)
        layout.addLayout(p_layout)

        # Run Button
        self.btn_trace = QPushButton("🎯 TRACE 3D LOS VECTOR")
        self.btn_trace.setStyleSheet("background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #6ee7b7; font-weight: bold; padding: 4px;")
        self.btn_trace.clicked.connect(self._on_trace_los)
        layout.addWidget(self.btn_trace)

        # Results Grid
        grid = QGridLayout()
        grid.setSpacing(4)

        self.lbl_status = QLabel("CLEAR (UNOBSTRUCTED)")
        self.lbl_status.setStyleSheet("color: #10b981; font-size: 10px; font-weight: bold;")
        self.lbl_dist = QLabel("-- m")
        self.lbl_clearance = QLabel("-- m")

        grid.addWidget(QLabel("LOS STATUS:"), 0, 0)
        grid.addWidget(self.lbl_status, 0, 1)
        grid.addWidget(QLabel("LINK DISTANCE:"), 1, 0)
        grid.addWidget(self.lbl_dist, 1, 1)
        grid.addWidget(QLabel("MIN CLEARANCE:"), 2, 0)
        grid.addWidget(self.lbl_clearance, 2, 1)

        layout.addLayout(grid)

    def _on_trace_los(self) -> None:
        state = self.state_store.get_state()
        leader = state.fleet_state.get_leader()
        gcs_lat = state.mission_state.home_latitude
        gcs_lon = state.mission_state.home_longitude

        target_lat = leader.latitude if leader else gcs_lat + 0.005
        target_lon = leader.longitude if leader else gcs_lon + 0.005
        target_alt = leader.altitude if leader else 25.0

        res = self.gis_controller.run_los_analysis(
            obs_p=(gcs_lat, gcs_lon),
            obs_alt=50.0,
            target_p=(target_lat, target_lon),
            target_alt=50.0 + target_alt,
        )

        if res.visible:
            self.lbl_status.setText("VISIBLE (UNOBSTRUCTED)")
            self.lbl_status.setStyleSheet("color: #10b981; font-size: 10px; font-weight: bold;")
        else:
            self.lbl_status.setText("BLOCKED (TERRAIN OCCLUDED)")
            self.lbl_status.setStyleSheet("color: #ef4444; font-size: 10px; font-weight: bold;")

        self.lbl_dist.setText(f"{res.distance_m:.1f} m")
        self.lbl_clearance.setText(f"{res.min_clearance_m:.1f} m")
