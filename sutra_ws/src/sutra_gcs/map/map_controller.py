"""
Smart Horizon GCS — Map Controller Facade
Subsystem: Map Layer
"""

from dataclasses import replace
from typing import Any, Dict, List, Optional

from services.event_bus import EventBus, EventNames, get_event_bus
from state.application_state import StateStore, get_state_store
from state.fleet_state import DroneState
from state.mission_state import Waypoint
from .map_camera import MapCamera


class MapController:
    """
    High-level controller and abstraction for all tactical map operations.
    Allows easy swapping between PySide6 QPainter canvas and future 3D GIS engines.
    """

    def __init__(
        self,
        camera: MapCamera,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.camera = camera
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()

        self.waypoints: List[Waypoint] = []
        self.route_points: List[Waypoint] = []
        self.overlays: Dict[str, Any] = {}
        self.layer_visibility: Dict[str, bool] = {
            "grid": True,
            "drones": True,
            "waypoints": True,
            "route": True,
            "breadcrumbs": True,
        }

    def set_center(self, lat: float, lng: float) -> None:
        """Sets map geodetic center and syncs to centralized MapState."""
        self.camera.latitude = lat
        self.camera.longitude = lng
        self._sync_camera_to_state()
        self._notify_camera_changed()

    def set_zoom(self, zoom: float) -> None:
        """Sets map zoom level (bounded between 5.0 and 22.0) and syncs to MapState."""
        self.camera.zoom = max(5.0, min(22.0, zoom))
        self._sync_camera_to_state()
        self._notify_camera_changed()

    def set_bearing(self, bearing: float) -> None:
        """Sets map orientation heading and syncs to MapState."""
        self.camera.bearing = bearing % 360.0
        self._sync_camera_to_state()
        self._notify_camera_changed()

    def set_pitch(self, pitch: float) -> None:
        """Sets camera pitch angle (0 to 60 degrees) and syncs to MapState."""
        self.camera.pitch = max(0.0, min(60.0, pitch))
        self._sync_camera_to_state()
        self._notify_camera_changed()

    def _sync_camera_to_state(self) -> None:
        """Updates centralized MapState in StateStore with current camera properties."""
        self.state_store.update_state(
            lambda s: replace(
                s,
                map_state=replace(
                    s.map_state,
                    latitude=self.camera.latitude,
                    longitude=self.camera.longitude,
                    zoom=self.camera.zoom,
                    bearing=self.camera.bearing,
                    pitch=self.camera.pitch,
                    follow_drone=self.camera.follow_drone,
                    selected_drone_id=self.camera.selected_drone_id,
                ),
            )
        )

    def fly_to(self, lat: float, lng: float, zoom: Optional[float] = None) -> None:
        """Smoothly recenters camera on specific coordinates."""
        self.set_center(lat, lng)
        if zoom is not None:
            self.set_zoom(zoom)

    def add_drone(self, drone: DroneState) -> None:
        """Adds a drone to FleetState."""
        self.state_store.update_state(
            lambda s: replace(s, fleet_state=s.fleet_state.add_drone(drone))
        )
        self.event_bus.emit(EventNames.FLEET_DRONE_ADDED, payload={"drone_id": drone.drone_id})

    def update_drone(self, drone_id: str, **kwargs) -> None:
        """Updates drone attributes in FleetState."""
        self.state_store.update_state(
            lambda s: replace(s, fleet_state=s.fleet_state.update_drone(drone_id, **kwargs))
        )
        self.event_bus.emit(
            EventNames.FLEET_DRONE_UPDATED, payload={"drone_id": drone_id, "updates": kwargs}
        )

    def remove_drone(self, drone_id: str) -> None:
        """Removes a drone from FleetState."""
        self.state_store.update_state(
            lambda s: replace(s, fleet_state=s.fleet_state.remove_drone(drone_id))
        )
        self.event_bus.emit(EventNames.FLEET_DRONE_REMOVED, payload={"drone_id": drone_id})

    def select_drone(self, drone_id: Optional[str]) -> None:
        """Selects a drone and optionally engages follow mode."""
        self.camera.selected_drone_id = drone_id
        self.state_store.update_state(
            lambda s: replace(
                s,
                map_state=replace(s.map_state, selected_drone_id=drone_id),
            )
        )

    def set_follow_drone(self, follow: bool) -> None:
        """Toggles following the selected drone."""
        self.camera.follow_drone = follow
        self.state_store.update_state(
            lambda s: replace(
                s,
                map_state=replace(s.map_state, follow_drone=follow),
            )
        )

    def clear_selection(self) -> None:
        """Deselects any currently selected drone or entity."""
        self.select_drone(None)
        self.set_follow_drone(False)

    def add_waypoint(self, waypoint: Waypoint) -> None:
        """Adds a waypoint setpoint."""
        self.waypoints.append(waypoint)

    def remove_waypoint(self, index: int) -> None:
        """Removes a waypoint by index."""
        self.waypoints = [w for w in self.waypoints if w.index != index]

    def draw_route(self, waypoints: List[Waypoint]) -> None:
        """Sets the active route polyline."""
        self.route_points = list(waypoints)

    def clear_route(self) -> None:
        """Clears the route polyline."""
        self.route_points.clear()

    def add_overlay(self, key: str, data: Any) -> None:
        """Adds a custom GIS overlay."""
        self.overlays[key] = data

    def remove_overlay(self, key: str) -> None:
        """Removes a custom GIS overlay."""
        self.overlays.pop(key, None)

    def set_layer_visibility(self, layer: str, visible: bool) -> None:
        """Toggles display of a specific map layer."""
        self.layer_visibility[layer] = visible
        self.event_bus.emit(
            EventNames.MAP_LAYER_CHANGED, payload={"layer": layer, "visible": visible}
        )

    def _notify_camera_changed(self) -> None:
        self.event_bus.emit(
            EventNames.MAP_CAMERA_CHANGED,
            payload={
                "lat": self.camera.latitude,
                "lon": self.camera.longitude,
                "zoom": self.camera.zoom,
            },
        )
