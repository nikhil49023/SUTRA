"""
Smart Horizon GCS — Battery & Power Reserve HUD Gauge
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

from PySide6.QtCore import QRectF, Qt
from PySide6.QtGui import QBrush, QColor, QFont, QPainter, QPen
from PySide6.QtWidgets import QWidget

from .hud_theme import HUDTheme


class BatteryIndicator(QWidget):
    """
    HUD battery gauge displaying state-of-charge percentage, voltage, and RTH reserve threshold.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self._pct: float = 100.0
        self._volts: float = 16.8
        self._reserve: float = 25.0
        self.setFixedHeight(30)
        self.setMinimumWidth(110)

    def set_battery(self, pct: float, voltage: float = 0.0, rth_reserve: float = 25.0) -> None:
        self._pct = max(0.0, min(100.0, pct))
        self._volts = voltage
        self._reserve = rth_reserve
        self.update()

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w = self.width()
        h = self.height()

        painter.fillRect(self.rect(), HUDTheme.COLOR_GLASS_BG)
        painter.setPen(QPen(HUDTheme.COLOR_BORDER, 1))
        painter.drawRect(self.rect().adjusted(0, 0, -1, -1))

        # Battery Bar
        bar_w = 40
        bar_h = 14
        bar_x = 8
        bar_y = (h - bar_h) / 2

        # Outer casing
        painter.setPen(QPen(HUDTheme.COLOR_TEXT_MUTED, 1.2))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawRoundedRect(QRectF(bar_x, bar_y, bar_w, bar_h), 2, 2)
        # Nipple
        painter.fillRect(QRectF(bar_x + bar_w, bar_y + 4, 3, 6), HUDTheme.COLOR_TEXT_MUTED)

        # Fill level
        fill_w = (self._pct / 100.0) * (bar_w - 4)
        col = HUDTheme.COLOR_POSITIVE if self._pct > 40 else (HUDTheme.COLOR_WARNING if self._pct > 20 else HUDTheme.COLOR_CRITICAL)
        painter.fillRect(QRectF(bar_x + 2, bar_y + 2, fill_w, bar_h - 4), QBrush(col))

        # Readout text
        painter.setFont(HUDTheme.font_instrument_value(9))
        painter.setPen(col)
        painter.drawText(QRectF(bar_x + bar_w + 8, 2, w - (bar_x + bar_w + 10), h - 4), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, f"{self._pct:.0f}%")
