"""
Smart Horizon GCS — Navigation & View Stack Manager
Subsystem: UI Layer
"""

from typing import Dict, Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from map.map_widget import MapWidget
from state.application_state import ApplicationState, StateStore, get_state_store


class NavigationController:
    """
    Coordinates view transitions in the central workspace.
    Ensures the MapWidget remains a persistent singleton across all view changes.
    """

    def __init__(
        self,
        map_widget: MapWidget,
        state_store: Optional[StateStore] = None,
    ) -> None:
        self.map_widget = map_widget
        self.state_store = state_store or get_state_store()

        self.stack = QStackedWidget()
        self.views: Dict[str, QWidget] = {}

        # 1. Primary Dashboard View (Embeds the persistent map)
        self.dashboard_view = self._create_dashboard_view()
        self.stack.addWidget(self.dashboard_view)
        self.views["dashboard"] = self.dashboard_view

        # 2. Mission Planning View (Shares the persistent map)
        from .mission import MissionPanel
        self.mission_view = MissionPanel(self.map_widget, self.state_store)
        self.stack.addWidget(self.mission_view)
        self.views["mission"] = self.mission_view

        # 3. GIS Intelligence & Geofence View (Shares the persistent map)
        from .geofence import GeofencePanel
        self.gis_view = GeofencePanel(self.map_widget, self.state_store)
        self.stack.addWidget(self.gis_view)
        self.views["gis"] = self.gis_view

        # 4. Fleet Management View
        self.fleet_view = self._create_placeholder_view("FLEET SWARM COORDINATION & KINEMATICS")
        self.stack.addWidget(self.fleet_view)
        self.views["fleet"] = self.fleet_view

        # 5. Live Operations & Execution View (Shares the persistent map)
        from .mission import MissionExecutionPanel
        self.live_ops_view = MissionExecutionPanel(self.map_widget, self.state_store)
        self.stack.addWidget(self.live_ops_view)
        self.views["live_ops"] = self.live_ops_view

        # 6. AI Intel View
        self.ai_view = self._create_placeholder_view("AI THREAT DETECTION & BYTE-TRACK SAR")
        self.stack.addWidget(self.ai_view)
        self.views["ai"] = self.ai_view

        # 7. Settings View
        self.settings_view = self._create_placeholder_view("SYSTEM CONFIGURATION & HARDWARE LINK")
        self.stack.addWidget(self.settings_view)
        self.views["settings"] = self.settings_view

    def _create_dashboard_view(self) -> QWidget:
        """Dashboard view hosting metric cards and the persistent tactical map."""
        from .dashboard import DashboardView
        return DashboardView(self.map_widget, self.state_store)

    def _create_placeholder_view(self, title: str) -> QWidget:
        container = QWidget()
        layout = QVBoxLayout(container)
        lbl = QLabel(f"[{title}] — SUBSYSTEM ACTIVE")
        lbl.setAlignment(Qt.AlignCenter)
        lbl.setStyleSheet("color: #64748b; font-size: 14px; font-weight: bold;")
        layout.addWidget(lbl)
        return container

    def switch_view(self, view_key: str) -> bool:
        """Switches the active stack widget to the designated module, reparenting the persistent map if necessary."""
        if view_key in self.views:
            if view_key == "dashboard":
                if hasattr(self.dashboard_view, "map_layout"):
                    self.dashboard_view.map_layout.addWidget(self.map_widget)
            elif view_key == "mission":
                if hasattr(self.mission_view, "map_container_layout"):
                    self.mission_view.map_container_layout.addWidget(self.map_widget)
            elif view_key == "gis":
                if hasattr(self.gis_view, "map_container_layout"):
                    self.gis_view.map_container_layout.addWidget(self.map_widget)
            elif view_key == "live_ops":
                if hasattr(self.live_ops_view, "map_container_layout"):
                    self.live_ops_view.map_container_layout.addWidget(self.map_widget)

            self.stack.setCurrentWidget(self.views[view_key])
            return True
        return False
