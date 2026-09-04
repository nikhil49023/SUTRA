"""
Smart Horizon GCS — Tactical Ground Speed & Airspeed Tape Instrument
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

from typing import Optional
from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QBrush, QColor, QFont, QPainter, QPen
from PySide6.QtWidgets import QWidget

from .hud_formatter import HUDFormatter
from .hud_theme import HUDTheme
from .models import UnitSystem


class SpeedTape(QWidget):
    """
    Vertical tape displaying Ground Speed and Pitot-Static Airspeed.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self._gs_mps: float = 0.0
        self._as_mps: Optional[float] = None
        self._unit = UnitSystem.METRIC
        self.setFixedWidth(70)
        self.setMinimumHeight(180)

    def set_speed(
        self, gs_mps: float, as_mps: Optional[float] = None, unit: UnitSystem = UnitSystem.METRIC
    ) -> None:
        self._gs_mps = gs_mps
        self._as_mps = as_mps
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

        # Vertical Speed Marks (0 to 30 m/s span)
        px_per_mps = h / 30.0
        painter.setFont(HUDTheme.font_instrument_label(7))

        for spd in range(max(0, int(self._gs_mps - 15)), int(self._gs_mps + 18), 2):
            y = cy - (spd - self._gs_mps) * px_per_mps
            if y < 4 or y > h - 4:
                continue

            is_major = (spd % 5 == 0)
            tick_w = 10 if is_major else 5

            painter.setPen(QPen(HUDTheme.COLOR_PITCH_LADDER if is_major else HUDTheme.COLOR_DISABLED, 1.2))
            painter.drawLine(QPointF(w - 2 - tick_w, y), QPointF(w - 2, y))

            if is_major:
                painter.setPen(HUDTheme.COLOR_TEXT_PRIMARY)
                painter.drawText(QRectF(w - 38, y - 6, 25, 12), Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter, f"{spd}")

        # Center Ground Speed Pointer Box
        box_rect = QRectF(2, cy - 12, w - 4, 24)
        painter.fillRect(box_rect, QBrush(QColor(15, 23, 42, 240)))
        painter.setPen(QPen(HUDTheme.COLOR_PRIMARY, 1.5))
        painter.drawRoundedRect(box_rect, 3, 3)

        painter.setFont(HUDTheme.font_instrument_value(9))
        painter.setPen(HUDTheme.COLOR_PRIMARY)
        painter.drawText(box_rect, Qt.AlignmentFlag.AlignCenter, f"{self._gs_mps:.1f}")

        # Top GS Label & Bottom Airspeed Label
        painter.setFont(HUDTheme.font_instrument_label(7))
        painter.setPen(HUDTheme.COLOR_TEXT_MUTED)
        painter.drawText(QRectF(2, 2, w - 4, 14), Qt.AlignmentFlag.AlignCenter, "GS m/s")

        air_txt = f"AIR {self._as_mps:.1f}" if self._as_mps is not None else "AIR ---"
        painter.setPen(HUDTheme.COLOR_TEXT_MUTED)
        painter.drawText(QRectF(2, h - 16, w - 4, 14), Qt.AlignmentFlag.AlignCenter, air_txt)
