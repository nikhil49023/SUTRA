"""
Smart Horizon GCS — Master HUD Presentation Coordinator
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

from typing import Callable, List, Optional
from services.event_bus import EventBus, get_event_bus
from state.application_state import ApplicationState, StateStore, get_state_store
from .hud_data_adapter import HUDDataAdapter
from .models import HUDModel


class HUDController:
    """
    Coordinates state ingestion, active aircraft selection, and event-driven HUD rendering dispatches.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.selected_drone_id: str = "drone_alpha"
        self._listeners: List[Callable[[HUDModel], None]] = []

        # Subscribe to StateStore
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def set_selected_drone(self, drone_id: str) -> None:
        self.selected_drone_id = drone_id
        self._on_state_updated(self.state_store.get_state())

    def subscribe(self, callback: Callable[[HUDModel], None]) -> Callable[[], None]:
        self._listeners.append(callback)
        # Immediate dispatch with current state
        callback(self.get_current_hud_model())

        def unsubscribe():
            if callback in self._listeners:
                self._listeners.remove(callback)

        return unsubscribe

    def get_current_hud_model(self) -> HUDModel:
        state = self.state_store.get_state()
        return HUDDataAdapter.adapt(state, selected_drone_id=self.selected_drone_id)

    def _on_state_updated(self, state: ApplicationState) -> None:
        model = HUDDataAdapter.adapt(state, selected_drone_id=self.selected_drone_id)
        for listener in self._listeners:
            try:
                listener(model)
            except Exception:
                pass


# Global singleton
hud_controller = HUDController()
