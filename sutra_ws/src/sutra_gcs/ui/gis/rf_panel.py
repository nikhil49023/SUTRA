"""
Smart Horizon GCS — RF Propagation & Fresnel Coverage Panel
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
from gis.rf_coverage import rf_coverage_analyzer
from state.application_state import ApplicationState, StateStore, get_state_store


class RFPanel(QFrame):
    """
    Radio frequency propagation budget, FSPL loss, link margin, and 2D coverage grid panel.
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

        hdr = QLabel("RF PROPAGATION & LINK BUDGET")
        hdr.setStyleSheet("color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;")
        layout.addWidget(hdr)

        # Frequency Selection
        f_layout = QHBoxLayout()
        f_lbl = QLabel("CARRIER FREQ:")
        f_lbl.setStyleSheet("color: #94a3b8; font-size: 9px; font-weight: bold;")
        f_layout.addWidget(f_lbl)

        self.combo_freq = QComboBox()
        self.combo_freq.setStyleSheet("background-color: #050811; border: 1px solid #1e293b; color: #f8fafc; font-size: 9px; padding: 2px;")
        self.combo_freq.addItem("2.4 GHz ISM (Telemetry/Video)", 2400.0)
        self.combo_freq.addItem("5.8 GHz High-Band (HD Video)", 5800.0)
        self.combo_freq.addItem("915 MHz Long-Range Telemetry", 915.0)
        f_layout.addWidget(self.combo_freq)
        layout.addLayout(f_layout)

        # Run Button
        self.btn_rf_grid = QPushButton("📡 GENERATE COVERAGE HEATMAP")
        self.btn_rf_grid.setStyleSheet("background-color: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #38bdf8; font-weight: bold; padding: 4px;")
        self.btn_rf_grid.clicked.connect(self._on_generate_rf)
        layout.addWidget(self.btn_rf_grid)

        # Metrics Readout Grid
        grid = QGridLayout()
        grid.setSpacing(4)

        self.lbl_quality = QLabel("EXCELLENT (32.4 dB)")
        self.lbl_quality.setStyleSheet("color: #10b981; font-size: 10px; font-weight: bold;")
        self.lbl_fspl = QLabel("86.2 dB")
        self.lbl_rx_power = QLabel("-62.5 dBm")
        self.lbl_fresnel = QLabel("4.2 m")

        grid.addWidget(QLabel("LINK MARGIN:"), 0, 0)
        grid.addWidget(self.lbl_quality, 0, 1)
        grid.addWidget(QLabel("PATH LOSS (FSPL):"), 1, 0)
        grid.addWidget(self.lbl_fspl, 1, 1)
        grid.addWidget(QLabel("RX SIGNAL POWER:"), 2, 0)
        grid.addWidget(self.lbl_rx_power, 2, 1)
        grid.addWidget(QLabel("FRESNEL RADIUS (F1):"), 3, 0)
        grid.addWidget(self.lbl_fresnel, 3, 1)

        layout.addLayout(grid)

    def _on_generate_rf(self) -> None:
        state = self.state_store.get_state()
        center_lat = state.mission_state.home_latitude
        center_lon = state.mission_state.home_longitude
        freq_mhz = float(self.combo_freq.currentData())

        # Generate grid via controller
        self.gis_controller.run_rf_analysis((center_lat, center_lon), radius_m=2000.0)

        # Compute nominal lead drone link
        leader = state.fleet_state.get_leader()
        from mission.route_calculator import RouteCalculator
        dist = 850.0
        if leader:
            dist = RouteCalculator.calculate_distance(center_lat, center_lon, leader.latitude, leader.longitude)

        res = rf_coverage_analyzer.analyze_link(max(10.0, dist), freq_mhz=freq_mhz)

        self.lbl_quality.setText(f"{res.link_quality} ({res.link_margin_db:.1f} dB)")
        self.lbl_fspl.setText(f"{res.fspl_db:.1f} dB")
        self.lbl_rx_power.setText(f"{res.rx_power_dbm:.1f} dBm")
        self.lbl_fresnel.setText(f"{res.fresnel_radius_m:.1f} m")
