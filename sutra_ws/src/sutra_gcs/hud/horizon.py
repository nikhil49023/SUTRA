"""
Smart Horizon GCS — Primary Flight Display Artificial Horizon Instrument
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

import math
from typing import Any, Dict, Optional
from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QBrush, QColor, QFont, QPainter, QPainterPath, QPen, QPolygonF
from PySide6.QtWidgets import QWidget

from .hud_theme import HUDTheme
from .models import HUDModel


class ArtificialHorizon:
    """
    Mathematical projection helper for horizon line and sky/ground splits.
    """

    @staticmethod
    def calculate_horizon_line(
        roll_rad: float, pitch_deg: float, width: float, height: float
    ) -> Dict[str, Any]:
        cx = width / 2.0
        cy = height / 2.0
        pitch_pixels_per_deg = height / 60.0
        dy = pitch_deg * pitch_pixels_per_deg

        return {
            "center_x": cx,
            "center_y": cy + dy,
            "roll_rad": roll_rad,
            "sky_color": "#0e7490",
            "ground_color": "#78350f",
        }


class ArtificialHorizonWidget(QWidget):
    """
    High-performance QPainter-based Primary Flight Display Artificial Horizon.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self._pitch_deg: float = 0.0
        self._roll_deg: float = 0.0
        self._stale: bool = False
        self.setMinimumSize(220, 220)

    def update_attitude(self, pitch_deg: float, roll_deg: float, is_stale: bool = False) -> None:
        if self._pitch_deg != pitch_deg or self._roll_deg != roll_deg or self._stale != is_stale:
            self._pitch_deg = pitch_deg
            self._roll_deg = roll_deg
            self._stale = is_stale
            self.update()

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w = self.width()
        h = self.height()
        cx = w / 2.0
        cy = h / 2.0
        radius = min(w, h) / 2.0 - 4.0

        # Clip to circular/rounded tactical bezel
        clip_path = QPainterPath()
        clip_path.addRoundedRect(QRectF(4, 4, w - 8, h - 8), 12, 12)
        painter.setClipPath(clip_path)

        # Draw Artificial Horizon Transformation
        painter.save()
        painter.translate(cx, cy)
        painter.rotate(-self._roll_deg)

        pitch_pixels_per_deg = h / 60.0
        pitch_offset = self._pitch_deg * pitch_pixels_per_deg

        # Sky
        sky_rect = QRectF(-w * 2, -h * 2 + pitch_offset, w * 4, h * 2)
        painter.fillRect(sky_rect, HUDTheme.COLOR_SKY)

        # Ground
        ground_rect = QRectF(-w * 2, pitch_offset, w * 4, h * 2)
        painter.fillRect(ground_rect, HUDTheme.COLOR_GROUND)

        # Horizon Dividing Line
        pen_horizon = QPen(HUDTheme.COLOR_HORIZON_LINE, 2)
        painter.setPen(pen_horizon)
        painter.drawLine(QPointF(-w * 2, pitch_offset), QPointF(w * 2, pitch_offset))

        # Pitch Ladder Markings
        self._draw_pitch_ladder(painter, pitch_offset, pitch_pixels_per_deg, w)

        painter.restore()

        # Fixed Aircraft Reference Reticle (does NOT rotate with horizon)
        self._draw_aircraft_reticle(painter, cx, cy)

        # Bezel Border
        painter.setPen(QPen(HUDTheme.COLOR_BORDER, 2))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawRoundedRect(QRectF(4, 4, w - 8, h - 8), 12, 12)

        # Stale Warning Flag
        if self._stale:
            painter.setPen(HUDTheme.COLOR_WARNING)
            painter.setFont(HUDTheme.font_instrument_label(8))
            painter.drawText(QRectF(10, 10, w - 20, 20), Qt.AlignmentFlag.AlignCenter, "ATTITUDE STALE")

    def _draw_pitch_ladder(self, painter: QPainter, pitch_offset: float, px_per_deg: float, width: float) -> None:
        pen_ladder = QPen(HUDTheme.COLOR_PITCH_LADDER, 1.5)
        painter.setPen(pen_ladder)
        painter.setFont(HUDTheme.font_instrument_label(8))

        for deg in range(-60, 65, 10):
            if deg == 0:
                continue
            y = pitch_offset - (deg * px_per_deg)
            is_major = (deg % 20 == 0)
            bar_w = 40.0 if is_major else 24.0

            # Left wing
            painter.drawLine(QPointF(-bar_w - 15, y), QPointF(-15, y))
            # Right wing
            painter.drawLine(QPointF(15, y), QPointF(bar_w + 15, y))

            # Degree labels on major rungs
            if is_major:
                painter.drawText(int(-bar_w - 35), int(y + 4), f"{abs(deg)}")
                painter.drawText(int(bar_w + 18), int(y + 4), f"{abs(deg)}")

    def _draw_aircraft_reticle(self, painter: QPainter, cx: float, cy: float) -> None:
        pen_reticle = QPen(HUDTheme.COLOR_RETICLE, 2.5)
        painter.setPen(pen_reticle)

        # Center dot
        painter.setBrush(QBrush(HUDTheme.COLOR_RETICLE))
        painter.drawEllipse(QPointF(cx, cy), 2.5, 2.5)

        # Wings & Pip
        painter.drawLine(QPointF(cx - 35, cy), QPointF(cx - 12, cy))
        painter.drawLine(QPointF(cx - 12, cy), QPointF(cx - 12, cy + 6))
        painter.drawLine(QPointF(cx + 12, cy), QPointF(cx + 35, cy))
        painter.drawLine(QPointF(cx + 12, cy), QPointF(cx + 12, cy + 6))
