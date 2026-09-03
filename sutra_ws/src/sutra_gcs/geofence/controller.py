"""
Smart Horizon GCS — Geofence Interactive Controller & Drawing State Machine
Subsystem: Geofence Subsystem (Phase 4)
"""

import copy
import logging
import time
from dataclasses import replace
from typing import List, Optional, Tuple, Union

from services.event_bus import EventBus, get_event_bus

from .geometry import GeofenceGeometry
from .models import Geofence, GeometryType, ZoneType
from .service import GeofenceService, get_geofence_service

logger = logging.getLogger("sutra_gcs.geofence_controller")


class GeofenceController:
    """
    Interactive canvas controller managing real-time geofence polygon drawing,
    rubber-band previews, vertex dragging, circle radius resizing, and undo/redo stacks.
    """

    def __init__(
        self,
        service: Optional[GeofenceService] = None,
        state_store=None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.service = service or get_geofence_service()
        if state_store is None:
            from state.application_state import get_state_store
            self.state_store = get_state_store()
        else:
            self.state_store = state_store
        self.event_bus = event_bus or get_event_bus()

        # Undo / Redo History
        self._history = []
        self._redo_stack: List[GeofenceState] = []
        self._max_history = 50

    # ── 1. Drawing Session State Machine ─────────────────────────────────────
    def start_drawing(
        self,
        zone_type: ZoneType = ZoneType.NO_FLY,
        geometry_type: GeometryType = GeometryType.POLYGON,
    ) -> None:
        """Enters interactive map drawing mode."""
        self._push_history()
        self.state_store.update_state(
            lambda s: replace(
                s,
                geofence_state=replace(
                    s.geofence_state,
                    drawing_mode=True,
                    drawing_points=[],
                    preview_point=None,
                    active_zone_type=zone_type,
                    active_geometry_type=geometry_type,
                ),
            )
        )
        self.event_bus.emit(
            "geofence.drawing_started",
            payload={"zone_type": zone_type.value, "geometry_type": geometry_type.value},
            source="geofence_controller",
        )

    def add_drawing_point(self, lat: float, lon: float) -> List[Tuple[float, float]]:
        """Appends a new vertex coordinate to the active drawing session."""
        current = self.state_store.get_state().geofence_state
        if not current.drawing_mode:
            return []

        pts = list(current.drawing_points) + [(lat, lon)]
        self.state_store.update_state(
            lambda s: replace(
                s,
                geofence_state=replace(
                    s.geofence_state,
                    drawing_points=pts,
                ),
            )
        )
        return pts

    def update_preview_point(self, lat: float, lon: float) -> None:
        """Updates the rubber-band cursor point for real-time map preview."""
        current = self.state_store.get_state().geofence_state
        if not current.drawing_mode:
            return

        self.state_store.update_state(
            lambda s: replace(
                s,
                geofence_state=replace(
                    s.geofence_state,
                    preview_point=(lat, lon),
                ),
            )
        )

    def undo_drawing_point(self) -> None:
        """Removes the last added drawing vertex."""
        current = self.state_store.get_state().geofence_state
        if not current.drawing_mode or not current.drawing_points:
            return

        pts = list(current.drawing_points)[:-1]
        self.state_store.update_state(
            lambda s: replace(
                s,
                geofence_state=replace(
                    s.geofence_state,
                    drawing_points=pts,
                ),
            )
        )

    def finish_drawing(self, name: Optional[str] = None) -> Optional[Geofence]:
        """Validates drawing vertices and creates permanent Geofence."""
        current = self.state_store.get_state().geofence_state
        if not current.drawing_mode:
            return None

        pts = current.drawing_points
        geo_type = current.active_geometry_type
        zone_type = current.active_zone_type

        # 1. Validation
        if geo_type == GeometryType.POLYGON:
            if len(pts) < 3:
                self.event_bus.emit(
                    "geofence.validation_failed",
                    payload={"error": "Polygon requires at least 3 vertices."},
                    source="geofence_controller",
                )
                return None
            if not GeofenceGeometry.is_valid(pts):
                self.event_bus.emit(
                    "geofence.validation_failed",
                    payload={"error": "Polygon geometry is self-intersecting or invalid."},
                    source="geofence_controller",
                )
                return None

            zone_name = name or f"{zone_type.value} Polygon Zone"
            g = self.service.create_geofence(
                name=zone_name,
                zone_type=zone_type,
                geometry_type=geo_type,
                coordinates=pts,
            )

        elif geo_type == GeometryType.CIRCLE:
            if not pts:
                return None
            center = pts[0]
            # Radius calculation from preview or second point
            radius = 200.0
            if len(pts) >= 2:
                from mission.route_calculator import RouteCalculator
                radius = RouteCalculator.calculate_distance(
                    center[0], center[1], pts[1][0], pts[1][1]
                )
            elif current.preview_point:
                from mission.route_calculator import RouteCalculator
                radius = RouteCalculator.calculate_distance(
                    center[0], center[1], current.preview_point[0], current.preview_point[1]
                )

            zone_name = name or f"{zone_type.value} Circle Zone"
            g = self.service.create_geofence(
                name=zone_name,
                zone_type=zone_type,
                geometry_type=geo_type,
                center=center,
                radius=max(20.0, radius),
            )

        elif geo_type == GeometryType.CORRIDOR:
            if len(pts) < 2:
                self.event_bus.emit(
                    "geofence.validation_failed",
                    payload={"error": "Corridor requires at least 2 centerline points."},
                    source="geofence_controller",
                )
                return None

            zone_name = name or f"{zone_type.value} Flight Corridor"
            g = self.service.create_geofence(
                name=zone_name,
                zone_type=zone_type,
                geometry_type=geo_type,
                coordinates=pts,
                corridor_width=60.0,
            )
        else:
            return None

        # Exit drawing mode
        self.state_store.update_state(
            lambda s: replace(
                s,
                geofence_state=replace(
                    s.geofence_state,
                    drawing_mode=False,
                    drawing_points=[],
                    preview_point=None,
                ),
            )
        )

        self.event_bus.emit(
            "geofence.drawing_finished",
            payload={"geofence_id": g.id, "name": g.name},
            source="geofence_controller",
        )
        return g

    def cancel_drawing(self) -> None:
        """Aborts drawing mode without saving."""
        self.state_store.update_state(
            lambda s: replace(
                s,
                geofence_state=replace(
                    s.geofence_state,
                    drawing_mode=False,
                    drawing_points=[],
                    preview_point=None,
                ),
            )
        )
        self.event_bus.emit("geofence.drawing_cancelled", source="geofence_controller")

    # ── 2. Vertex Dragging & Real-Time Geometry Modification ─────────────────
    def move_vertex(self, geofence_id: str, vertex_index: int, lat: float, lon: float) -> Optional[Geofence]:
        """Updates the position of an individual polygon vertex in real time."""
        g = self.service.get_geofence(geofence_id)
        if not g or vertex_index >= len(g.coordinates):
            return None

        coords = list(g.coordinates)
        coords[vertex_index] = (lat, lon)

        return self.service.update_geofence(geofence_id, coordinates=coords)

    def move_circle_center(self, geofence_id: str, lat: float, lon: float) -> Optional[Geofence]:
        """Moves a circle geofence to a new center coordinate."""
        return self.service.update_geofence(geofence_id, center=(lat, lon))

    def resize_circle_radius(self, geofence_id: str, radius_m: float) -> Optional[Geofence]:
        """Resizes circle geofence radius."""
        return self.service.update_geofence(geofence_id, radius=max(10.0, radius_m))

    # ── 3. Undo / Redo History Stack ─────────────────────────────────────────
    def _push_history(self) -> None:
        current = self.state_store.get_state().geofence_state
        self._history.append(copy.deepcopy(current))
        if len(self._history) > self._max_history:
            self._history.pop(0)
        self._redo_stack.clear()

    def undo(self) -> bool:
        """Reverts the last geofence action."""
        if not self._history:
            return False

        current = self.state_store.get_state().geofence_state
        self._redo_stack.append(copy.deepcopy(current))
        prev = self._history.pop()

        self.state_store.update_state(lambda s: replace(s, geofence_state=prev))
        self.event_bus.emit("geofence.updated", source="geofence_controller_undo")
        return True

    def redo(self) -> bool:
        """Restores a previously reverted geofence action."""
        if not self._redo_stack:
            return False

        current = self.state_store.get_state().geofence_state
        self._history.append(copy.deepcopy(current))
        nxt = self._redo_stack.pop()

        self.state_store.update_state(lambda s: replace(s, geofence_state=nxt))
        self.event_bus.emit("geofence.updated", source="geofence_controller_redo")
        return True


# Global singleton
_global_geofence_controller: Optional[GeofenceController] = None


def get_geofence_controller() -> GeofenceController:
    """Returns global GeofenceController singleton."""
    global _global_geofence_controller
    if _global_geofence_controller is None:
        _global_geofence_controller = GeofenceController()
    return _global_geofence_controller
