"""
Smart Horizon GCS — Swarm Formation & Aircraft Role HUD Indicator
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

from PySide6.QtCore import QRectF, Qt
from PySide6.QtGui import QColor, QFont, QPainter, QPen
from PySide6.QtWidgets import QWidget

from .hud_theme import HUDTheme


class FormationIndicator(QWidget):
    """
    Displays swarm formation geometry, aircraft role, and active drone count.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self._formation: str = "V_FORMATION"
        self._role: str = "LEADER"
        self._swarm_count: int = 4
        self.setFixedHeight(30)
        self.setMinimumWidth(110)

    def set_formation(self, formation: str, role: str, swarm_count: int = 1) -> None:
        self._formation = formation
        self._role = role
        self._swarm_count = swarm_count
        self.update()

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w = self.width()
        h = self.height()

        painter.fillRect(self.rect(), HUDTheme.COLOR_GLASS_BG)
        painter.setPen(QPen(HUDTheme.COLOR_BORDER, 1))
        painter.drawRect(self.rect().adjusted(0, 0, -1, -1))

        painter.setFont(HUDTheme.font_instrument_label(7))
        painter.setPen(HUDTheme.COLOR_TEXT_MUTED)
        painter.drawText(QRectF(6, 2, w - 12, 12), Qt.AlignmentFlag.AlignLeft, "FORMATION")

        painter.setFont(HUDTheme.font_instrument_value(8))
        painter.setPen(HUDTheme.COLOR_PRIMARY)
        f_abbr = self._formation.replace("_FORMATION", "").upper()
        painter.drawText(QRectF(6, 14, w - 12, 14), Qt.AlignmentFlag.AlignLeft, f"{f_abbr} [{self._role}] ({self._swarm_count}D)")
