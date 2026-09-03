"""
Smart Horizon GCS — Mission State Machine Unit Tests
Subsystem: Test Suite (Phase 5)
"""

import pytest
from engine.mission_state_machine import MissionStateMachine
from services.event_bus import EventBus
from state.application_state import StateStore
from state.mission_state import MissionStateEnum


def test_nominal_state_machine_flow():
    """Verify standard flight lifecycle sequence."""
    state_store = StateStore()
    event_bus = EventBus()
    fsm = MissionStateMachine(state_store, event_bus)

    # Initial state
    assert fsm.current_state == MissionStateEnum.IDLE

    # Valid sequence: IDLE -> PLANNING -> VALIDATING -> READY -> ARMING -> TAKEOFF -> MISSION -> LANDING -> COMPLETE
    assert fsm.transition_to(MissionStateEnum.PLANNING) is True
    assert fsm.current_state == MissionStateEnum.PLANNING

    assert fsm.transition_to(MissionStateEnum.VALIDATING) is True
    assert fsm.transition_to(MissionStateEnum.READY) is True
    assert fsm.transition_to(MissionStateEnum.ARMING) is True
    assert fsm.transition_to(MissionStateEnum.TAKEOFF) is True
    assert fsm.transition_to(MissionStateEnum.MISSION) is True
    assert fsm.transition_to(MissionStateEnum.LANDING) is True
    assert fsm.transition_to(MissionStateEnum.COMPLETE) is True
    assert fsm.current_state == MissionStateEnum.COMPLETE


def test_invalid_transitions_rejection():
    """Verify that illegal transitions are strictly rejected by the FSM."""
    state_store = StateStore()
    event_bus = EventBus()
    fsm = MissionStateMachine(state_store, event_bus)

    # Cannot jump straight from IDLE to MISSION without validation/arming
    assert fsm.transition_to(MissionStateEnum.MISSION) is False
    assert fsm.current_state == MissionStateEnum.IDLE

    # Cannot jump from IDLE to TAKEOFF
    assert fsm.transition_to(MissionStateEnum.TAKEOFF) is False
    assert fsm.current_state == MissionStateEnum.IDLE


def test_emergency_and_abort_transitions():
    """Verify emergency and abort can be entered from active flight states."""
    state_store = StateStore()
    event_bus = EventBus()
    fsm = MissionStateMachine(state_store, event_bus)

    # Move to MISSION
    fsm.transition_to(MissionStateEnum.PLANNING)
    fsm.transition_to(MissionStateEnum.VALIDATING)
    fsm.transition_to(MissionStateEnum.READY)
    fsm.transition_to(MissionStateEnum.ARMING)
    fsm.transition_to(MissionStateEnum.TAKEOFF)
    fsm.transition_to(MissionStateEnum.MISSION)

    # Trigger EMERGENCY
    assert fsm.transition_to(MissionStateEnum.EMERGENCY, "Airspace Breach") is True
    assert fsm.current_state == MissionStateEnum.EMERGENCY
