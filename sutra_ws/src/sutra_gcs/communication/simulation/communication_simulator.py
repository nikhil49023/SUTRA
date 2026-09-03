"""
Smart Horizon GCS — In-Memory Flight Communication & Telemetry Link Simulator
Subsystem: Communication Simulation (Phase 8)
"""

import time
from typing import Optional

from services.event_bus import EventBus, get_event_bus
from state.application_state import ApplicationState, StateStore, get_state_store


class CommunicationSimulator:
    """
    Emulates MAVLink and WebSocket network stream traffic for offline SITL flight simulation.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()

    def simulate_telemetry_burst(self, system_id: int = 1, lat: float = 37.7749, lon: float = -122.4194) -> None:
        """Publishes simulated MAVLink telemetry."""
        from communication.mavlink.mavlink_router import mavlink_router

        mavlink_router.route_message(
            system_id=system_id,
            msg_name="GLOBAL_POSITION_INT",
            payload={
                "lat": int(lat * 1e7),
                "lon": int(lon * 1e7),
                "alt": 30000,
                "relative_alt": 25000,
                "hdg": 4500,
                "vx": 500,
                "vy": 0,
                "vz": 0,
            },
        )


# Global singleton
communication_simulator = CommunicationSimulator()
