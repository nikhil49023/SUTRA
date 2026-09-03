"""
Smart Horizon GCS — Variometer & Vertical Speed Indicator Instrument
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QBrush, QColor, QFont, QPainter, QPen, QPolygonF
from PySide6.QtWidgets import QWidget

from .hud_formatter import HUDFormatter
from .hud_theme import HUDTheme
from .models import UnitSystem


class VerticalSpeedIndicator(QWidget):
    """
    Vertical climb/descent ribbon variometer with rate of climb readout.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self._vs_mps: float = 0.0
        self.setFixedWidth(28)
        self.setMinimumHeight(180)

    def set_vertical_speed(self, vs_mps: float) -> None:
        if self._vs_mps != vs_mps:
            self._vs_mps = vs_mps
            self.update()

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w = self.width()
        h = self.height()
        cy = h / 2.0

        # Background Glass
        painter.fillRect(self.rect(), HUDTheme.COLOR_GLASS_BG)
        painter.setPen(QPen(HUDTheme.COLOR_BORDER, 1))
        painter.drawRect(self.rect().adjusted(0, 0, -1, -1))

        # Center line (0 m/s)
        painter.setPen(QPen(HUDTheme.COLOR_HORIZON_LINE, 1.5))
        painter.drawLine(QPointF(2, cy), QPointF(w - 2, cy))

        # Variometer Bar Indicator (+/- 5 m/s scale)
        clamped_vs = max(-5.0, min(5.0, self._vs_mps))
        bar_h = (clamped_vs / 5.0) * (cy - 10)

        bar_col = HUDTheme.COLOR_POSITIVE if clamped_vs > 0.05 else (HUDTheme.COLOR_WARNING if clamped_vs < -0.05 else HUDTheme.COLOR_STALE)
        painter.fillRect(QRectF(6, cy - bar_h if bar_h > 0 else cy, w - 12, abs(bar_h)), QBrush(bar_col))

        # Top/Bottom indicators
        painter.setFont(HUDTheme.font_instrument_label(6))
        painter.setPen(HUDTheme.COLOR_TEXT_MUTED)
        painter.drawText(QRectF(2, 2, w - 4, 10), Qt.AlignmentFlag.AlignCenter, "+5")
        painter.drawText(QRectF(2, h - 12, w - 4, 10), Qt.AlignmentFlag.AlignCenter, "-5")
