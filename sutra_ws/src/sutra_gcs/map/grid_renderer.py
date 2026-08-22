"""
Smart Horizon GCS — Tactical Search Grid & Lawn-Mower Route Renderer
Subsystem: Map Subsystem (Phase 7)
"""

from PySide6.QtCore import QPointF, Qt
from PySide6.QtGui import QColor, QPainter, QPen
from state.gis_state import GISState


class GridRenderer:
    """
    Renders tactical SAR search corridors, transects, and flight directions.
    """

    @classmethod
    def render_grid(
        cls,
        painter: QPainter,
        gis_state: GISState,
        lat_to_screen_y,
        lon_to_screen_x,
    ) -> None:
        if not gis_state.grid_enabled or not gis_state.search_path_points:
            return

        painter.save()
        pen = QPen(QColor("#f59e0b"), 1.5, Qt.DashLine)
        painter.setPen(pen)

        pts = gis_state.search_path_points
        for i in range(len(pts) - 1):
            p1_x = lon_to_screen_x(pts[i][1])
            p1_y = lat_to_screen_y(pts[i][0])
            p2_x = lon_to_screen_x(pts[i + 1][1])
            p2_y = lat_to_screen_y(pts[i + 1][0])
            painter.drawLine(QPointF(p1_x, p1_y), QPointF(p2_x, p2_y))

        painter.restore()
