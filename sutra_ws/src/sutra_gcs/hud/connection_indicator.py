"""
Smart Horizon GCS — MAVLink & WebSocket Link Health HUD Indicator
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

from PySide6.QtCore import QRectF, Qt
from PySide6.QtGui import QColor, QFont, QPainter, QPen
from PySide6.QtWidgets import QWidget

from .hud_theme import HUDTheme


class ConnectionIndicator(QWidget):
    """
    Displays real-time MAVLink stream health, WebSocket state, and RTT latency.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self._ws_state: str = "READY"
        self._mavlink_state: str = "CONNECTED"
        self._latency_ms: float = 24.0
        self.setFixedHeight(30)
        self.setMinimumWidth(110)

    def set_connection(self, ws_state: str, mavlink_state: str, latency_ms: float = 0.0) -> None:
        self._ws_state = ws_state
        self._mavlink_state = mavlink_state
        self._latency_ms = latency_ms
        self.update()

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w = self.width()
        h = self.height()

        painter.fillRect(self.rect(), HUDTheme.COLOR_GLASS_BG)
        painter.setPen(QPen(HUDTheme.COLOR_BORDER, 1))
        painter.drawRect(self.rect().adjusted(0, 0, -1, -1))

        is_connected = self._ws_state in ("READY", "CONNECTED")
        col = HUDTheme.COLOR_POSITIVE if is_connected else (HUDTheme.COLOR_WARNING if self._ws_state == "RECONNECTING" else HUDTheme.COLOR_CRITICAL)

        painter.setFont(HUDTheme.font_instrument_label(7))
        painter.setPen(HUDTheme.COLOR_TEXT_MUTED)
        painter.drawText(QRectF(6, 2, w - 12, 12), Qt.AlignmentFlag.AlignLeft, "LINK HEALTH")

        painter.setFont(HUDTheme.font_instrument_value(8))
        painter.setPen(col)
        lat_txt = f"{self._latency_ms:.0f}ms" if self._latency_ms > 0 else "OK"
        painter.drawText(QRectF(6, 14, w - 12, 14), Qt.AlignmentFlag.AlignLeft, f"{self._ws_state} ({lat_txt})")
