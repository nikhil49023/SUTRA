"""
Smart Horizon GCS — Tactical Waypoint Marker Renderer
Subsystem: Map Layer (Phase 3)
"""

from typing import List, Optional

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import (
    QBrush,
    QColor,
    QFont,
    QPainter,
    QPen,
)

from mission.waypoint import Waypoint, WaypointCommand
from .map_camera import MapCamera


class WaypointRenderer:
    """
    Renders styled tactical numbered waypoint markers with altitude tags and selection highlights.
    """

    @classmethod
    def render_waypoints(
        cls,
        painter: QPainter,
        camera: MapCamera,
        waypoints: List[Waypoint],
        selected_wp_id: Optional[str],
        width: int,
        height: int,
    ) -> None:
        """Draws all mission waypoints on the canvas."""
        if not waypoints:
            return

        for wp in waypoints:
            cls.render_single_waypoint(
                painter,
                camera,
                wp,
                is_selected=(wp.id == selected_wp_id),
                width=width,
                height=height,
            )

    @classmethod
    def render_single_waypoint(
        cls,
        painter: QPainter,
        camera: MapCamera,
        wp: Waypoint,
        is_selected: bool,
        width: int,
        height: int,
    ) -> None:
        """Renders an individual waypoint marker."""
        sx, sy = camera.geo_to_screen(wp.latitude, wp.longitude, width, height)
        pt = QPointF(sx, sy)

        painter.save()

        # 1. Selection Highlight Ring
        if is_selected:
            painter.setPen(QPen(QColor(0, 242, 254, 220), 2, Qt.DashLine))
            painter.setBrush(QBrush(QColor(0, 242, 254, 40)))
            painter.drawEllipse(pt, 18, 18)

        # 2. Main Marker Outer Ring & Fill
        marker_color = (
            QColor(0, 242, 254)
            if is_selected
            else (
                QColor(16, 185, 129)
                if wp.command == WaypointCommand.TAKEOFF
                else (
                    QColor(245, 158, 11)
                    if wp.command == WaypointCommand.LOITER
                    else (
                        QColor(239, 68, 68)
                        if wp.command == WaypointCommand.RTL
                        else QColor(56, 189, 248)
                    )
                )
            )
        )

        painter.setPen(QPen(marker_color, 2))
        painter.setBrush(QBrush(QColor(11, 17, 30, 240)))
        painter.drawEllipse(pt, 11, 11)

        # 3. Waypoint Index Number Inside Marker
        painter.setFont(QFont("monospace", 8, QFont.Bold))
        painter.setPen(QPen(QColor(248, 250, 252)))
        painter.drawText(QRectF(sx - 11, sy - 11, 22, 22), Qt.AlignCenter, str(wp.index))

        # 4. Altitude & Command Label Tag Beneath Marker
        painter.setFont(QFont("monospace", 7, QFont.Bold))
        tag_text = f"WP{wp.index:02d} | {wp.altitude:.0f}m"
        if wp.command != WaypointCommand.WAYPOINT:
            tag_text += f" [{wp.command.value[:4]}]"

        painter.setPen(QPen(QColor(148, 163, 184)))
        painter.drawText(QRectF(sx - 60, sy + 13, 120, 14), Qt.AlignCenter, tag_text)

        painter.restore()
