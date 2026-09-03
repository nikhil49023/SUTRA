"""
Smart Horizon GCS — Master GIS Intelligence & Tactical Analysis Workspace View
Subsystem: UI Layer (GIS Subsystem)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QScrollArea,
    QSplitter,
    QVBoxLayout,
    QWidget,
)

from map.map_widget import MapWidget
from state.application_state import StateStore, get_state_store

from .los_panel import LOSPanel
from .measurement_panel import MeasurementPanel
from .rf_panel import RFPanel
from .search_panel import SearchPanel
from .terrain_panel import TerrainPanel
from .weather_panel import WeatherPanel


class GISPanel(QWidget):
    """
    Master tactical workspace for GIS intelligence, elevation profiles,
    line-of-sight ray tracing, RF coverage heatmaps, weather risk analysis,
    and search grid generation.
    """

    def __init__(
        self,
        map_widget: MapWidget,
        state_store: Optional[StateStore] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.map_widget = map_widget
        self.state_store = state_store or get_state_store()

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        # Workspace Horizontal Splitter
        splitter = QSplitter(Qt.Horizontal)
        splitter.setStyleSheet("QSplitter::handle { background-color: #1e293b; width: 2px; }")

        # Left Scrollable Analysis Panels
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setStyleSheet("QScrollArea { border: none; background-color: transparent; }")

        left_container = QWidget()
        left_layout = QVBoxLayout(left_container)
        left_layout.setContentsMargins(0, 0, 4, 0)
        left_layout.setSpacing(6)

        # 1. Terrain Topography & Elevation
        self.terrain_panel = TerrainPanel(self.state_store, self)
        left_layout.addWidget(self.terrain_panel)

        # 2. Line of Sight Ray Tracer
        self.los_panel = LOSPanel(self.state_store, self)
        left_layout.addWidget(self.los_panel)

        # 3. RF Propagation & Link Budget
        self.rf_panel = RFPanel(self.state_store, self)
        left_layout.addWidget(self.rf_panel)

        # 4. Meteorological Intelligence
        self.weather_panel = WeatherPanel(self.state_store, self)
        left_layout.addWidget(self.weather_panel)

        # 5. SAR & Survey Grid Generator
        self.search_panel = SearchPanel(self.state_store, self)
        left_layout.addWidget(self.search_panel)

        # 6. Tactical Measurement
        self.measurement_panel = MeasurementPanel(self.state_store, self)
        left_layout.addWidget(self.measurement_panel)

        left_layout.addStretch()
        scroll_area.setWidget(left_container)
        splitter.addWidget(scroll_area)

        # Right Map Container (Houses persistent MapWidget)
        self.map_container = QFrame()
        self.map_container.setObjectName("panel")
        self.map_container.setStyleSheet(
            "QFrame#panel { background-color: #050811; border: 1px solid #1e293b; border-radius: 4px; }"
        )
        self.map_container_layout = QVBoxLayout(self.map_container)
        self.map_container_layout.setContentsMargins(0, 0, 0, 0)

        splitter.addWidget(self.map_container)
        splitter.setStretchFactor(0, 4)
        splitter.setStretchFactor(1, 6)

        layout.addWidget(splitter)
