"""
Smart Horizon GCS — MAVLink Router & Dynamic Swarm Discovery Unit Tests
Subsystem: Test Suite (Phase 8)
"""

import time
import pytest
from communication.mavlink.mavlink_router import MAVLinkRouter
from communication.streams.command_stream import CommandStream, CommandStatus
from services.event_bus import EventBus
from state.application_state import StateStore


def test_dynamic_multi_drone_discovery():
    """Verify that incoming MAVLink packets from new system IDs auto-register drones in FleetState."""
    state_store = StateStore()
    event_bus = EventBus()
    router = MAVLinkRouter(state_store=state_store, event_bus=event_bus)

    # Route message from unknown drone (system_id=9)
    router.route_message(
        system_id=9,
        msg_name="GLOBAL_POSITION_INT",
        payload={"lat": 377750000, "lon": -1224190000, "relative_alt": 30000, "hdg": 0},
    )

    fleet = state_store.get_state().fleet_state
    drone = fleet.get_drone("drone_sys_9")
    assert drone is not None
    assert "SYS-9" in drone.callsign
    assert drone.connection_status == "CONNECTED"


def test_command_ack_correlation():
    """Verify correlating COMMAND_ACK back to originating flight command."""
    stream = CommandStream()
    corr_id = stream.dispatch_command(command_id=400, target_system=1)

    assert stream.get_status(corr_id) == CommandStatus.SENT

    # Receive positive ACK
    stream.handle_ack(command_id=400, result_code=0, target_system=1)
    assert stream.get_status(corr_id) == CommandStatus.ACKNOWLEDGED
