"""
Smart Horizon GCS — Main Application Entry Point & Lifecycle Coordinator
Phase 1: Foundation, Centralized State Management & Event Bus
"""

import logging
import os
import sys
from typing import Optional

from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import (
    QApplication,
    QFrame,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from config.settings import Settings, get_settings
from services.event_bus import Event, EventBus, EventNames, get_event_bus
from services.logging_service import get_logger, setup_logging
from state.application_state import (
    ApplicationState,
    StateStore,
    get_state_store,
)


class GCSMainWindow(QMainWindow):
    """
    Minimal Phase 1 verification window proving that the PySide6 UI loop,
    centralized reactive state store, and event bus operate with thread-safe data flow.
    """

    def __init__(self, state_store: StateStore, event_bus: EventBus, settings: Settings) -> None:
        super().__init__()
        self.state_store = state_store
        self.event_bus = event_bus
        self.settings = settings
        self.logger = get_logger("main_window")

        self.setWindowTitle(f"{settings.APP_NAME} — v{settings.APP_VERSION} [Phase 1 Foundation]")
        self.resize(750, 480)

        # Central Widget & Layout
        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(12)

        # Header Title
        title_label = QLabel(f"🚁 {settings.APP_NAME.upper()}")
        title_label.setStyleSheet("font-size: 18px; font-weight: bold; color: #00f2fe;")
        main_layout.addWidget(title_label)

        sub_label = QLabel(
            "Phase 1 Verification: Centralized Reactive State Store & Production Event Bus"
        )
        sub_label.setStyleSheet("font-size: 12px; color: #94a3b8;")
        main_layout.addWidget(sub_label)

        # Status Cards Container
        status_frame = QFrame()
        status_frame.setStyleSheet(
            "background-color: #0b111e; border: 1px solid #1e293b; border-radius: 6px; padding: 12px;"
        )
        status_layout = QVBoxLayout(status_frame)

        self.app_status_lbl = QLabel(f"Application Status: {self.state_store.get_state().application_status}")
        self.app_status_lbl.setStyleSheet("color: #10b981; font-weight: bold;")
        status_layout.addWidget(self.app_status_lbl)

        self.user_lbl = QLabel(f"Operator Clearance: {self.state_store.get_state().current_user}")
        self.user_lbl.setStyleSheet("color: #e2e8f0;")
        status_layout.addWidget(self.user_lbl)

        self.sim_mode_lbl = QLabel(f"Simulation Mode: {'ENABLED' if settings.SIMULATION_MODE else 'DISABLED'}")
        self.sim_mode_lbl.setStyleSheet("color: #38bdf8;")
        status_layout.addWidget(self.sim_mode_lbl)

        self.event_count_lbl = QLabel("Events Received via EventBus: 0")
        self.event_count_lbl.setStyleSheet("color: #f59e0b;")
        status_layout.addWidget(self.event_count_lbl)

        main_layout.addWidget(status_frame)

        # Action Buttons
        btn_layout = QHBoxLayout()
        self.emit_btn = QPushButton("📡 Emit Test Event (telemetry.updated)")
        self.emit_btn.setStyleSheet(
            "background-color: #1e293b; color: #00f2fe; border: 1px solid #00f2fe; border-radius: 4px; padding: 8px 16px; font-weight: bold;"
        )
        self.emit_btn.clicked.connect(self._on_emit_clicked)
        btn_layout.addWidget(self.emit_btn)

        self.close_btn = QPushButton("🛑 Clean Shutdown")
        self.close_btn.setStyleSheet(
            "background-color: #7f1d1d; color: #fecaca; border: 1px solid #ef4444; border-radius: 4px; padding: 8px 16px; font-weight: bold;"
        )
        self.close_btn.clicked.connect(self.close)
        btn_layout.addWidget(self.close_btn)

        main_layout.addLayout(btn_layout)
        main_layout.addStretch()

        # Wire Subscriptions
        self._event_count = 0
        self._unsub_state = self.state_store.subscribe(self._on_state_changed)
        self._unsub_events = self.event_bus.subscribe("*", self._on_event_received)

        self.logger.info("GCSMainWindow initialized successfully", extra={"source": "ui"})

    def _on_emit_clicked(self) -> None:
        self.event_bus.emit(
            EventNames.TELEMETRY_UPDATED,
            payload={"battery": 98.5, "alt": 25.0},
            source="ui_test_button",
        )

    def _on_event_received(self, event: Event) -> None:
        self._event_count += 1
        self.event_count_lbl.setText(
            f"Events Received via EventBus: {self._event_count} (Last: '{event.event_name}')"
        )

    def _on_state_changed(self, new_state: ApplicationState) -> None:
        self.app_status_lbl.setText(f"Application Status: {new_state.application_status}")
        self.user_lbl.setText(f"Operator Clearance: {new_state.current_user}")

    def closeEvent(self, event) -> None:
        """Handles graceful clean shutdown on window close."""
        self.logger.info("Initiating clean shutdown...", extra={"source": "system"})

        # Emit system shutdown event
        self.event_bus.emit(EventNames.SYSTEM_SHUTDOWN, source="ui_close")

        # Unsubscribe handlers
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        if hasattr(self, "_unsub_events"):
            self._unsub_events()

        # Clear subscriptions
        self.state_store.clear_subscribers()
        self.event_bus.clear()

        # Flush logs
        logging.shutdown()
        event.accept()


def main() -> int:
    """
    Main application bootstrap entry point.
    """
    # 1. Load settings
    settings = get_settings()

    # 2. Initialize centralized logging
    setup_logging(settings.LOG_LEVEL)
    logger = get_logger("bootstrap")
    logger.info(
        f"Starting {settings.APP_NAME} v{settings.APP_VERSION}...",
        extra={"source": "bootstrap"},
    )

    # 3. Instantiate centralized State Store and Event Bus
    state_store = get_state_store()
    event_bus = get_event_bus()

    # 4. Initialize PySide6 GUI Application
    # Allow running offscreen in headless/CI environments
    if os.getenv("QT_QPA_PLATFORM") is None and not os.getenv("DISPLAY"):
        os.environ["QT_QPA_PLATFORM"] = "offscreen"

    app = QApplication(sys.argv)
    app.setApplicationName(settings.APP_NAME)
    app.setApplicationVersion(settings.APP_VERSION)

    window = GCSMainWindow(state_store, event_bus, settings)
    window.show()

    logger.info("Application event loop started.", extra={"source": "bootstrap"})
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
