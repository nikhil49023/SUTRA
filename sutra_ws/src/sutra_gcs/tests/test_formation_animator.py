"""
Smart Horizon GCS — Formation Animator Unit Tests
Subsystem: Test Suite (Phase 6)
"""

import os
from dataclasses import replace
import pytest
from PySide6.QtWidgets import QApplication

from fleet.formation_animator import FormationAnimator
from services.event_bus import EventBus
from state.application_state import StateStore
from state.fleet_state import DroneState, FleetState


@pytest.fixture(scope="module")
def qapp():
    os.environ["QT_QPA_PLATFORM"] = "offscreen"
    app = QApplication.instance() or QApplication([])
    yield app


def test_formation_animator_smooth_interpolation(qapp):
    """Verify that follower drones interpolate toward target positions across animation ticks."""
    state_store = StateStore()
    event_bus = EventBus()
    animator = FormationAnimator(state_store, event_bus)

    # Leader at (37.7749, -122.4194), Follower Bravo at same origin but target is North by ~50m
    drones = {
        "drone_alpha": DroneState(
            drone_id="drone_alpha", callsign="ALPHA", is_leader=True,
            latitude=37.774900, longitude=-122.419400,
        ),
        "drone_bravo": DroneState(
            drone_id="drone_bravo", callsign="BRAVO", is_leader=False,
            latitude=37.774900, longitude=-122.419400,
            target_latitude=37.775500, target_longitude=-122.419400,
        ),
    }
    state_store.update_state(
        lambda s: replace(s, fleet_state=FleetState(drones=drones, leader_id="drone_alpha"))
    )

    initial_lat = state_store.get_state().fleet_state.get_drone("drone_bravo").latitude

    # Advance 10 animation ticks
    for _ in range(10):
        animator._on_animation_tick()

    new_lat = state_store.get_state().fleet_state.get_drone("drone_bravo").latitude

    # Follower has smoothly advanced toward target
    assert new_lat > initial_lat
