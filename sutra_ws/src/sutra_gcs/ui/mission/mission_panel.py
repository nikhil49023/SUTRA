"""
Smart Horizon GCS — Master Mission Planner Panel
Subsystem: UI Layer (Mission)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QSplitter,
    QVBoxLayout,
    QWidget,
)

from map.map_widget import MapWidget
from state.application_state import ApplicationState, StateStore, get_state_store

from .mission_summary import MissionSummary
from .mission_toolbar import MissionToolbar
from .waypoint_editor import WaypointEditor
from .waypoint_list import WaypointList


class MissionPanel(QWidget):
    """
    Complete Mission Planning & Waypoint Authoring workspace view.
    Integrates the Toolbar, Waypoint Table, Properties Editor, and Metrics Summary.
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

        # 1. Action Toolbar
        self.toolbar = MissionToolbar(self)
        self.toolbar.draw_mode_toggled.connect(self.map_widget.set_draw_mode)
        self.toolbar.fit_route_requested.connect(self.map_widget.fit_route)
        layout.addWidget(self.toolbar)

        # 2. Main Workspace Splitter (Left: Table & Editor, Right: Persistent Map)
        splitter = QSplitter(Qt.Horizontal)
        splitter.setStyleSheet("QSplitter::handle { background-color: #1e293b; width: 2px; }")

        # Left Panel Container (Table + Editor + Summary)
        left_container = QWidget()
        left_layout = QVBoxLayout(left_container)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(6)

        self.summary = MissionSummary(self.state_store, self)
        left_layout.addWidget(self.summary)

        self.wp_list = WaypointList(self.state_store, self)
        left_layout.addWidget(self.wp_list, stretch=1)

        self.editor = WaypointEditor(self.state_store, self)
        left_layout.addWidget(self.editor)

        splitter.addWidget(left_container)

        # Right Panel Container (Hosts persistent MapWidget)
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

        layout.addWidget(splitter, stretch=1)
