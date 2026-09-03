"""
Smart Horizon GCS — MAVLink Multi-Drone System ID Routing & Discovery Engine
Subsystem: MAVLink Subsystem (Phase 8)
"""

import logging
import time
from dataclasses import replace
from typing import Dict, Optional, Tuple

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.application_state import ApplicationState, StateStore, get_state_store
from state.fleet_state import DroneRole, DroneState, FleetState
from state.telemetry_state import TelemetryState

from .mavlink_parser import MAVLinkParser, mavlink_parser

logger = logging.getLogger("sutra_gcs.communication.mavlink_router")


class MAVLinkRouter:
    """
    Routes MAVLink messages to matching swarm aircraft, manages dynamic drone discovery,
    and updates TelemetryState and FleetState without direct UI coupling.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
        parser: Optional[MAVLinkParser] = None,
        drone_timeout_sec: float = 4.0,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.parser = parser or mavlink_parser
        self.drone_timeout_sec = drone_timeout_sec
        self.logger = get_logger("mavlink_router")

        # Mapping: system_id (int) -> drone_id (str)
        self._system_map: Dict[int, str] = {
            1: "drone_alpha",
            2: "drone_bravo",
            3: "drone_charlie",
            4: "drone_delta",
        }
        self._last_heartbeats: Dict[str, float] = {}

    def route_message(self, system_id: int, msg_name: str, payload: Dict) -> None:
        """
        Ingests parsed MAVLink payload, auto-discovers new UAVs, and updates state store.
        """
        drone_id = self._get_or_create_drone(system_id)
        parsed = self.parser.parse_frame(msg_name, payload)

        self._last_heartbeats[drone_id] = time.time()

        if msg_name == "HEARTBEAT":
            self._update_heartbeat_status(drone_id, parsed)
        elif msg_name in ("GLOBAL_POSITION_INT", "GLOBAL_POS_INT"):
            self._update_global_position(drone_id, parsed)
        elif msg_name == "ATTITUDE":
            self._update_attitude(drone_id, parsed)
        elif msg_name in ("SYS_STATUS", "BATTERY_STATUS"):
            self._update_battery(drone_id, parsed)

    def audit_timeouts(self) -> None:
        """Marks drones whose heartbeat pulse has expired as DISCONNECTED."""
        now = time.time()
        fleet = self.state_store.get_state().fleet_state
        for drone_id, last_t in list(self._last_heartbeats.items()):
            if now - last_t > self.drone_timeout_sec:
                drone = fleet.get_drone(drone_id)
                if drone and drone.connection_status != "DISCONNECTED":
                    self.state_store.update_state(
                        lambda s: replace(
                            s,
                            fleet_state=s.fleet_state.update_drone(
                                drone_id, connection_status="DISCONNECTED"
                            ),
                        )
                    )
                    self.logger.warning(f"Heartbeat timeout on {drone.callsign}: DISCONNECTED")

    def _get_or_create_drone(self, system_id: int) -> str:
        """Auto-discovers and registers aircraft if system_id is novel."""
        if system_id in self._system_map:
            return self._system_map[system_id]

        drone_id = f"drone_sys_{system_id}"
        self._system_map[system_id] = drone_id

        callsign = f"SYS-{system_id} (AUTODISCOVERED)"
        new_drone = DroneState(
            drone_id=drone_id,
            callsign=callsign,
            role="SCOUT",
            connection_status="CONNECTED",
        )

        self.state_store.update_state(
            lambda s: replace(s, fleet_state=s.fleet_state.add_drone(new_drone))
        )

        self.event_bus.emit(
            "fleet.drone_added",
            payload={"drone_id": drone_id, "system_id": system_id, "callsign": callsign},
            source="mavlink_router",
        )
        return drone_id

    def _update_heartbeat_status(self, drone_id: str, parsed: Dict) -> None:
        armed = parsed.get("armed", False)
        self.state_store.update_state(
            lambda s: replace(
                s,
                fleet_state=s.fleet_state.update_drone(
                    drone_id,
                    connection_status="CONNECTED",
                    flight_mode="ARMED" if armed else "STANDBY",
                ),
            )
        )

    def _update_global_position(self, drone_id: str, parsed: Dict) -> None:
        lat = parsed.get("lat", 0.0)
        lon = parsed.get("lon", 0.0)
        alt_agl = parsed.get("alt_agl", 0.0)
        heading = parsed.get("heading", 0.0)
        speed = parsed.get("ground_speed", 0.0)

        # Update FleetState
        self.state_store.update_state(
            lambda s: replace(
                s,
                fleet_state=s.fleet_state.update_drone(
                    drone_id,
                    latitude=lat,
                    longitude=lon,
                    altitude=alt_agl,
                    heading=heading,
                    speed=speed,
                    connection_status="CONNECTED",
                ),
                # If leader, synchronize TelemetryState
                telemetry_state=(
                    replace(
                        s.telemetry_state,
                        latitude=lat,
                        longitude=lon,
                        altitude_agl=alt_agl,
                        heading=heading,
                        ground_speed=speed,
                    )
                    if s.fleet_state.get_drone(drone_id) and s.fleet_state.get_drone(drone_id).is_leader
                    else s.telemetry_state
                ),
            )
        )

        self.event_bus.emit(
            "telemetry.updated",
            payload={"drone_id": drone_id, "lat": lat, "lon": lon, "alt": alt_agl},
            source="mavlink_router",
        )

    def _update_attitude(self, drone_id: str, parsed: Dict) -> None:
        pitch = parsed.get("pitch_deg", 0.0)
        roll = parsed.get("roll_deg", 0.0)
        self.state_store.update_state(
            lambda s: replace(
                s,
                fleet_state=s.fleet_state.update_drone(drone_id, pitch=pitch, roll=roll),
                telemetry_state=(
                    replace(s.telemetry_state, pitch=pitch, roll=roll)
                    if s.fleet_state.get_drone(drone_id) and s.fleet_state.get_drone(drone_id).is_leader
                    else s.telemetry_state
                ),
            )
        )

    def _update_battery(self, drone_id: str, parsed: Dict) -> None:
        bat = parsed.get("battery_pct", 100.0)
        self.state_store.update_state(
            lambda s: replace(
                s,
                fleet_state=s.fleet_state.update_drone(drone_id, battery=bat),
                telemetry_state=(
                    replace(s.telemetry_state, battery_level=bat)
                    if s.fleet_state.get_drone(drone_id) and s.fleet_state.get_drone(drone_id).is_leader
                    else s.telemetry_state
                ),
            )
        )


# Global singleton
mavlink_router = MAVLinkRouter()
