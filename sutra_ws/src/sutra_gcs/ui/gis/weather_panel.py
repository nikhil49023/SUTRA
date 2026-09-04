"""
Smart Horizon GCS — Meteorological Intelligence & Weather Envelope Panel
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

from gis.weather_analyzer import weather_analyzer
from gis.weather_service import weather_service
from state.application_state import ApplicationState, StateStore, get_state_store


class WeatherPanel(QFrame):
    """
    Atmospheric weather conditions, wind limits, and flight risk evaluation panel.
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

        hdr = QLabel("METEOROLOGICAL INTELLIGENCE")
        hdr.setStyleSheet("color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;")
        layout.addWidget(hdr)

        # Refresh Button
        self.btn_refresh = QPushButton("🌤️ POLL METEOROLOGICAL STATION")
        self.btn_refresh.setStyleSheet("background-color: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; color: #fde68a; font-weight: bold; padding: 4px;")
        self.btn_refresh.clicked.connect(self._on_refresh_weather)
        layout.addWidget(self.btn_refresh)

        # Metrics Grid
        grid = QGridLayout()
        grid.setSpacing(4)

        self.lbl_risk = QLabel("FLIGHT RISK: SAFE")
        self.lbl_risk.setStyleSheet("color: #10b981; font-size: 10px; font-weight: bold;")
        self.lbl_wind = QLabel("4.5 m/s (280° W)")
        self.lbl_gusts = QLabel("6.5 m/s")
        self.lbl_vis = QLabel("12.0 km (VFR Nominal)")
        self.lbl_temp = QLabel("22.5 °C | 1014 hPa")

        grid.addWidget(QLabel("AIRFRAME ENVELOPE:"), 0, 0)
        grid.addWidget(self.lbl_risk, 0, 1)
        grid.addWidget(QLabel("SUSTAINED WIND:"), 1, 0)
        grid.addWidget(self.lbl_wind, 1, 1)
        grid.addWidget(QLabel("PEAK GUSTS:"), 2, 0)
        grid.addWidget(self.lbl_gusts, 2, 1)
        grid.addWidget(QLabel("VISIBILITY:"), 3, 0)
        grid.addWidget(self.lbl_vis, 3, 1)
        grid.addWidget(QLabel("TEMP & PRESSURE:"), 4, 0)
        grid.addWidget(self.lbl_temp, 4, 1)

        layout.addLayout(grid)

    def _on_refresh_weather(self) -> None:
        state = self.state_store.get_state()
        lat = state.mission_state.home_latitude
        lon = state.mission_state.home_longitude

        data = weather_service.get_weather(lat, lon)
        report = weather_analyzer.evaluate_weather(data)

        if report.risk_level == "SAFE":
            self.lbl_risk.setText("FLIGHT RISK: SAFE")
            self.lbl_risk.setStyleSheet("color: #10b981; font-size: 10px; font-weight: bold;")
        elif report.risk_level == "WARNING":
            self.lbl_risk.setText("FLIGHT RISK: WARNING")
            self.lbl_risk.setStyleSheet("color: #f59e0b; font-size: 10px; font-weight: bold;")
        else:
            self.lbl_risk.setText("FLIGHT RISK: CRITICAL")
            self.lbl_risk.setStyleSheet("color: #ef4444; font-size: 10px; font-weight: bold;")

        self.lbl_wind.setText(f"{data.wind_speed_mps:.1f} m/s ({data.wind_direction_deg:.0f}°)")
        self.lbl_gusts.setText(f"{data.wind_gusts_mps:.1f} m/s")
        self.lbl_vis.setText(f"{data.visibility_km:.1f} km ({data.condition})")
        self.lbl_temp.setText(f"{data.temperature_c:.1f}°C | {data.pressure_hpa:.0f} hPa")
