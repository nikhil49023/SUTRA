"""
Smart Horizon GCS — Master Geofence Airspace Workspace View
Subsystem: UI Layer (Geofence)
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

from .geofence_editor import GeofenceEditor
from .geofence_properties import GeofenceProperties
from .geofence_sidebar import GeofenceSidebar
from .geofence_toolbar import GeofenceToolbar


class GeofencePanel(QWidget):
    """
    Complete Airspace & Geofence Safety Management workspace.
    Integrates the Toolbar, Table Sidebar, Properties Editor, Metrics Cards, and persistent MapWidget.
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
        self.toolbar = GeofenceToolbar(self)
        layout.addWidget(self.toolbar)

        # 2. Main Workspace Splitter (Left: Sidebar & Editor, Right: Persistent Map)
        splitter = QSplitter(Qt.Horizontal)
        splitter.setStyleSheet("QSplitter::handle { background-color: #1e293b; width: 2px; }")

        # Left Container
        left_container = QWidget()
        left_layout = QVBoxLayout(left_container)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(6)

        self.properties = GeofenceProperties(self.state_store, self)
        left_layout.addWidget(self.properties)

        self.sidebar = GeofenceSidebar(self.state_store, self)
        left_layout.addWidget(self.sidebar, stretch=1)

        self.editor = GeofenceEditor(self.state_store, self)
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
