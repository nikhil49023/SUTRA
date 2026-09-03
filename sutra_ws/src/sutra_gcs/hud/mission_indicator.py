"""
Smart Horizon GCS — Mission Progress & Next Waypoint ETA HUD Indicator
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

from PySide6.QtCore import QRectF, Qt
from PySide6.QtGui import QBrush, QColor, QFont, QPainter, QPen
from PySide6.QtWidgets import QWidget

from .hud_formatter import HUDFormatter
from .hud_theme import HUDTheme


class MissionIndicator(QWidget):
    """
    Displays active mission name, current waypoint / total waypoints, segment distance, and ETA.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self._name: str = "DEFAULT"
        self._cur_wp: int = 1
        self._tot_wp: int = 0
        self._dist_m: float = 0.0
        self._eta_sec: float = 0.0
        self._progress: float = 0.0
        self.setFixedHeight(48)
        self.setMinimumWidth(220)

    def set_mission(
        self, name: str, cur_wp: int, tot_wp: int, dist_m: float, eta_sec: float, progress: float
    ) -> None:
        self._name = name
        self._cur_wp = cur_wp
        self._tot_wp = tot_wp
        self._dist_m = dist_m
        self._eta_sec = eta_sec
        self._progress = max(0.0, min(100.0, progress))
        self.update()

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w = self.width()
        h = self.height()

        painter.fillRect(self.rect(), HUDTheme.COLOR_GLASS_BG)
        painter.setPen(QPen(HUDTheme.COLOR_BORDER, 1))
        painter.drawRect(self.rect().adjusted(0, 0, -1, -1))

        # Title & WP summary
        painter.setFont(HUDTheme.font_instrument_label(7))
        painter.setPen(HUDTheme.COLOR_TEXT_MUTED)
        painter.drawText(QRectF(8, 4, w / 2, 12), Qt.AlignmentFlag.AlignLeft, f"MISSION: {self._name.upper()}")

        painter.setFont(HUDTheme.font_instrument_value(8))
        painter.setPen(HUDTheme.COLOR_PRIMARY)
        wp_str = f"WP {self._cur_wp:02d}/{self._tot_wp:02d}" if self._tot_wp > 0 else "NO MISSION"
        painter.drawText(QRectF(w / 2, 4, w / 2 - 8, 12), Qt.AlignmentFlag.AlignRight, wp_str)

        # Distance & ETA
        painter.setFont(HUDTheme.font_instrument_value(8))
        painter.setPen(HUDTheme.COLOR_TEXT_PRIMARY)
        dist_str = HUDFormatter.format_distance(self._dist_m)
        eta_str = HUDFormatter.format_eta(self._eta_sec)
        painter.drawText(QRectF(8, 18, w - 16, 14), Qt.AlignmentFlag.AlignLeft, f"DIST: {dist_str}  |  ETA: {eta_str}")

        # Progress Bar Track
        bar_y = h - 10
        bar_w = w - 16
        painter.fillRect(QRectF(8, bar_y, bar_w, 4), HUDTheme.COLOR_DISABLED)
        fill_w = (self._progress / 100.0) * bar_w
        painter.fillRect(QRectF(8, bar_y, fill_w, 4), HUDTheme.COLOR_POSITIVE)
