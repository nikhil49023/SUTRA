"""
Smart Horizon GCS — Tactical Flight Route & Leg Polyline Renderer
Subsystem: Map Layer (Phase 3)
"""

import math
from typing import List, Optional

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import (
    QBrush,
    QColor,
    QFont,
    QPainter,
    QPen,
    QPolygonF,
)

from mission.route_calculator import RouteCalculator
from mission.waypoint import Waypoint
from .map_camera import MapCamera


class RouteRenderer:
    """
    Renders connected flight corridors, home launch origin, direction arrows, and segment distance tags.
    """

    @classmethod
    def render_route(
        cls,
        painter: QPainter,
        camera: MapCamera,
        waypoints: List[Waypoint],
        home_lat: float,
        home_lon: float,
        active_index: int,
        width: int,
        height: int,
    ) -> None:
        """Renders the entire connected mission route."""
        painter.save()

        # 1. Render Home Marker
        hx, hy = camera.geo_to_screen(home_lat, home_lon, width, height)
        home_pt = QPointF(hx, hy)

        painter.setPen(QPen(QColor(16, 185, 129), 2))
        painter.setBrush(QBrush(QColor(11, 17, 30, 240)))
        painter.drawRect(QRectF(hx - 10, hy - 10, 20, 20))

        painter.setFont(QFont("monospace", 8, QFont.Bold))
        painter.setPen(QPen(QColor(16, 185, 129)))
        painter.drawText(QRectF(hx - 10, hy - 10, 20, 20), Qt.AlignCenter, "H")
        painter.drawText(QRectF(hx - 40, hy + 12, 80, 14), Qt.AlignCenter, "HOME")

        if not waypoints:
            painter.restore()
            return

        # 2. Collect Screen Points
        points: List[QPointF] = [home_pt]
        for wp in waypoints:
            sx, sy = camera.geo_to_screen(wp.latitude, wp.longitude, width, height)
            points.append(QPointF(sx, sy))

        # 3. Draw Route Segments
        for i in range(len(points) - 1):
            p1 = points[i]
            p2 = points[i + 1]

            is_active_leg = (i == active_index)

            # Leg Line Styling
            if is_active_leg:
                pen = QPen(QColor(0, 242, 254), 2.5, Qt.SolidLine)
            else:
                pen = QPen(QColor(56, 189, 248, 160), 1.5, Qt.DashLine)

            painter.setPen(pen)
            painter.drawLine(p1, p2)

            # Draw Direction Arrow at Midpoint
            cls._draw_direction_arrow(painter, p1, p2)

        painter.restore()

    @classmethod
    def _draw_direction_arrow(cls, painter: QPainter, p1: QPointF, p2: QPointF) -> None:
        """Draws a small chevron direction arrow along the leg."""
        dx = p2.x() - p1.x()
        dy = p2.y() - p1.y()
        length = math.hypot(dx, dy)

        if length < 30:
            return

        mid_x = (p1.x() + p2.x()) / 2.0
        mid_y = (p1.y() + p2.y()) / 2.0
        angle = math.atan2(dy, dx)

        arrow_size = 6.0
        p_left = QPointF(
            mid_x - arrow_size * math.cos(angle - math.pi / 6),
            mid_y - arrow_size * math.sin(angle - math.pi / 6),
        )
        p_right = QPointF(
            mid_x - arrow_size * math.cos(angle + math.pi / 6),
            mid_y - arrow_size * math.sin(angle + math.pi / 6),
        )

        painter.save()
        painter.setPen(QPen(QColor(0, 242, 254, 200), 1.5))
        painter.drawLine(QPointF(mid_x, mid_y), p_left)
        painter.drawLine(QPointF(mid_x, mid_y), p_right)
        painter.restore()
