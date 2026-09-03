"""
Smart Horizon GCS — Tactical RF Signal Propagation Heatmap Renderer
Subsystem: Map Subsystem (Phase 7)
"""

from PySide6.QtCore import QPointF, Qt
from PySide6.QtGui import QBrush, QColor, QPainter, QPen
from state.gis_state import GISState


class RFRenderer:
    """
    Renders 2D spatial RF coverage heatmaps based on calculated Link Margins.
    """

    @classmethod
    def render_rf(
        cls,
        painter: QPainter,
        gis_state: GISState,
        lat_to_screen_y,
        lon_to_screen_x,
    ) -> None:
        if not gis_state.rf_enabled or not gis_state.rf_grid_points:
            return

        painter.save()

        for pt in gis_state.rf_grid_points:
            sx = lon_to_screen_x(pt["lon"])
            sy = lat_to_screen_y(pt["lat"])
            status = pt.get("status", "GOOD")

            if status == "EXCELLENT":
                col = QColor(16, 185, 129, 90)  # Green
            elif status == "GOOD":
                col = QColor(56, 189, 248, 80)  # Cyan
            elif status == "DEGRADED":
                col = QColor(245, 158, 11, 70)  # Amber
            else:
                col = QColor(239, 68, 68, 60)   # Red

            painter.setPen(Qt.NoPen)
            painter.setBrush(QBrush(col))
            painter.drawEllipse(QPointF(sx, sy), 10, 10)

        painter.restore()
