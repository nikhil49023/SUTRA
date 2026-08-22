"""
Smart Horizon GCS — Tactical Geofence Map Layer & Live Drawing Renderer
Subsystem: Map Layer (Phase 4)
"""

import math
from typing import List, Optional, Tuple

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import (
    QBrush,
    QColor,
    QFont,
    QPainter,
    QPainterPath,
    QPen,
    QPolygonF,
)

from geofence.geometry import GeofenceGeometry
from geofence.models import Geofence, GeometryType, ZoneType
from state.geofence_state import GeofenceState
from .map_camera import MapCamera


class GeofenceRenderer:
    """
    Renders shaded airspace containment zones, polygon vertices, circle radiuses,
    buffered corridors, and live interactive drawing rubber-band previews.
    """

    @classmethod
    def render(
        cls,
        painter: QPainter,
        camera: MapCamera,
        geofence_state: GeofenceState,
        width: int,
        height: int,
    ) -> None:
        """Draws all active visible geofences and current drawing session preview."""
        painter.save()

        # 1. Draw Permanent Geofences
        for g in geofence_state.geofences:
            if not g.visible:
                continue
            is_selected = g.id == geofence_state.selected_geofence_id
            cls.render_geofence(painter, camera, g, is_selected, width, height)

        # 2. Draw Live Drawing Session Preview (if in drawing mode)
        if geofence_state.drawing_mode:
            cls.render_drawing_preview(
                painter,
                camera,
                geofence_state.drawing_points,
                geofence_state.preview_point,
                geofence_state.active_zone_type,
                geofence_state.active_geometry_type,
                width,
                height,
            )

        painter.restore()

    @classmethod
    def render_geofence(
        cls,
        painter: QPainter,
        camera: MapCamera,
        g: Geofence,
        is_selected: bool,
        width: int,
        height: int,
    ) -> None:
        """Renders an individual permanent geofence."""
        if g.geometry_type == GeometryType.CIRCLE:
            cls._draw_circle(painter, camera, g, is_selected, width, height)
        elif g.geometry_type == GeometryType.CORRIDOR:
            cls._draw_corridor(painter, camera, g, is_selected, width, height)
        else:
            cls._draw_polygon(painter, camera, g, is_selected, width, height)

    @classmethod
    def _draw_polygon(
        cls,
        painter: QPainter,
        camera: MapCamera,
        g: Geofence,
        is_selected: bool,
        width: int,
        height: int,
    ) -> None:
        if len(g.coordinates) < 3:
            return

        poly = QPolygonF()
        screen_points: List[QPointF] = []
        for lat, lon in g.coordinates:
            sx, sy = camera.geo_to_screen(lat, lon, width, height)
            pt = QPointF(sx, sy)
            poly.append(pt)
            screen_points.append(pt)

        # Color Configuration
        fill_col, border_col = cls._get_zone_colors(g.zone_type, is_selected)

        painter.setPen(QPen(border_col, 2.5 if is_selected else 1.8, Qt.SolidLine))
        painter.setBrush(QBrush(fill_col))
        painter.drawPolygon(poly)

        # Draw Center Name & Altitude Tag
        c_lat, c_lon = g.center_lat, g.center_lon
        cx, cy = camera.geo_to_screen(c_lat, c_lon, width, height)
        cls._draw_zone_label(painter, cx, cy, g.name, g.zone_type, g.altitude_min, g.altitude_max)

        # Draw Draggable Vertices if Selected
        if is_selected:
            cls._draw_vertex_handles(painter, screen_points, border_col)

    @classmethod
    def _draw_circle(
        cls,
        painter: QPainter,
        camera: MapCamera,
        g: Geofence,
        is_selected: bool,
        width: int,
        height: int,
    ) -> None:
        c_lat, c_lon = g.center_lat, g.center_lon
        cx, cy = camera.geo_to_screen(c_lat, c_lon, width, height)
        scale = 0.03 * (2.0 ** (camera.zoom - 10.0))
        radius_px = g.radius * scale

        fill_col, border_col = cls._get_zone_colors(g.zone_type, is_selected)

        painter.setPen(QPen(border_col, 2.5 if is_selected else 1.8, Qt.SolidLine))
        painter.setBrush(QBrush(fill_col))
        painter.drawEllipse(QPointF(cx, cy), radius_px, radius_px)

        # Center Crosshair
        painter.setPen(QPen(border_col, 1.5))
        painter.drawLine(cx - 6, cy, cx + 6, cy)
        painter.drawLine(cx, cy - 6, cx, cy + 6)

        # Radius line & Label
        painter.drawLine(cx, cy, cx + radius_px, cy)
        cls._draw_zone_label(
            painter, cx, cy + 10, f"{g.name} (R={g.radius:.0f}m)", g.zone_type, g.altitude_min, g.altitude_max
        )

    @classmethod
    def _draw_corridor(
        cls,
        painter: QPainter,
        camera: MapCamera,
        g: Geofence,
        is_selected: bool,
        width: int,
        height: int,
    ) -> None:
        if len(g.coordinates) < 2:
            return

        poly_geom = GeofenceGeometry.create_corridor(g.coordinates, g.corridor_width)
        if not poly_geom or poly_geom.is_empty:
            return

        poly = QPolygonF()
        for lon, lat in poly_geom.exterior.coords:
            sx, sy = camera.geo_to_screen(lat, lon, width, height)
            poly.append(QPointF(sx, sy))

        fill_col, border_col = cls._get_zone_colors(g.zone_type, is_selected)

        painter.setPen(QPen(border_col, 2.5 if is_selected else 1.8, Qt.SolidLine))
        painter.setBrush(QBrush(fill_col))
        painter.drawPolygon(poly)

        # Draw Centerline
        painter.setPen(QPen(border_col, 1.0, Qt.DashLine))
        for i in range(len(g.coordinates) - 1):
            sx1, sy1 = camera.geo_to_screen(g.coordinates[i][0], g.coordinates[i][1], width, height)
            sx2, sy2 = camera.geo_to_screen(g.coordinates[i + 1][0], g.coordinates[i + 1][1], width, height)
            painter.drawLine(QPointF(sx1, sy1), QPointF(sx2, sy2))

    @classmethod
    def render_drawing_preview(
        cls,
        painter: QPainter,
        camera: MapCamera,
        points: List[Tuple[float, float]],
        preview_point: Optional[Tuple[float, float]],
        zone_type: ZoneType,
        geometry_type: GeometryType,
        width: int,
        height: int,
    ) -> None:
        """Renders dynamic rubber-band polygon/circle preview while the user clicks points."""
        fill_col, border_col = cls._get_zone_colors(zone_type, is_selected=False)
        preview_fill = QColor(fill_col.red(), fill_col.green(), fill_col.blue(), 35)

        screen_pts: List[QPointF] = []
        for lat, lon in points:
            sx, sy = camera.geo_to_screen(lat, lon, width, height)
            screen_pts.append(QPointF(sx, sy))

        if preview_point:
            px, py = camera.geo_to_screen(preview_point[0], preview_point[1], width, height)
            preview_pt = QPointF(px, py)
        else:
            preview_pt = None

        # 1. Circle Mode Preview
        if geometry_type == GeometryType.CIRCLE:
            if screen_pts and preview_pt:
                center = screen_pts[0]
                radius_px = math.hypot(preview_pt.x() - center.x(), preview_pt.y() - center.y())
                painter.setPen(QPen(border_col, 2.0, Qt.DashLine))
                painter.setBrush(QBrush(preview_fill))
                painter.drawEllipse(center, radius_px, radius_px)
                painter.drawLine(center, preview_pt)
                return

        # 2. Polygon / Corridor Mode Preview
        all_pts = list(screen_pts)
        if preview_pt:
            all_pts.append(preview_pt)

        if len(all_pts) >= 3:
            poly = QPolygonF(all_pts)
            painter.setPen(QPen(border_col, 2.0, Qt.DashLine))
            painter.setBrush(QBrush(preview_fill))
            painter.drawPolygon(poly)
        elif len(all_pts) == 2:
            painter.setPen(QPen(border_col, 2.0, Qt.DashLine))
            painter.drawLine(all_pts[0], all_pts[1])

        # Draw Vertex Marker Handles on points clicked so far
        cls._draw_vertex_handles(painter, screen_pts, border_col)

    @classmethod
    def _draw_vertex_handles(cls, painter: QPainter, points: List[QPointF], color: QColor) -> None:
        """Draws small square handles on polygon vertices for interactive dragging."""
        painter.setPen(QPen(color, 2))
        painter.setBrush(QBrush(QColor("#050811")))
        for i, pt in enumerate(points):
            painter.drawRect(QRectF(pt.x() - 5, pt.y() - 5, 10, 10))
            painter.setFont(QFont("monospace", 7, QFont.Bold))
            painter.setPen(QPen(QColor("#f8fafc")))
            painter.drawText(QRectF(pt.x() - 10, pt.y() - 18, 20, 12), Qt.AlignCenter, f"V{i+1}")
            painter.setPen(QPen(color, 2))

    @classmethod
    def _draw_zone_label(
        cls,
        painter: QPainter,
        cx: float,
        cy: float,
        name: str,
        zone_type: ZoneType,
        alt_min: float,
        alt_max: float,
    ) -> None:
        painter.save()
        painter.setFont(QFont("monospace", 8, QFont.Bold))

        badge_color = (
            QColor(239, 68, 68)
            if zone_type == ZoneType.NO_FLY
            else (QColor(245, 158, 11) if zone_type == ZoneType.WARNING else QColor(16, 185, 129))
        )

        painter.setPen(QPen(badge_color))
        painter.drawText(QRectF(cx - 100, cy - 8, 200, 16), Qt.AlignCenter, name.upper())

        painter.setFont(QFont("monospace", 7))
        painter.setPen(QPen(QColor(148, 163, 184)))
        painter.drawText(
            QRectF(cx - 100, cy + 8, 200, 14),
            Qt.AlignCenter,
            f"[{zone_type.value}] {alt_min:.0f}-{alt_max:.0f}m AGL",
        )
        painter.restore()

    @classmethod
    def _get_zone_colors(cls, zone_type: ZoneType, is_selected: bool) -> Tuple[QColor, QColor]:
        """Returns (fill_color, border_color) with tactical transparency."""
        if zone_type == ZoneType.NO_FLY:
            fill = QColor(239, 68, 68, 55 if is_selected else 40)
            border = QColor(239, 68, 68) if not is_selected else QColor(255, 100, 100)
        elif zone_type == ZoneType.WARNING:
            fill = QColor(245, 158, 11, 55 if is_selected else 40)
            border = QColor(245, 158, 11) if not is_selected else QColor(255, 200, 50)
        else:
            fill = QColor(16, 185, 129, 55 if is_selected else 40)
            border = QColor(16, 185, 129) if not is_selected else QColor(50, 255, 180)
        return fill, border
