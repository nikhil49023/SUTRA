"""
Smart Horizon GCS — Tactical Altitude Tape & Digital Readout
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

from typing import Optional
from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QBrush, QColor, QFont, QPainter, QPen, QPolygonF
from PySide6.QtWidgets import QWidget

from .hud_formatter import HUDFormatter
from .hud_theme import HUDTheme
from .models import UnitSystem


class AltitudeTape(QWidget):
    """
    Vertical tape displaying barometric/GPS MSL altitude with prominent AGL readout.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self._alt_msl: float = 0.0
        self._alt_agl: float = 0.0
        self._unit = UnitSystem.METRIC
        self.setFixedWidth(70)
        self.setMinimumHeight(180)

    def set_altitude(self, alt_msl: float, alt_agl: float, unit: UnitSystem = UnitSystem.METRIC) -> None:
        self._alt_msl = alt_msl
        self._alt_agl = alt_agl
        self._unit = unit
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

        # Vertical Tape Marks
        px_per_m = h / 80.0  # 80m vertical span
        painter.setFont(HUDTheme.font_instrument_label(7))

        for alt in range(int(self._alt_msl - 50), int(self._alt_msl + 55), 5):
            y = cy - (alt - self._alt_msl) * px_per_m
            if y < 4 or y > h - 4:
                continue

            is_major = (alt % 20 == 0)
            tick_w = 10 if is_major else 5

            painter.setPen(QPen(HUDTheme.COLOR_PITCH_LADDER if is_major else HUDTheme.COLOR_DISABLED, 1.2))
            painter.drawLine(QPointF(2, y), QPointF(2 + tick_w, y))

            if is_major:
                painter.setPen(HUDTheme.COLOR_TEXT_PRIMARY)
                painter.drawText(QRectF(14, y - 6, 45, 12), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, f"{alt}")

        # Center Pointer Box
        box_rect = QRectF(2, cy - 12, w - 4, 24)
        painter.fillRect(box_rect, QBrush(QColor(15, 23, 42, 240)))
        painter.setPen(QPen(HUDTheme.COLOR_RETICLE, 1.5))
        painter.drawRoundedRect(box_rect, 3, 3)

        painter.setFont(HUDTheme.font_instrument_value(9))
        painter.setPen(HUDTheme.COLOR_RETICLE)
        painter.drawText(box_rect, Qt.AlignmentFlag.AlignCenter, f"{self._alt_msl:.0f}m")

        # Top MSL Label & Bottom AGL Label
        painter.setFont(HUDTheme.font_instrument_label(7))
        painter.setPen(HUDTheme.COLOR_TEXT_MUTED)
        painter.drawText(QRectF(2, 2, w - 4, 14), Qt.AlignmentFlag.AlignCenter, "ALT MSL")

        painter.setPen(HUDTheme.COLOR_POSITIVE)
        painter.drawText(QRectF(2, h - 16, w - 4, 14), Qt.AlignmentFlag.AlignCenter, f"AGL {self._alt_agl:.0f}m")
