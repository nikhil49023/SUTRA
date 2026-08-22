"""
Smart Horizon GCS — Centralized Application State & Reactive State Store
Subsystem: State Management
"""

import copy
import logging
import threading
from dataclasses import dataclass, field, replace
from typing import Callable, List, Optional

from .alert_state import AlertState
from .fleet_state import FleetState
from .geofence_state import GeofenceState
from .map_state import MapState
from .mission_state import MissionState
from .telemetry_state import TelemetryState

logger = logging.getLogger("sutra_gcs.state_store")


@dataclass(frozen=True)
class ApplicationState:
    """
    Centralized Single-Source-of-Truth root state model for the Ground Control Station.
    """

    telemetry_state: TelemetryState = field(default_factory=TelemetryState)
    mission_state: MissionState = field(default_factory=MissionState)
    fleet_state: FleetState = field(default_factory=FleetState)
    map_state: MapState = field(default_factory=MapState)
    alert_state: AlertState = field(default_factory=AlertState)
    geofence_state: GeofenceState = field(default_factory=GeofenceState)

    application_status: str = "READY"
    backend_connected: bool = True
    websocket_connected: bool = False
    mavlink_connected: bool = False
    simulation_mode: bool = True
    current_user: str = "OFFGRID_LEAD"
    app_version: str = "1.0.0"


StateSubscriber = Callable[[ApplicationState], None]


class StateStore:
    """
    Thread-safe reactive store managing the ApplicationState singleton.
    Provides subscriptions and state mutation with change notification.
    """

    def __init__(self, initial_state: Optional[ApplicationState] = None) -> None:
        self._state: ApplicationState = initial_state or ApplicationState()
        self._subscribers: List[StateSubscriber] = []
        self._lock = threading.RLock()

    def get_state(self) -> ApplicationState:
        """Returns the current immutable ApplicationState snapshot."""
        with self._lock:
            return self._state

    def subscribe(self, callback: StateSubscriber) -> Callable[[], None]:
        """
        Subscribes a listener to receive state updates whenever the root state changes.
        Returns an unsubscribe function.
        """
        with self._lock:
            if callback not in self._subscribers:
                self._subscribers.append(callback)

        def _unsub() -> None:
            self.unsubscribe(callback)

        return _unsub

    def unsubscribe(self, callback: StateSubscriber) -> bool:
        """
        Unregisters a state listener.
        """
        with self._lock:
            if callback in self._subscribers:
                self._subscribers.remove(callback)
                return True
        return False

    def update_state(self, mutator: Callable[[ApplicationState], ApplicationState]) -> ApplicationState:
        """
        Applies a functional transformation to the root state and notifies subscribers
        if the new state is distinct from the previous state.
        """
        with self._lock:
            old_state = self._state
            new_state = mutator(old_state)

            if new_state == old_state:
                return self._state

            self._state = new_state
            subscribers_snapshot = list(self._subscribers)

        # Notify subscribers outside the lock to prevent re-entrant deadlocks
        for sub in subscribers_snapshot:
            try:
                sub(new_state)
            except Exception as e:
                logger.error(f"Error in StateStore subscriber '{sub}': {e}", exc_info=True)

        return new_state

    def set_state(self, new_state: ApplicationState) -> ApplicationState:
        """
        Directly sets a new root state and notifies subscribers if changed.
        """
        return self.update_state(lambda _: new_state)

    def clear_subscribers(self) -> None:
        """Clears all registered state subscribers."""
        with self._lock:
            self._subscribers.clear()


# Global StateStore singleton
_global_state_store: Optional[StateStore] = None


def get_state_store() -> StateStore:
    """Returns the central global StateStore instance."""
    global _global_state_store
    if _global_state_store is None:
        _global_state_store = StateStore()
    return _global_state_store


# Global StateStore singleton
state_store = get_state_store()
app_state = state_store.get_state()
