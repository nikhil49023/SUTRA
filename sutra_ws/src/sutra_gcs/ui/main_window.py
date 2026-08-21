"""
Smart Horizon GCS — Master Tactical QMainWindow
Subsystem: UI Layer
"""

import logging
import sys
import traceback
from typing import Optional

from PySide6.QtCore import QKeyCombination, Qt
from PySide6.QtGui import QKeySequence, QShortcut
from PySide6.QtWidgets import (
    QApplication,
    QHBoxLayout,
    QMainWindow,
    QVBoxLayout,
    QWidget,
)

from config.settings import Settings, get_settings
from map.map_widget import MapWidget
from services.event_bus import EventBus, EventNames, get_event_bus
from services.logging_service import get_logger
from state.application_state import ApplicationState, StateStore, get_state_store

from .bottom_console import BottomConsole
from .left_sidebar import LeftSidebar
from .navigation import NavigationController
from .right_inspector import RightInspector
from .styles import TACTICAL_QSS
from .top_bar import TopBar


class MainWindow(QMainWindow):
    """
    Master Tactical Ground Control Station Window.
    Coordinates TopBar, LeftSidebar, Persistent Map Workspace, RightInspector, and BottomConsole.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
        settings: Optional[Settings] = None,
    ) -> None:
        super().__init__()
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.settings = settings or get_settings()
        self.logger = get_logger("main_window")

        # Set Window Attributes & Stylesheet
        self.setWindowTitle(f"{self.settings.APP_NAME} — v{self.settings.APP_VERSION} [TACTICAL GCS]")
        self.resize(1600, 950)
        self.setMinimumSize(1024, 600)
        self.setStyleSheet(TACTICAL_QSS)

        # 1. Instantiate Persistent Single-Instance MapWidget
        self.map_widget = MapWidget(self.state_store, self.event_bus)

        # 2. Navigation Controller managing central views without recreating MapWidget
        self.nav_controller = NavigationController(self.map_widget, self.state_store)

        # 3. Subsystem Panels
        self.top_bar = TopBar(self.state_store, self.event_bus, self.settings, self)
        self.left_sidebar = LeftSidebar(self)
        self.right_inspector = RightInspector(self.state_store, self)
        self.bottom_console = BottomConsole(self.event_bus, self.state_store, self)

        # 4. Assemble Central Main Layout
        self._init_layout()

        # 5. Connect Navigation & Keyboard Shortcuts
        self._connect_signals()
        self._setup_shortcuts()

        # 6. Global Top-Level Exception Hook
        self._setup_exception_hook()

        self.logger.info("MainWindow initialized and persistent map ready.", extra={"source": "ui"})

    def _init_layout(self) -> None:
        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)

        root_layout = QVBoxLayout(central_widget)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # Top Bar
        root_layout.addWidget(self.top_bar)

        # Center Horizontal Workspace (Sidebar + Dynamic View Stack + Inspector)
        center_layout = QHBoxLayout()
        center_layout.setContentsMargins(0, 0, 0, 0)
        center_layout.setSpacing(0)

        center_layout.addWidget(self.left_sidebar)
        center_layout.addWidget(self.nav_controller.stack, stretch=1)
        center_layout.addWidget(self.right_inspector)

        root_layout.addLayout(center_layout, stretch=1)

        # Bottom Console
        root_layout.addWidget(self.bottom_console)

    def _connect_signals(self) -> None:
        # Left sidebar navigation requests -> NavigationController
        self.left_sidebar.navigation_requested.connect(self._on_navigation_requested)

        # Map drone selection -> Right inspector update
        self.map_widget.drone_selected.connect(self._on_drone_selected)

    def _on_navigation_requested(self, key: str) -> None:
        self.logger.info(f"Navigating to workspace view: {key.upper()}", extra={"source": "ui"})
        self.nav_controller.switch_view(key)

    def _on_drone_selected(self, drone_id: str) -> None:
        self.logger.info(f"Selected tactical asset: {drone_id}", extra={"source": "map"})

    def _setup_shortcuts(self) -> None:
        """Configures standard tactical keyboard shortcuts."""
        shortcuts = [
            ("1", "dashboard"),
            ("2", "mission"),
            ("3", "gis"),
            ("4", "fleet"),
            ("5", "live_ops"),
            ("6", "ai"),
        ]
        for key, nav_target in shortcuts:
            sc = QShortcut(QKeySequence(key), self)
            sc.activated.connect(
                lambda t=nav_target: (
                    self.left_sidebar.set_active(t),
                    self.nav_controller.switch_view(t),
                )
            )

        # Esc -> Clear Selection
        sc_esc = QShortcut(QKeySequence("Esc"), self)
        sc_esc.activated.connect(self.map_widget.controller.clear_selection)

        # F -> Follow Selected Drone
        sc_f = QShortcut(QKeySequence("F"), self)
        sc_f.activated.connect(
            lambda: self.map_widget.controller.set_follow_drone(
                not self.map_widget.camera.follow_drone
            )
        )

    def _setup_exception_hook(self) -> None:
        """Prevents uncaught Qt exceptions from silently crashing the entire GCS."""
        def _handle_exception(exc_type, exc_value, exc_traceback):
            err_msg = "".join(traceback.format_exception(exc_type, exc_value, exc_traceback))
            self.logger.critical(f"Uncaught Exception in Qt loop: {err_msg}", extra={"source": "system"})

        sys.excepthook = _handle_exception

    def closeEvent(self, event) -> None:
        """Clean shutdown handler releasing background tasks and flushing logs."""
        self.logger.info("Executing clean shutdown...", extra={"source": "main_window"})
        self.event_bus.emit(EventNames.SYSTEM_SHUTDOWN, source="main_window_close")

        # Clear subscriptions
        self.state_store.clear_subscribers()
        self.event_bus.clear()

        # Flush logging subsystem
        logging.shutdown()
        event.accept()
