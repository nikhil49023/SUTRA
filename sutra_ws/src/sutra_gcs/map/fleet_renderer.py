"""
Smart Horizon GCS — Tactical Multi-Drone Swarm & Formation Layer Renderer
Subsystem: Map Subsystem (Phase 6)
"""

import math
from typing import Dict, List, Optional

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QBrush, QColor, QFont, QPainter, QPen, QPolygonF

from state.fleet_state import DroneState, FleetState


class FleetRenderer:
    """
    Renders multi-UAV swarm aircraft, leader badges, battery indicators,
    formation index tags, selection highlights, and tactical formation guide vectors.
    """

    # Tactical Color Palette
    LEADER_COLOR = QColor("#fbbf24")       # Amber Gold
    FOLLOWER_COLOR = QColor("#00f2fe")     # Tactical Cyan
    SELECTED_COLOR = QColor("#38bdf8")     # Bright Blue
    GUIDE_LINE_COLOR = QColor(0, 242, 254, 80) # Semi-transparent Cyan
    CENTROID_COLOR = QColor(245, 158, 11, 140)

    @classmethod
    def render_fleet(
        cls,
        painter: QPainter,
        fleet_state: FleetState,
        lat_to_screen_y,
        lon_to_screen_x,
        selected_drone_id: Optional[str] = None,
    ) -> None:
        """
        Main render routine called by MapWidget at 60 FPS.
        """
        drones = fleet_state.get_all_drones()
        if not drones:
            return

        leader = fleet_state.get_leader()

        # 1. Render Formation Guides (if enabled)
        if fleet_state.show_guides and leader:
            cls._render_formation_guides(
                painter, leader, drones, fleet_state, lat_to_screen_y, lon_to_screen_x
            )

        # 2. Render Individual Drones
        for drone in drones:
            sx = lon_to_screen_x(drone.longitude)
            sy = lat_to_screen_y(drone.latitude)
            is_selected = (drone.drone_id == selected_drone_id)

            cls._render_drone_marker(painter, drone, sx, sy, is_selected)

    @classmethod
    def _render_formation_guides(
        cls,
        painter: QPainter,
        leader: DroneState,
        drones: List[DroneState],
        fleet_state: FleetState,
        lat_to_screen_y,
        lon_to_screen_x,
    ) -> None:
        """Draws dotted linkage vectors and formation centroid."""
        painter.save()
        lx = lon_to_screen_x(leader.longitude)
        ly = lat_to_screen_y(leader.latitude)

        pen = QPen(cls.GUIDE_LINE_COLOR, 1.5, Qt.DashLine)
        painter.setPen(pen)

        # Connect leader to each follower
        for d in drones:
            if d.drone_id != leader.drone_id:
                fx = lon_to_screen_x(d.longitude)
                fy = lat_to_screen_y(d.latitude)
                painter.drawLine(QPointF(lx, ly), QPointF(fx, fy))

        # Formation Centroid
        total = len(drones)
        c_lat = sum(d.latitude for d in drones) / total
        c_lon = sum(d.longitude for d in drones) / total
        cx = lon_to_screen_x(c_lon)
        cy = lat_to_screen_y(c_lat)

        painter.setPen(QPen(cls.CENTROID_COLOR, 1, Qt.DotLine))
        painter.setBrush(Qt.NoBrush)
        painter.drawEllipse(QPointF(cx, cy), 8, 8)
        painter.drawLine(QPointF(cx - 10, cy), QPointF(cx + 10, cy))
        painter.drawLine(QPointF(cx, cy - 10), QPointF(cx, cy + 10))

        painter.restore()

    @classmethod
    def _render_drone_marker(
        cls,
        painter: QPainter,
        drone: DroneState,
        x: float,
        y: float,
        is_selected: bool,
    ) -> None:
        painter.save()
        painter.translate(x, y)

        color = cls.LEADER_COLOR if drone.is_leader else cls.FOLLOWER_COLOR

        # 1. Selection Highlight Ring
        if is_selected:
            sel_pen = QPen(QColor("#00f2fe"), 2.0, Qt.SolidLine)
            painter.setPen(sel_pen)
            painter.setBrush(QBrush(QColor(0, 242, 254, 30)))
            painter.drawEllipse(QPointF(0, 0), 22, 22)

        # 2. Heading Rotation for Aircraft Chevron
        painter.save()
        painter.rotate(drone.heading)

        # Aircraft Chevron Geometry
        size = 14.0 if drone.is_leader else 11.0
        poly = QPolygonF([
            QPointF(0, -size),            # Nose tip
            QPointF(size * 0.75, size),   # Right wingtip
            QPointF(0, size * 0.5),       # Center aft notch
            QPointF(-size * 0.75, size),  # Left wingtip
        ])

        painter.setPen(QPen(color.lighter(130), 1.5))
        painter.setBrush(QBrush(color))
        painter.drawPolygon(poly)

        # Leader Crown Indicator
        if drone.is_leader:
            painter.setPen(QPen(QColor("#ffffff"), 1.0))
            painter.setBrush(QBrush(QColor("#fbbf24")))
            painter.drawEllipse(QPointF(0, 0), 3.0, 3.0)

        painter.restore()

        # 3. Text Tag (Callsign, Formation Tag, Battery %)
        painter.setFont(QFont("Arial", 8, QFont.Bold))
        tag_text = f"{drone.callsign.split()[0]} [{drone.battery:.0f}%]"
        if drone.is_leader:
            tag_text += " ★"

        painter.setPen(QPen(color, 1))
        painter.drawText(QRectF(-50, size + 3, 100, 14), Qt.AlignCenter, tag_text)

        painter.restore()
