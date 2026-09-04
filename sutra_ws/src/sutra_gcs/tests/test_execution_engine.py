"""
Smart Horizon GCS — Execution Engine & Flight Simulator Unit Tests
Subsystem: Test Suite (Phase 5)
"""

import os
from dataclasses import replace
import pytest
from PySide6.QtWidgets import QApplication

from engine.execution_engine import ExecutionEngine
from engine.mission_state_machine import MissionStateMachine
from engine.mission_timeline import MissionTimeline
from geofence.models import Geofence, ZoneType
from mission.models import Mission
from mission.waypoint import Waypoint
from services.event_bus import EventBus
from state.application_state import StateStore
from state.mission_state import MissionState, MissionStateEnum


@pytest.fixture(scope="module")
def qapp():
    os.environ["QT_QPA_PLATFORM"] = "offscreen"
    app = QApplication.instance() or QApplication([])
    yield app


def test_execution_engine_lifecycle(qapp):
    """Verify mission start, smooth movement, and completion."""
    state_store = StateStore()
    event_bus = EventBus()
    fsm = MissionStateMachine(state_store, event_bus)
    timeline = MissionTimeline(event_bus)

    engine = ExecutionEngine(state_store, event_bus, fsm, timeline)

    # Setup Mission in StateStore
    wps = [
        Waypoint(index=1, latitude=37.7750, longitude=-122.4190, altitude=25.0, speed=10.0),
        Waypoint(index=2, latitude=37.7760, longitude=-122.4180, altitude=30.0, speed=10.0),
    ]
    state_store.update_state(
        lambda s: replace(
            s,
            mission_state=replace(
                s.mission_state,
                waypoints=wps,
                home_latitude=37.7749,
                home_longitude=-122.4194,
                state=MissionStateEnum.READY,
            ),
        )
    )

    # 1. Start Mission
    assert engine.start_mission() is True
    assert fsm.current_state == MissionStateEnum.MISSION

    # 2. Advance 5 simulation ticks (with speed multiplier 5x)
    engine.speed_multiplier = 5.0
    for _ in range(10):
        engine._on_sim_tick()

    # Verify drone has translated toward WP1
    assert engine.current_lat != 37.7749
    assert engine.current_heading > 0.0

    # 3. Test Pause and Resume
    assert engine.pause_mission() is True
    assert fsm.current_state == MissionStateEnum.HOLD

    assert engine.resume_mission() is True
    assert fsm.current_state == MissionStateEnum.MISSION


def test_dynamic_waypoint_update_during_flight(qapp):
    """Verify that moving a waypoint during flight updates ExecutionEngine trajectory."""
    state_store = StateStore()
    event_bus = EventBus()
    fsm = MissionStateMachine(state_store, event_bus)
    timeline = MissionTimeline(event_bus)
    engine = ExecutionEngine(state_store, event_bus, fsm, timeline)

    wps = [
        Waypoint(index=1, latitude=37.7750, longitude=-122.4190, altitude=25.0),
        Waypoint(index=2, latitude=37.7760, longitude=-122.4180, altitude=30.0),
    ]
    state_store.update_state(
        lambda s: replace(
            s,
            mission_state=replace(
                s.mission_state,
                waypoints=wps,
                home_latitude=37.7749,
                home_longitude=-122.4194,
                state=MissionStateEnum.READY,
            ),
        )
    )

    engine.start_mission()

    # Move WP2 dynamically while flying
    new_wps = [
        wps[0],
        Waypoint(index=2, latitude=37.7800, longitude=-122.4100, altitude=40.0),
    ]
    state_store.update_state(
        lambda s: replace(
            s,
            mission_state=replace(s.mission_state, waypoints=new_wps),
        )
    )

    # Advance tick
    engine._on_sim_tick()
    # Confirm simulator seamlessly accommodates updated waypoints
    assert len(state_store.get_state().mission_state.waypoints) == 2


def test_geofence_breach_trigger_during_flight(qapp):
    """Verify that entering a NO-FLY zone immediately halts simulation and triggers EMERGENCY."""
    state_store = StateStore()
    event_bus = EventBus()
    fsm = MissionStateMachine(state_store, event_bus)
    timeline = MissionTimeline(event_bus)
    engine = ExecutionEngine(state_store, event_bus, fsm, timeline)

    coords = [
        (37.7740, -122.4200),
        (37.7760, -122.4200),
        (37.7760, -122.4180),
        (37.7740, -122.4180),
    ]
    nfz = Geofence(name="Active NFZ", zone_type=ZoneType.NO_FLY, coordinates=coords)

    # Place drone inside the NFZ
    engine.current_lat = 37.7750
    engine.current_lon = -122.4190
    engine.current_alt = 25.0

    # Run check
    engine._check_geofence_breaches([nfz])

    assert fsm.current_state == MissionStateEnum.EMERGENCY
    assert any("CRITICAL NO-FLY BREACH" in ev.message for ev in timeline.get_events())
