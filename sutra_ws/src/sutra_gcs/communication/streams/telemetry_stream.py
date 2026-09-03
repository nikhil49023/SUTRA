"""
Smart Horizon GCS — Telemetry Stream Ingestion & State Pipeline
Subsystem: Communication Streams (Phase 8)
"""

from typing import Any, Dict, Optional
from services.event_bus import EventBus, get_event_bus
from state.application_state import ApplicationState, StateStore, get_state_store


class TelemetryStream:
    """
    Decoupled stream consumer piping inbound network telemetry frames directly into
    TelemetryState, FleetState, and EventBus without UI coupling.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()

    def ingest_telemetry_dict(self, drone_id: str, telem: Dict[str, Any]) -> None:
        """
        Pushes telemetry dict into state store and publishes event.
        """
        from dataclasses import replace
        from state.fleet_state import DroneState
        lat = telem.get("lat", 0.0)
        lon = telem.get("lon", 0.0)
        alt = telem.get("alt", 0.0)
        spd = telem.get("ground_speed", 0.0)
        hdg = telem.get("heading", 0.0)
        bat = telem.get("battery", 100.0)

        def updater(s: ApplicationState) -> ApplicationState:
            fleet = s.fleet_state
            if drone_id not in fleet.drones:
                new_drone = DroneState(
                    drone_id=drone_id,
                    callsign=drone_id.upper(),
                    latitude=lat,
                    longitude=lon,
                    altitude=alt,
                    speed=spd,
                    heading=hdg,
                    battery=bat,
                    connection_status="CONNECTED",
                )
                return replace(s, fleet_state=fleet.add_drone(new_drone))
            else:
                return replace(
                    s,
                    fleet_state=fleet.update_drone(
                        drone_id,
                        latitude=lat,
                        longitude=lon,
                        altitude=alt,
                        speed=spd,
                        heading=hdg,
                        battery=bat,
                        connection_status="CONNECTED",
                    ),
                )

        self.state_store.update_state(updater)

        self.event_bus.emit(
            "telemetry.updated",
            payload={"drone_id": drone_id, "lat": lat, "lon": lon, "alt": alt},
            source="telemetry_stream",
        )


# Global singleton
telemetry_stream = TelemetryStream()
