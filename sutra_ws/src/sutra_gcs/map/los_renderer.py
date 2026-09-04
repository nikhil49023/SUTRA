"""
Smart Horizon GCS — Tactical Line-of-Sight (LOS) Map Overlay Renderer
Subsystem: Map Subsystem (Phase 7)
"""

from typing import List
from PySide6.QtCore import QPointF, Qt
from PySide6.QtGui import QBrush, QColor, QFont, QPainter, QPen
from state.gis_state import GISState


class LOSRenderer:
    """
    Renders 3D Line-of-Sight optical ray vectors on the tactical map.
    Green = Unobstructed Path, Red = Terrain Blockage.
    """

    @classmethod
    def render_los(
        cls,
        painter: QPainter,
        gis_state: GISState,
        lat_to_screen_y,
        lon_to_screen_x,
    ) -> None:
        if not gis_state.los_enabled or not gis_state.los_vectors:
            return

        painter.save()

        for vec in gis_state.los_vectors:
            p1_x = lon_to_screen_x(vec["obs_lon"])
            p1_y = lat_to_screen_y(vec["obs_lat"])
            p2_x = lon_to_screen_x(vec["target_lon"])
            p2_y = lat_to_screen_y(vec["target_lat"])

            is_visible = vec.get("visible", True)
            color = QColor("#10b981") if is_visible else QColor("#ef4444")

            pen = QPen(color, 2.0, Qt.SolidLine if is_visible else Qt.DashLine)
            painter.setPen(pen)
            painter.drawLine(QPointF(p1_x, p1_y), QPointF(p2_x, p2_y))

            # Draw endpoints
            painter.setBrush(QBrush(color))
            painter.drawEllipse(QPointF(p1_x, p1_y), 4, 4)
            painter.drawEllipse(QPointF(p2_x, p2_y), 4, 4)

        painter.restore()
