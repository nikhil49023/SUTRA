"""
Smart Horizon GCS — Geofence Safety Envelope HUD Indicator
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

from PySide6.QtCore import QRectF, Qt
from PySide6.QtGui import QColor, QFont, QPainter, QPen
from PySide6.QtWidgets import QWidget

from .hud_theme import HUDTheme
from .models import GeofenceHUDStatus


class GeofenceIndicator(QWidget):
    """
    Displays CLEAR, WARNING, or flashing CRITICAL NO-FLY ZONE BREACH.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self._status = GeofenceHUDStatus.CLEAR
        self.setFixedHeight(30)
        self.setMinimumWidth(110)

    def set_status(self, status: GeofenceHUDStatus) -> None:
        if self._status != status:
            self._status = status
            self.update()

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w = self.width()
        h = self.height()

        painter.fillRect(self.rect(), HUDTheme.COLOR_GLASS_BG)
        painter.setPen(QPen(HUDTheme.COLOR_BORDER, 1))
        painter.drawRect(self.rect().adjusted(0, 0, -1, -1))

        if self._status == GeofenceHUDStatus.BREACH:
            col = HUDTheme.COLOR_CRITICAL
            text = "⚠ GEOFENCE BREACH"
        elif self._status == GeofenceHUDStatus.WARNING:
            col = HUDTheme.COLOR_WARNING
            text = "GEOFENCE PROXIMITY"
        else:
            col = HUDTheme.COLOR_POSITIVE
            text = "GEOFENCE: CLEAR"

        painter.setFont(HUDTheme.font_instrument_label(7))
        painter.setPen(HUDTheme.COLOR_TEXT_MUTED)
        painter.drawText(QRectF(6, 2, w - 12, 12), Qt.AlignmentFlag.AlignLeft, "AIRSPACE FENCE")

        painter.setFont(HUDTheme.font_instrument_value(8))
        painter.setPen(col)
        painter.drawText(QRectF(6, 14, w - 12, 14), Qt.AlignmentFlag.AlignLeft, text)
