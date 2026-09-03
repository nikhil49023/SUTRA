"""
Smart Horizon GCS — Master Swarm Fleet & Formation Workspace View
Subsystem: UI Layer (Fleet Management)
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

from .drone_inspector import DroneInspectorWidget
from .drone_list import DroneListWidget
from .fleet_status import FleetStatusWidget
from .formation_panel import FormationPanel


class FleetPanel(QWidget):
    """
    Master tactical workspace for multi-UAV fleet coordination, live roster management,
    formation geometry tuning, individual telemetry inspection, and persistent map rendering.
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

        # Main Workspace Horizontal Splitter
        splitter = QSplitter(Qt.Horizontal)
        splitter.setStyleSheet("QSplitter::handle { background-color: #1e293b; width: 2px; }")

        # Left Controls Container
        left_container = QWidget()
        left_layout = QVBoxLayout(left_container)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(6)

        # 1. Swarm Overview Metrics
        self.fleet_status = FleetStatusWidget(self.state_store, self)
        left_layout.addWidget(self.fleet_status)

        # 2. Formation Geometry Controls
        self.formation_panel = FormationPanel(self.state_store, self)
        left_layout.addWidget(self.formation_panel)

        # 3. Aircraft Roster Table
        self.drone_list = DroneListWidget(self.state_store, self)
        left_layout.addWidget(self.drone_list, stretch=1)

        # 4. Detail Inspector
        self.drone_inspector = DroneInspectorWidget(self.state_store, self)
        left_layout.addWidget(self.drone_inspector)

        splitter.addWidget(left_container)

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
