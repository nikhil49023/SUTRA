"""
Smart Horizon GCS — Fleet Manager & Swarm Registry Unit Tests
Subsystem: Test Suite (Phase 6)
"""

import pytest
from fleet.fleet_manager import FleetManager
from fleet.formation_engine import FormationEngine
from services.event_bus import EventBus
from state.application_state import StateStore


def test_fleet_manager_registration_and_removal():
    """Verify registering, retrieving, and removing swarm aircraft."""
    state_store = StateStore()
    event_bus = EventBus()
    form_engine = FormationEngine(state_store, event_bus)
    fm = FleetManager(state_store, event_bus, form_engine)

    # Initially has 4 default seeded drones
    assert len(fm.get_all_drones()) == 4
    leader = fm.get_leader()
    assert leader is not None
    assert leader.drone_id == "drone_alpha"
    assert leader.is_leader is True

    # 1. Register new drone Echo
    echo = fm.register_drone(
        drone_id="drone_echo",
        callsign="ECHO (RELAY)",
        role="SUPPORT",
    )
    assert len(fm.get_all_drones()) == 5
    assert fm.get_drone("drone_echo").callsign == "ECHO (RELAY)"

    # 2. Promote Bravo to Leader
    assert fm.set_leader("drone_bravo") is True
    assert fm.get_leader().drone_id == "drone_bravo"
    assert fm.get_drone("drone_alpha").is_leader is False

    # 3. Remove Echo
    assert fm.remove_drone("drone_echo") is True
    assert len(fm.get_all_drones()) == 4
    assert fm.get_drone("drone_echo") is None
