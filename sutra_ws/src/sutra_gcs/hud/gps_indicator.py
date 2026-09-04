"""
Smart Horizon GCS — GPS Constellation & Precision Fix HUD Indicator
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

from PySide6.QtCore import QRectF, Qt
from PySide6.QtGui import QColor, QFont, QPainter, QPen
from PySide6.QtWidgets import QWidget

from .hud_theme import HUDTheme
from .models import GPSFixType


class GPSIndicator(QWidget):
    """
    Displays satellite count, GPS fix geometry, and HDOP dilution factor.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self._fix_type = GPSFixType.FIX_3D
        self._satellites: int = 18
        self._hdop: float = 0.8
        self.setFixedHeight(30)
        self.setMinimumWidth(110)

    def set_gps(self, fix: GPSFixType, sats: int, hdop: float = 1.0) -> None:
        self._fix_type = fix
        self._satellites = sats
        self._hdop = hdop
        self.update()

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w = self.width()
        h = self.height()

        painter.fillRect(self.rect(), HUDTheme.COLOR_GLASS_BG)
        painter.setPen(QPen(HUDTheme.COLOR_BORDER, 1))
        painter.drawRect(self.rect().adjusted(0, 0, -1, -1))

        col = HUDTheme.COLOR_POSITIVE if self._fix_type in (GPSFixType.FIX_3D, GPSFixType.RTK_FIXED) else (HUDTheme.COLOR_WARNING if self._fix_type == GPSFixType.FIX_2D else HUDTheme.COLOR_CRITICAL)

        painter.setFont(HUDTheme.font_instrument_label(7))
        painter.setPen(HUDTheme.COLOR_TEXT_MUTED)
        painter.drawText(QRectF(6, 2, w - 12, 12), Qt.AlignmentFlag.AlignLeft, "GPS FIX")

        painter.setFont(HUDTheme.font_instrument_value(8))
        painter.setPen(col)
        painter.drawText(QRectF(6, 14, w - 12, 14), Qt.AlignmentFlag.AlignLeft, f"{self._fix_type.value} ({self._satellites} SAT)")
