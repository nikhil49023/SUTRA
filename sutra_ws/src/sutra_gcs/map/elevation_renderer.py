"""
Smart Horizon GCS — Tactical Elevation Profile & Measurement Overlay Renderer
Subsystem: Map Subsystem (Phase 7)
"""

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QBrush, QColor, QFont, QPainter, QPen
from state.gis_state import GISState


class ElevationRenderer:
    """
    Renders active measurement lines, bearing flags, and elevation profile sampling paths.
    """

    @classmethod
    def render_measurements(
        cls,
        painter: QPainter,
        gis_state: GISState,
        lat_to_screen_y,
        lon_to_screen_x,
    ) -> None:
        if not gis_state.measurement_enabled:
            return

        p1 = gis_state.measurement_start
        p2 = gis_state.measurement_end
        if not p1 or not p2:
            return

        painter.save()

        p1_x = lon_to_screen_x(p1[1])
        p1_y = lat_to_screen_y(p1[0])
        p2_x = lon_to_screen_x(p2[1])
        p2_y = lat_to_screen_y(p2[0])

        pen = QPen(QColor("#00f2fe"), 2.0, Qt.SolidLine)
        painter.setPen(pen)
        painter.drawLine(QPointF(p1_x, p1_y), QPointF(p2_x, p2_y))

        # Endpoints
        painter.setBrush(QBrush(QColor("#00f2fe")))
        painter.drawEllipse(QPointF(p1_x, p1_y), 5, 5)
        painter.drawEllipse(QPointF(p2_x, p2_y), 5, 5)

        # Measurement Tag
        mid_x = (p1_x + p2_x) / 2
        mid_y = (p1_y + p2_y) / 2

        from mission.route_calculator import RouteCalculator
        dist = RouteCalculator.calculate_distance(p1[0], p1[1], p2[0], p2[1])
        bearing = RouteCalculator.calculate_bearing(p1[0], p1[1], p2[0], p2[1])

        tag = f"{dist:.1f}m | {bearing:.0f}°"
        painter.setFont(QFont("Arial", 8, QFont.Bold))
        painter.setPen(QPen(QColor("#ffffff")))
        painter.setBrush(QBrush(QColor(11, 17, 30, 200)))
        painter.drawRect(QRectF(mid_x - 45, mid_y - 12, 90, 18))
        painter.drawText(QRectF(mid_x - 45, mid_y - 12, 90, 18), Qt.AlignCenter, tag)

        painter.restore()
