"""
Smart Horizon GCS — Formation Engine Unit Tests
Subsystem: Test Suite (Phase 6)
"""

from dataclasses import replace
import pytest
from fleet.formation_engine import FormationEngine
from services.event_bus import EventBus
from state.application_state import StateStore
from state.fleet_state import DroneState, FleetState


def test_formation_engine_apply_and_sync():
    """Verify applying formations recalculates and synchronizes targets to StateStore."""
    state_store = StateStore()
    event_bus = EventBus()
    fe = FormationEngine(state_store, event_bus)

    # Seed 3 drones in state store
    drones = {
        "drone_alpha": DroneState(drone_id="drone_alpha", callsign="ALPHA", is_leader=True, latitude=37.7749, longitude=-122.4194),
        "drone_bravo": DroneState(drone_id="drone_bravo", callsign="BRAVO", is_leader=False, latitude=37.7749, longitude=-122.4194),
        "drone_charlie": DroneState(drone_id="drone_charlie", callsign="CHARLIE", is_leader=False, latitude=37.7749, longitude=-122.4194),
    }
    state_store.update_state(
        lambda s: replace(s, fleet_state=FleetState(drones=drones, leader_id="drone_alpha"))
    )

    # 1. Apply DIAMOND formation
    assert fe.apply_formation("DIAMOND", 30.0) is True

    fleet = state_store.get_state().fleet_state
    assert fleet.formation == "DIAMOND"
    assert fleet.spacing == 30.0

    bravo = fleet.get_drone("drone_bravo")
    assert bravo.target_latitude is not None
    assert bravo.target_longitude is not None
    assert bravo.offset_x != 0.0 or bravo.offset_y != 0.0

    # 2. Change Spacing to 50m
    fe.change_spacing(50.0)
    fleet_50 = state_store.get_state().fleet_state
    assert fleet_50.spacing == 50.0
