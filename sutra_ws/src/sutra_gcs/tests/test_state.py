"""
Smart Horizon GCS — State Store & Subsystem State Unit Tests
Subsystem: Test Suite (Phase 1)
"""

from dataclasses import replace
import pytest

from state.alert_state import Alert, AlertSeverity, AlertState
from state.application_state import ApplicationState, StateStore
from state.fleet_state import DroneState, FleetState
from state.map_state import MapState
from state.mission_state import MissionState, MissionStateEnum, Waypoint
from state.telemetry_state import TelemetryState


def test_initial_state():
    """Verify default initialization of the centralized StateStore."""
    store = StateStore()
    state = store.get_state()

    assert state.application_status == "READY"
    assert state.current_user == "OFFGRID_LEAD"
    assert state.telemetry_state.drone_id == "drone_alpha"
    assert state.mission_state.state == MissionStateEnum.IDLE
    assert len(state.fleet_state.drones) == 0
    assert len(state.alert_state.alerts) == 0


def test_state_update_and_notification():
    """Verify that update_state applies changes and notifies subscribers with the new snapshot."""
    store = StateStore()
    notified_states = []

    unsub = store.subscribe(lambda s: notified_states.append(s))

    store.update_state(lambda s: replace(s, application_status="ARMED", simulation_mode=False))

    assert len(notified_states) == 1
    assert notified_states[0].application_status == "ARMED"
    assert notified_states[0].simulation_mode is False

    # Unsubscribe test
    unsub()
    store.update_state(lambda s: replace(s, application_status="FLIGHT"))
    assert len(notified_states) == 1  # No additional notification after unsubscribe


def test_fleet_state_management():
    """Verify adding, updating, removing, and designating swarm leaders in FleetState."""
    fleet = FleetState()
    drone_a = DroneState(drone_id="drone_alpha", callsign="ALPHA (LEADER)", is_leader=True)
    drone_b = DroneState(drone_id="drone_bravo", callsign="BRAVO (WING)", altitude=20.0)

    # 1. Add drones
    fleet = fleet.add_drone(drone_a).add_drone(drone_b)
    assert len(fleet.drones) == 2
    assert fleet.get_leader().drone_id == "drone_alpha"

    # 2. Update drone telemetry
    fleet = fleet.update_drone("drone_bravo", altitude=35.5, speed=12.0)
    assert fleet.get_drone("drone_bravo").altitude == 35.5
    assert fleet.get_drone("drone_bravo").speed == 12.0

    # 3. Promote Bravo to leader
    fleet = fleet.set_leader("drone_bravo")
    assert fleet.get_leader().drone_id == "drone_bravo"
    assert fleet.get_drone("drone_alpha").is_leader is False
    assert fleet.get_drone("drone_bravo").is_leader is True

    # 4. Remove drone
    fleet = fleet.remove_drone("drone_alpha")
    assert len(fleet.drones) == 1
    assert fleet.get_drone("drone_alpha") is None


def test_alert_state_management():
    """Verify adding, acknowledging, removing, and clearing alerts."""
    alerts = AlertState()
    alert1 = Alert(alert_id="a1", severity=AlertSeverity.CRITICAL, title="Low Battery", message="Below 20%")
    alert2 = Alert(alert_id="a2", severity=AlertSeverity.WARNING, title="High Wind", message="Gusts 12 m/s")

    alerts = alerts.add_alert(alert1).add_alert(alert2)
    assert len(alerts.alerts) == 2
    assert len(alerts.get_unacknowledged()) == 2

    # Acknowledge alert 1
    alerts = alerts.acknowledge_alert("a1")
    assert len(alerts.get_unacknowledged()) == 1
    assert alerts.alerts[1].acknowledged is True  # a1 was added first, so pushed to index 1

    # Remove alert 2
    alerts = alerts.remove_alert("a2")
    assert len(alerts.alerts) == 1

    # Clear alerts
    alerts = alerts.clear_alerts()
    assert len(alerts.alerts) == 0


def test_telemetry_state_defaults():
    """Verify type safety and defaults of TelemetryState."""
    telem = TelemetryState(latitude=37.774929, longitude=-122.419416, altitude_agl=15.0)
    assert telem.is_valid() is True
    assert telem.battery_percent == 100.0
    assert telem.flight_mode == "MANUAL"
    assert telem.temperature == 25.0


def test_mission_state_transitions():
    """Verify MissionState enum lifecycle values."""
    wps = [
        Waypoint(index=1, latitude=37.775, longitude=-122.419, altitude_agl=20.0),
        Waypoint(index=2, latitude=37.776, longitude=-122.418, altitude_agl=25.0),
    ]
    mission = MissionState(
        mission_id="m-100",
        mission_name="Search Corridor Alpha",
        state=MissionStateEnum.PLANNING,
        waypoints=wps,
    )
    assert mission.state == MissionStateEnum.PLANNING
    assert len(mission.waypoints) == 2

    # Transition to TAKEOFF
    mission = replace(mission, state=MissionStateEnum.TAKEOFF)
    assert mission.state == MissionStateEnum.TAKEOFF
