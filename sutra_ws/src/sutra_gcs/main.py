"""
Smart Horizon GCS — Main Application Entry Point & Lifecycle Coordinator
Phase 2: Python/PySide6 Tactical Dashboard + Persistent Map
"""

import logging
import os
import sys

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication

from config.settings import Settings, get_settings
from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger, setup_logging
from state.application_state import StateStore, get_state_store
from ui.main_window import MainWindow


def main() -> int:
    """
    Main application bootstrap entry point.
    Initializes configuration, centralized logging, state store, event bus, and the main Qt window.
    """
    # 1. Load settings
    settings = get_settings()

    # 2. Initialize centralized logging
    setup_logging(settings.LOG_LEVEL)
    logger = get_logger("bootstrap")
    logger.info(
        f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [Phase 2 Tactical GCS]...",
        extra={"source": "bootstrap"},
    )

    # 3. Instantiate centralized State Store and Event Bus
    state_store = get_state_store()
    event_bus = get_event_bus()

    # 4. Initialize PySide6 GUI Application
    # Allow running offscreen in headless/CI environments if DISPLAY is unset
    if os.getenv("QT_QPA_PLATFORM") is None and not os.getenv("DISPLAY"):
        os.environ["QT_QPA_PLATFORM"] = "offscreen"

    app = QApplication(sys.argv)
    app.setApplicationName(settings.APP_NAME)
    app.setApplicationVersion(settings.APP_VERSION)

    # 5. Create and present the Tactical MainWindow
    window = MainWindow(state_store, event_bus, settings)
    window.show()

    logger.info("Tactical GCS window presented. Starting event loop.", extra={"source": "bootstrap"})
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
