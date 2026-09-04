"""
Smart Horizon GCS — Tactical Avionics Alert & Warning HUD Overlay
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

from typing import List, Optional
from PySide6.QtCore import QRectF, Qt, QTimer
from PySide6.QtGui import QBrush, QColor, QFont, QPainter, QPen
from PySide6.QtWidgets import QWidget

from .hud_theme import HUDTheme


class AlertOverlay(QWidget):
    """
    High-visibility HUD alert banner with priority arbitrated warnings (EMERGENCY > CRITICAL > WARNING > INFO).
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self._title: str = ""
        self._severity: str = "INFO"
        self._visible: bool = False
        self._flash_state: bool = True
        self.setFixedHeight(36)
        self.setMinimumWidth(260)

        self._flash_timer = QTimer(self)
        self._flash_timer.timeout.connect(self._toggle_flash)

    def set_alert(self, title: str, severity: str = "INFO") -> None:
        if not title:
            self._visible = False
            self._flash_timer.stop()
            self.update()
            return

        self._title = title
        self._severity = severity.upper()
        self._visible = True

        if self._severity in ("EMERGENCY", "CRITICAL"):
            if not self._flash_timer.isActive():
                self._flash_timer.start(400)
        else:
            self._flash_timer.stop()
            self._flash_state = True

        self.update()

    def clear(self) -> None:
        self.set_alert("")

    def _toggle_flash(self) -> None:
        self._flash_state = not self._flash_state
        self.update()

    def paintEvent(self, event) -> None:
        if not self._visible or not self._title:
            return

        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w = self.width()
        h = self.height()

        if self._severity == "EMERGENCY":
            bg_col = HUDTheme.COLOR_EMERGENCY if self._flash_state else QColor(120, 10, 10, 220)
        elif self._severity == "CRITICAL":
            bg_col = HUDTheme.COLOR_CRITICAL if self._flash_state else QColor(100, 15, 15, 220)
        elif self._severity == "WARNING":
            bg_col = HUDTheme.COLOR_WARNING
        else:
            bg_col = HUDTheme.COLOR_PRIMARY

        # Banner pill
        banner_rect = QRectF(4, 2, w - 8, h - 4)
        painter.fillRect(banner_rect, QBrush(bg_col))
        painter.setPen(QPen(Qt.GlobalColor.white, 1.5))
        painter.drawRoundedRect(banner_rect, 4, 4)

        painter.setFont(HUDTheme.font_instrument_value(9))
        painter.setPen(Qt.GlobalColor.white)
        painter.drawText(banner_rect, Qt.AlignmentFlag.AlignCenter, f"⚠ {self._title.upper()}")
