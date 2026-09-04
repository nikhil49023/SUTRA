"""
Smart Horizon GCS — Map State Adapter
Subsystem: Map Layer
"""

from dataclasses import replace
from typing import Callable, Optional

from state.application_state import ApplicationState, StateStore
from state.map_state import MapState
from .map_camera import MapCamera


class MapStateAdapter:
    """
    Two-way synchronization adapter bridging the centralized MapState in StateStore
    with the local MapCamera state.
    """

    def __init__(self, state_store: StateStore, camera: MapCamera) -> None:
        self.state_store = state_store
        self.camera = camera
        self._syncing = False

        # Load initial camera from state
        self.sync_from_state(self.state_store.get_state().map_state)

        # Subscribe to future state changes
        self._unsub = self.state_store.subscribe(self._on_app_state_changed)

    def sync_from_state(self, map_state: MapState) -> None:
        """Applies MapState to the MapCamera."""
        self._syncing = True
        try:
            self.camera.latitude = map_state.latitude
            self.camera.longitude = map_state.longitude
            self.camera.zoom = map_state.zoom
            self.camera.bearing = map_state.bearing
            self.camera.pitch = map_state.pitch
            self.camera.follow_drone = map_state.follow_drone
            self.camera.selected_drone_id = map_state.selected_drone_id
        finally:
            self._syncing = False

    def sync_to_state(self) -> None:
        """Pushes current camera parameters into the centralized StateStore."""
        if self._syncing:
            return

        self.state_store.update_state(
            lambda app_state: replace(
                app_state,
                map_state=replace(
                    app_state.map_state,
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

    def _on_app_state_changed(self, app_state: ApplicationState) -> None:
        if not self._syncing:
            self.sync_from_state(app_state.map_state)

    def dispose(self) -> None:
        if hasattr(self, "_unsub"):
            self._unsub()
