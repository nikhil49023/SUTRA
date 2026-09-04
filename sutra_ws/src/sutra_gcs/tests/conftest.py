"""
Smart Horizon GCS — Global PyTest Configuration & Headless Qt Application Fixture
"""

import os
import pytest
try:
    from PySide6.QtWidgets import QApplication
except ImportError:
    from PyQt5.QtWidgets import QApplication

# Force offscreen headless Qt platform plugin for automated CI test execution
os.environ["QT_QPA_PLATFORM"] = "offscreen"


@pytest.fixture(scope="session", autouse=True)
def qapp():
    """Ensures a singleton QApplication instance exists across all tests."""
    app = QApplication.instance()
    if app is None:
        app = QApplication(["--platform", "offscreen"])
    yield app
