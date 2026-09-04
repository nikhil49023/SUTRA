"""
Smart Horizon GCS — Global PyTest Configuration & Headless Qt Application Fixture
"""

import os
import sys
import types
import pytest

try:
    import PySide6
    from PySide6.QtWidgets import QApplication
except ImportError:
    try:
        import PyQt5.QtCore as _qc
        import PyQt5.QtGui as _qg
        import PyQt5.QtWidgets as _qw
        _qc.Signal = _qc.pyqtSignal
        _qc.Slot = _qc.pyqtSlot
        class _QKeyCombination:
            def __init__(self, *args):
                self.args = args
        _qc.QKeyCombination = _QKeyCombination
        _qg.QShortcut = getattr(_qw, "QShortcut", None)
        _pyside6 = types.ModuleType("PySide6")
        _pyside6.QtCore = _qc
        _pyside6.QtGui = _qg
        _pyside6.QtWidgets = _qw
        sys.modules["PySide6"] = _pyside6
        sys.modules["PySide6.QtCore"] = _qc
        sys.modules["PySide6.QtGui"] = _qg
        sys.modules["PySide6.QtWidgets"] = _qw
        from PyQt5.QtWidgets import QApplication
    except ImportError:
        QApplication = None

# Force offscreen headless Qt platform plugin for automated CI test execution
os.environ["QT_QPA_PLATFORM"] = "offscreen"


@pytest.fixture(scope="session", autouse=True)
def qapp():
    """Ensures a singleton QApplication instance exists across all tests."""
    app = QApplication.instance()
    if app is None:
        app = QApplication(["--platform", "offscreen"])
    yield app
