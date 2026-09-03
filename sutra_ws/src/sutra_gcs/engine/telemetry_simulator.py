"""
Smart Horizon GCS — Real-Time Avionics Telemetry Stream Synthesizer
Subsystem: Mission Engine (Phase 5)
"""

from dataclasses import replace
from typing import Optional

from services.event_bus import EventBus, get_event_bus
from state.application_state import ApplicationState, StateStore, get_state_store
from state.fleet_state import DroneState, FleetState
from state.telemetry_state import TelemetryState


class TelemetrySimulator:
    """
    Synthesizes and broadcasts high-frequency avionics state packets,
    synchronizing TelemetryState and FleetState directly into the StateStore.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()

    def update_telemetry(
        self,
        latitude: float,
        longitude: float,
        altitude: float,
        ground_speed: float,
        heading: float,
        vertical_speed: float,
        battery_percent: float,
        flight_mode: str = "AUTO",
        current_waypoint_index: int = 1,
        mission_progress: float = 0.0,
        gps_satellites: int = 14,
        rssi_pct: float = 96.0,
        drone_id: str = "drone_alpha",
    ) -> None:
        """
        Pushes flight dynamics packet to StateStore and emits event bus notification.
        """
        # 1. Update Centralized TelemetryState
        self.state_store.update_state(
            lambda s: replace(
                s,
                telemetry_state=replace(
                    s.telemetry_state,
                    latitude=latitude,
                    longitude=longitude,
                    altitude_agl=altitude,
                    ground_speed=ground_speed,
                    heading=heading,
                    vertical_speed=vertical_speed,
                    battery_percent=battery_percent,
                    flight_mode=flight_mode,
                    satellites=gps_satellites,
                    rssi=rssi_pct,
                ),
                fleet_state=self._update_fleet_drone(
                    s.fleet_state,
                    drone_id,
                    latitude,
                    longitude,
                    altitude,
                    ground_speed,
                    heading,
                    battery_percent,
                    flight_mode,
                ),
            )
        )

        # 2. Emit Telemetry Event
        self.event_bus.emit(
            "telemetry.updated",
            payload={
                "lat": latitude,
                "lon": longitude,
                "alt": altitude,
                "speed": ground_speed,
                "heading": heading,
                "battery": battery_percent,
                "mode": flight_mode,
                "wp": current_waypoint_index,
                "progress": mission_progress,
            },
            source="telemetry_simulator",
        )

    def _update_fleet_drone(
        self,
        fleet: FleetState,
        drone_id: str,
        lat: float,
        lon: float,
        alt: float,
        speed: float,
        heading: float,
        battery: float,
        mode: str,
    ) -> FleetState:
        drone = fleet.get_drone(drone_id)
        if drone:
            updated = replace(
                drone,
                latitude=lat,
                longitude=lon,
                altitude=alt,
                speed=speed,
                heading=heading,
                battery=battery,
                flight_mode=mode,
            )
            return fleet.update_drone(updated)
        else:
            new_drone = DroneState(
                drone_id=drone_id,
                callsign="ALPHA (LEADER)",
                is_leader=True,
                latitude=lat,
                longitude=lon,
                altitude=alt,
                speed=speed,
                heading=heading,
                battery=battery,
                flight_mode=mode,
            )
            return fleet.add_drone(new_drone)
