"""
Smart Horizon GCS — AI Mission Advisor Engine Unit Tests
Subsystem: Test Suite (Phase 10)
"""

import pytest
from ai.mission_advisor import MissionAdvisorEngine
from state.application_state import ApplicationState
from state.fleet_state import DroneState, FleetState
from state.telemetry_state import TelemetryState


def test_mission_advisor_battery_query():
    """Verify factual response to battery query."""
    state = ApplicationState(
        telemetry_state=TelemetryState(battery_percent=76.0, battery_voltage=24.5)
    )
    ans = MissionAdvisorEngine.answer_query("what is the battery status?", state)
    assert "76%" in ans.text
    assert ans.confidence is not None and ans.confidence > 0.80


def test_mission_advisor_fleet_lowest_battery():
    """Verify identification of aircraft with lowest battery."""
    fleet = FleetState()
    fleet = fleet.add_drone(DroneState(drone_id="drone_alpha", callsign="ALPHA-1", battery=85.0))
    fleet = fleet.add_drone(DroneState(drone_id="drone_bravo", callsign="BRAVO-2", battery=42.0))
    state = ApplicationState(fleet_state=fleet)

    ans = MissionAdvisorEngine.answer_query("which drone has the lowest battery?", state)
    assert "BRAVO-2" in ans.text
    assert "42%" in ans.text


def test_mission_advisor_backward_compatibility():
    """Verify legacy parse_command method compatibility."""
    res = MissionAdvisorEngine.parse_command("arm")
    assert res["action"] == "ARM"
    assert res["confidence"] > 0.90
