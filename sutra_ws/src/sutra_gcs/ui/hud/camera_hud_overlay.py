"""
Smart Horizon GCS — Transparent Camera / Video Tactical HUD Overlay
Subsystem: UI / HUD Layer (Phase 9)
"""

from typing import Optional
from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QBrush, QColor, QFont, QPainter, QPen
from PySide6.QtWidgets import QWidget

from hud.hud_controller import HUDController, hud_controller
from hud.hud_formatter import HUDFormatter
from hud.hud_theme import HUDTheme
from hud.models import HUDModel


class CameraHUDOverlay(QWidget):
    """
    High-visibility semi-transparent tactical HUD overlay designed to float over live RTSP camera feeds or 3D map views.
    """

    def __init__(
        self,
        controller: Optional[HUDController] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.controller = controller or hud_controller
        self._model: Optional[HUDModel] = None
        self._is_recording = True

        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setStyleSheet("background: transparent;")

        # Subscribe to HUD Controller
        self._unsub_controller = self.controller.subscribe(self._on_hud_update)

    def _on_hud_update(self, model: HUDModel) -> None:
        self._model = model
        self.update()

    def paintEvent(self, event) -> None:
        if not self._model:
            return

        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w = self.width()
        h = self.height()
        cx = w / 2.0
        cy = h / 2.0

        m = self._model

        # 1. Top Status Banner (Callsign, REC Indicator, Battery, GPS)
        painter.setFont(HUDTheme.font_instrument_label(8))

        # Callsign
        painter.setPen(HUDTheme.COLOR_PRIMARY)
        painter.drawText(QRectF(16, 12, 180, 16), Qt.AlignmentFlag.AlignLeft, m.callsign)

        # Recording Indicator
        if self._is_recording:
            painter.setBrush(QBrush(HUDTheme.COLOR_CRITICAL))
            painter.setPen(Qt.PenStyle.NoPen)
            painter.drawEllipse(QPointF(cx - 30, 20), 4, 4)
            painter.setPen(HUDTheme.COLOR_CRITICAL)
            painter.drawText(QRectF(cx - 22, 12, 60, 16), Qt.AlignmentFlag.AlignLeft, "REC ●")

        # Battery & GPS (Top Right)
        bat_str = f"BAT {m.battery_percent:.0f}% ({m.battery_voltage:.1f}V)"
        gps_str = f"GPS {m.satellites} SAT"
        painter.setPen(HUDTheme.COLOR_POSITIVE if m.battery_percent > 30 else HUDTheme.COLOR_WARNING)
        painter.drawText(QRectF(w - 220, 12, 200, 16), Qt.AlignmentFlag.AlignRight, f"{bat_str}  |  {gps_str}")

        # 2. Top Heading Ticker
        hdg_str = HUDFormatter.format_heading(m.heading)
        painter.setFont(HUDTheme.font_instrument_value(10))
        painter.setPen(HUDTheme.COLOR_RETICLE)
        painter.drawText(QRectF(cx - 40, 36, 80, 20), Qt.AlignmentFlag.AlignCenter, hdg_str)

        # 3. Center Crosshair Reticle & Gimbal Target Box
        pen_reticle = QPen(HUDTheme.COLOR_RETICLE, 1.5)
        painter.setPen(pen_reticle)
        painter.setBrush(Qt.BrushStyle.NoBrush)

        # Center crosshair
        painter.drawLine(QPointF(cx - 20, cy), QPointF(cx - 6, cy))
        painter.drawLine(QPointF(cx + 6, cy), QPointF(cx + 20, cy))
        painter.drawLine(QPointF(cx, cy - 20), QPointF(cx, cy - 6))
        painter.drawLine(QPointF(cx, cy + 6), QPointF(cx, cy + 20))

        # Target Bounding Box
        box_sz = 35.0
        # Top-left corner
        painter.drawLine(QPointF(cx - box_sz, cy - box_sz), QPointF(cx - box_sz + 10, cy - box_sz))
        painter.drawLine(QPointF(cx - box_sz, cy - box_sz), QPointF(cx - box_sz, cy - box_sz + 10))
        # Top-right corner
        painter.drawLine(QPointF(cx + box_sz, cy - box_sz), QPointF(cx + box_sz - 10, cy - box_sz))
        painter.drawLine(QPointF(cx + box_sz, cy - box_sz), QPointF(cx + box_sz, cy - box_sz + 10))
        # Bottom-left corner
        painter.drawLine(QPointF(cx - box_sz, cy + box_sz), QPointF(cx - box_sz + 10, cy + box_sz))
        painter.drawLine(QPointF(cx - box_sz, cy + box_sz), QPointF(cx - box_sz, cy + box_sz - 10))
        # Bottom-right corner
        painter.drawLine(QPointF(cx + box_sz, cy + box_sz), QPointF(cx + box_sz - 10, cy + box_sz))
        painter.drawLine(QPointF(cx + box_sz, cy + box_sz), QPointF(cx + box_sz, cy + box_sz - 10))

        # 4. Left Altitude & Speed Overlay
        spd_str = f"GS: {m.ground_speed:.1f} m/s"
        alt_str = f"ALT: {m.altitude_msl:.0f}m (AGL {m.altitude_agl:.0f}m)"
        painter.setFont(HUDTheme.font_instrument_value(9))
        painter.setPen(HUDTheme.COLOR_PRIMARY)
        painter.drawText(QRectF(16, cy - 20, 140, 16), Qt.AlignmentFlag.AlignLeft, spd_str)
        painter.drawText(QRectF(16, cy + 4, 160, 16), Qt.AlignmentFlag.AlignLeft, alt_str)

        # 5. Bottom Flight Mode & Mission Status
        mode_str = f"MODE: {m.flight_mode.upper()}  |  WP: {m.current_waypoint:02d}/{m.total_waypoints:02d}"
        painter.setFont(HUDTheme.font_instrument_label(8))
        painter.setPen(HUDTheme.COLOR_TEXT_PRIMARY)
        painter.drawText(QRectF(16, h - 28, w - 32, 16), Qt.AlignmentFlag.AlignCenter, mode_str)

        # 6. Critical Warnings Banner
        if m.geofence_status.value == "BREACH":
            painter.setPen(HUDTheme.COLOR_CRITICAL)
            painter.setFont(HUDTheme.font_instrument_value(10))
            painter.drawText(QRectF(16, h - 52, w - 32, 20), Qt.AlignmentFlag.AlignCenter, "⚠ GEOFENCE BREACH ⚠")

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_controller"):
            self._unsub_controller()
        event.accept()

