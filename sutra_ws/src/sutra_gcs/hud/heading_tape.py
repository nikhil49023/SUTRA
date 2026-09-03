"""
Smart Horizon GCS — Tactical Heading Tape Compass Instrument
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QBrush, QColor, QFont, QPainter, QPen, QPolygonF
from PySide6.QtWidgets import QWidget

from .hud_formatter import HUDFormatter
from .hud_theme import HUDTheme


class HeadingTape(QWidget):
    """
    Horizontal moving compass tape displaying cardinal bearings and numeric ticks.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self._heading_deg: float = 0.0
        self.setFixedHeight(36)
        self.setMinimumWidth(220)

    def set_heading(self, heading_deg: float) -> None:
        norm = heading_deg % 360.0
        if norm < 0:
            norm += 360.0
        if self._heading_deg != norm:
            self._heading_deg = norm
            self.update()

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w = self.width()
        h = self.height()
        cx = w / 2.0

        # Background Glass
        painter.fillRect(self.rect(), HUDTheme.COLOR_GLASS_BG)
        painter.setPen(QPen(HUDTheme.COLOR_BORDER, 1))
        painter.drawRect(self.rect().adjusted(0, 0, -1, -1))

        # Pixels per degree
        px_per_deg = w / 90.0  # 90 degrees field of view across width

        cardinal_map = {0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW", 360: "N"}

        painter.setFont(HUDTheme.font_instrument_label(8))

        # Render ticks and numbers around current heading
        for deg in range(int(self._heading_deg - 50), int(self._heading_deg + 55)):
            if deg % 5 == 0:
                norm_deg = deg % 360
                if norm_deg < 0:
                    norm_deg += 360

                x = cx + (deg - self._heading_deg) * px_per_deg
                if x < 5 or x > w - 5:
                    continue

                is_major = (norm_deg % 15 == 0)
                tick_h = 10 if is_major else 5

                # Tick mark
                painter.setPen(QPen(HUDTheme.COLOR_PITCH_LADDER if is_major else HUDTheme.COLOR_DISABLED, 1.2))
                painter.drawLine(QPointF(x, h - 2), QPointF(x, h - 2 - tick_h))

                # Labels
                if is_major:
                    label = cardinal_map.get(norm_deg, f"{norm_deg:03d}")
                    col = HUDTheme.COLOR_PRIMARY if norm_deg in cardinal_map else HUDTheme.COLOR_TEXT_PRIMARY
                    painter.setPen(col)
                    painter.drawText(QRectF(x - 15, 2, 30, 14), Qt.AlignmentFlag.AlignCenter, label)

        # Center Heading Index Triangle & Digital readout
        tri = QPolygonF([QPointF(cx - 5, h - 1), QPointF(cx + 5, h - 1), QPointF(cx, h - 8)])
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QBrush(HUDTheme.COLOR_RETICLE))
        painter.drawPolygon(tri)
