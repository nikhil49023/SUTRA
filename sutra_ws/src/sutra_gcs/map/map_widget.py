"""
Smart Horizon GCS — Tactical Persistent QPainter Map Widget
Subsystem: Map Layer (Phases 2 & 3)
"""

import math
from typing import Dict, List, Optional, Tuple

from PySide6.QtCore import QPointF, QRectF, Qt, QTimer, Signal
from PySide6.QtGui import (
    QBrush,
    QColor,
    QFont,
    QMouseEvent,
    QPaintEvent,
    QPainter,
    QPen,
    QPolygonF,
    QWheelEvent,
)
from PySide6.QtWidgets import QWidget

from mission.mission_manager import get_mission_manager
from mission.waypoint import Waypoint
from services.event_bus import EventBus, EventNames, get_event_bus
from state.application_state import ApplicationState, StateStore, get_state_store
from state.fleet_state import DroneState, FleetState

from .map_camera import MapCamera
from .map_controller import MapController
from .map_state_adapter import MapStateAdapter
from .route_renderer import RouteRenderer
from .waypoint_renderer import WaypointRenderer


class MapWidget(QWidget):
    """
    Persistent, high-performance tactical GIS map canvas rendered with QPainter.
    Supports interactive multi-agent tracking, draw-waypoint mode, drag-waypoint manipulation,
    and automatic route calculation.
    """

    drone_selected = Signal(str)
    waypoint_selected = Signal(str)
    center_changed = Signal(float, float)

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()

        # Core Camera, Controller & State Adapter
        self.camera = MapCamera()
        self.adapter = MapStateAdapter(self.state_store, self.camera)
        self.controller = MapController(self.camera, self.state_store, self.event_bus)

        # Mouse & Mode States
        self._dragging_camera = False
        self._dragged_wp_id: Optional[str] = None
        self._last_mouse_pos = QPointF()
        self.draw_mode = False  # If True, map clicks add new waypoints

        # Enable mouse tracking for interactive hover & responsive dragging
        self.setMouseTracking(True)
        self.setFocusPolicy(Qt.StrongFocus)

        # Repaint timer (60Hz animation loop)
        self.render_timer = QTimer(self)
        self.render_timer.timeout.connect(self._on_render_tick)
        self.render_timer.start(16)

    def set_draw_mode(self, enabled: bool) -> None:
        """Toggles interactive click-to-add waypoint mode."""
        self.draw_mode = enabled
        self.setCursor(Qt.CrossCursor if enabled else Qt.ArrowCursor)

    def _on_render_tick(self) -> None:
        # If follow_drone is active, center on selected drone
        if self.camera.follow_drone and self.camera.selected_drone_id:
            fleet = self.state_store.get_state().fleet_state
            drone = fleet.get_drone(self.camera.selected_drone_id)
            if drone:
                self.camera.latitude = drone.latitude
                self.camera.longitude = drone.longitude
        self.update()

    def paintEvent(self, event: QPaintEvent) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        w = self.width()
        h = self.height()

        # 1. Dark Tactical Background
        painter.fillRect(0, 0, w, h, QColor("#050811"))

        # 2. Tactical Coordinate Grid
        self._draw_grid(painter, w, h)

        # 3. Geofence & Danger Zones
        self._draw_geofence_boundary(painter, w, h)

        # 4. Mission Route Lines (HOME -> WP1 -> WP2 ...)
        mission_state = self.state_store.get_state().mission_state
        RouteRenderer.render_route(
            painter=painter,
            camera=self.camera,
            waypoints=mission_state.waypoints,
            home_lat=mission_state.home_latitude,
            home_lon=mission_state.home_longitude,
            active_index=mission_state.active_waypoint_index,
            width=w,
            height=h,
        )

        # 5. Mission Waypoints Markers
        WaypointRenderer.render_waypoints(
            painter=painter,
            camera=self.camera,
            waypoints=mission_state.waypoints,
            selected_wp_id=mission_state.selected_waypoint_id,
            width=w,
            height=h,
        )

        # 6. Multi-UAV Swarm Fleet
        self._draw_drones(painter, w, h)

        # 7. Tactical Overlays (Compass, Scale, Crosshairs, Draw Mode Banner)
        self._draw_hud_overlays(painter, w, h)

    def _draw_grid(self, painter: QPainter, w: int, h: int) -> None:
        """Renders grid lines with distance scale."""
        grid_pen = QPen(QColor(30, 41, 59, 120), 1, Qt.DashLine)
        painter.setPen(grid_pen)

        step = 60
        for x in range(0, w, step):
            painter.drawLine(x, 0, x, h)
        for y in range(0, h, step):
            painter.drawLine(0, y, w, y)

        # Center Reticle
        reticle_pen = QPen(QColor(0, 242, 254, 80), 1)
        painter.setPen(reticle_pen)
        painter.drawLine(w // 2 - 15, h // 2, w // 2 + 15, h // 2)
        painter.drawLine(w // 2, h // 2 - 15, w // 2, h // 2 + 15)

    def _draw_geofence_boundary(self, painter: QPainter, w: int, h: int) -> None:
        """Renders the 500m geofence safety boundary circle around home."""
        mission_state = self.state_store.get_state().mission_state
        sx, sy = self.camera.geo_to_screen(
            mission_state.home_latitude, mission_state.home_longitude, w, h
        )
        scale = 0.03 * (2.0 ** (self.camera.zoom - 10.0))
        radius_px = 500.0 * scale

        painter.setPen(QPen(QColor(239, 68, 68, 160), 1.5, Qt.DashLine))
        painter.setBrush(QBrush(QColor(239, 68, 68, 12)))
        painter.drawEllipse(QPointF(sx, sy), radius_px, radius_px)

    def _draw_drones(self, painter: QPainter, w: int, h: int) -> None:
        """Renders all multi-UAV drones from FleetState."""
        fleet_state = self.state_store.get_state().fleet_state
        drones = fleet_state.get_all_drones()

        if not drones:
            drones = [
                DroneState(
                    drone_id="drone_alpha",
                    callsign="ALPHA (LEADER)",
                    is_leader=True,
                    latitude=self.camera.latitude,
                    longitude=self.camera.longitude,
                    heading=45.0,
                    altitude=25.0,
                    battery=94.0,
                ),
            ]

        for drone in drones:
            sx, sy = self.camera.geo_to_screen(drone.latitude, drone.longitude, w, h)
            is_selected = drone.drone_id == self.camera.selected_drone_id

            painter.save()
            painter.translate(sx, sy)

            # Selection Highlight Aura
            if is_selected:
                painter.setPen(QPen(QColor(0, 242, 254, 180), 2, Qt.DashLine))
                painter.setBrush(QBrush(QColor(0, 242, 254, 30)))
                painter.drawEllipse(QPointF(0, 0), 24, 24)

            # Rotate canvas for heading indicator
            painter.rotate(drone.heading)

            # Aircraft Icon (Tactical Quadcopter Triangle)
            drone_color = QColor(0, 242, 254) if drone.is_leader else QColor(56, 189, 248)
            painter.setPen(QPen(drone_color, 2))
            painter.setBrush(QBrush(QColor(11, 17, 30, 240)))

            poly = QPolygonF([
                QPointF(0, -12),
                QPointF(9, 9),
                QPointF(0, 5),
                QPointF(-9, 9),
            ])
            painter.drawPolygon(poly)
            painter.restore()

            # Drone Callsign & Battery Tag
            painter.setFont(QFont("monospace", 8, QFont.Bold))
            painter.setPen(QPen(QColor(248, 250, 252)))
            tag_text = f"[{drone.callsign.split()[0]}] {int(drone.battery)}%"
            if drone.is_leader:
                tag_text = f"★ {tag_text}"
            painter.drawText(QRectF(sx - 50, sy + 14, 100, 16), Qt.AlignCenter, tag_text)

    def _draw_hud_overlays(self, painter: QPainter, w: int, h: int) -> None:
        """Draws tactical compass rose, coordinates badge, scale bar, and draw mode banner."""
        # Top-Left Coordinates & Camera Readout
        painter.setFont(QFont("monospace", 8))
        painter.setPen(QPen(QColor(0, 242, 254)))
        info_str = f"LAT: {self.camera.latitude:.6f}° | LON: {self.camera.longitude:.6f}° | ZOOM: {self.camera.zoom:.1f}"
        painter.drawText(12, 20, info_str)

        # Draw Waypoint Mode Banner
        if self.draw_mode:
            painter.setFont(QFont("monospace", 9, QFont.Bold))
            painter.setPen(QPen(QColor(0, 242, 254)))
            painter.setBrush(QBrush(QColor(0, 242, 254, 30)))
            painter.drawRect(QRectF(12, 30, 220, 24))
            painter.drawText(QRectF(12, 30, 220, 24), Qt.AlignCenter, "✏️ DRAW WAYPOINT MODE (CLICK MAP)")

        # Scale Bar
        painter.setPen(QPen(QColor(148, 163, 184), 1.5))
        painter.drawLine(12, h - 20, 92, h - 20)
        painter.drawLine(12, h - 25, 12, h - 15)
        painter.drawLine(92, h - 25, 92, h - 15)
        painter.drawText(24, h - 24, "100 METERS")

        # Compass Rose (Top-Right)
        cx, cy = w - 30, 30
        painter.setPen(QPen(QColor(0, 242, 254), 1))
        painter.setBrush(QBrush(QColor(11, 17, 30, 200)))
        painter.drawEllipse(QPointF(cx, cy), 16, 16)
        painter.setPen(QPen(QColor(239, 68, 68), 2))
        painter.drawLine(cx, cy, cx, cy - 12)
        painter.drawText(QRectF(cx - 6, cy - 26, 12, 12), Qt.AlignCenter, "N")

    def fit_route(self) -> None:
        """Calculates bounding box of mission waypoints and centers/zooms camera."""
        mission_state = self.state_store.get_state().mission_state
        pts = [(mission_state.home_latitude, mission_state.home_longitude)]
        for wp in mission_state.waypoints:
            pts.append((wp.latitude, wp.longitude))

        if not pts:
            return

        lats = [p[0] for p in pts]
        lons = [p[1] for p in pts]

        center_lat = (max(lats) + min(lats)) / 2.0
        center_lon = (max(lons) + min(lons)) / 2.0

        self.controller.set_center(center_lat, center_lon)
        self.controller.set_zoom(16.0)

    # ── Mouse & Touch Event Handlers ─────────────────────────────────────────
    def mousePressEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.LeftButton:
            pos = event.position()
            self._last_mouse_pos = pos
            w, h = self.width(), self.height()

            # 1. Check if clicking on an existing Waypoint (to select / start drag)
            mission_mgr = get_mission_manager()
            clicked_wp_id = None
            for wp in mission_mgr.get_waypoints():
                sx, sy = self.camera.geo_to_screen(wp.latitude, wp.longitude, w, h)
                if math.hypot(pos.x() - sx, pos.y() - sy) <= 15.0:
                    clicked_wp_id = wp.id
                    break

            if clicked_wp_id:
                self._dragged_wp_id = clicked_wp_id
                mission_mgr.select_waypoint(clicked_wp_id)
                self.waypoint_selected.emit(clicked_wp_id)
                return

            # 2. Check if Draw Mode is active -> Add Waypoint at click location
            if self.draw_mode:
                click_lat, click_lon = self.camera.screen_to_geo(pos.x(), pos.y(), w, h)
                wp = mission_mgr.add_waypoint(click_lat, click_lon)
                self.waypoint_selected.emit(wp.id)
                return

            # 3. Check if clicking on a Drone
            fleet = self.state_store.get_state().fleet_state
            clicked_drone = None
            for drone in fleet.get_all_drones():
                sx, sy = self.camera.geo_to_screen(drone.latitude, drone.longitude, w, h)
                if math.hypot(pos.x() - sx, pos.y() - sy) <= 20.0:
                    clicked_drone = drone.drone_id
                    break

            if clicked_drone:
                self.controller.select_drone(clicked_drone)
                self.drone_selected.emit(clicked_drone)
                return

            # 4. Otherwise, start panning map camera
            self._dragging_camera = True

    def mouseMoveEvent(self, event: QMouseEvent) -> None:
        pos = event.position()
        w, h = self.width(), self.height()

        # Handle Waypoint Dragging
        if self._dragged_wp_id:
            new_lat, new_lon = self.camera.screen_to_geo(pos.x(), pos.y(), w, h)
            mission_mgr = get_mission_manager()
            mission_mgr.move_waypoint(self._dragged_wp_id, new_lat, new_lon)
            return

        # Handle Map Panning
        if self._dragging_camera:
            delta = pos - self._last_mouse_pos
            self._last_mouse_pos = pos

            scale = 0.03 * (2.0 ** (self.camera.zoom - 10.0))
            if scale == 0:
                scale = 1.0

            dx_m = -delta.x() / scale
            dy_m = delta.y() / scale

            lat_rad = math.radians(self.camera.latitude)
            meters_per_deg_lat = 111132.954
            meters_per_deg_lon = 111412.84 * math.cos(lat_rad)

            self.camera.longitude += dx_m / meters_per_deg_lon
            self.camera.latitude += dy_m / meters_per_deg_lat

            self.adapter.sync_to_state()
            self.center_changed.emit(self.camera.latitude, self.camera.longitude)

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.LeftButton:
            self._dragging_camera = False
            self._dragged_wp_id = None

    def wheelEvent(self, event: QWheelEvent) -> None:
        """Zoom in and out via mouse wheel."""
        delta = event.angleDelta().y()
        zoom_step = 0.25 if delta > 0 else -0.25
        self.controller.set_zoom(self.camera.zoom + zoom_step)
        event.accept()
