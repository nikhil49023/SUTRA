"""
Smart Horizon GCS — HUD Data Adapter & State Normalization Unit Tests
Subsystem: Test Suite (Phase 9)
"""

import time
import pytest
from dataclasses import replace
from hud.hud_data_adapter import HUDDataAdapter
from hud.models import GeofenceHUDStatus, GPSFixType
from state.application_state import ApplicationState
from state.fleet_state import DroneState, FleetState
from state.telemetry_state import TelemetryState


def test_hud_data_adapter_state_mapping():
    """Verify conversion of application state into strongly-typed HUDModel."""
    state = ApplicationState(
        telemetry_state=TelemetryState(
            latitude=37.7750,
            longitude=-122.4190,
            altitude_agl=30.0,
            ground_speed=14.2,
            heading=180.0,
            pitch=3.5,
            roll=-12.0,
            battery_percent=88.0,
            satellites=20,
            gps_fix=3,
        )
    )

    model = HUDDataAdapter.adapt(state, selected_drone_id="drone_alpha")
    assert model.heading == 180.0
    assert model.pitch == 3.5
    assert model.roll == -12.0
    assert model.gps_fix == GPSFixType.FIX_3D
    assert model.satellites == 20
    assert model.geofence_status == GeofenceHUDStatus.CLEAR


def test_hud_data_adapter_staleness_and_lost():
    """Verify staleness detection when data age exceeds configured threshold."""
    # Data updated 10 seconds ago
    old_time = time.time() - 10.0
    state = ApplicationState(
        telemetry_state=TelemetryState(timestamp=old_time),
        communication_state=replace(ApplicationState().communication_state, connection_mode="WEBSOCKET"),
    )

    model = HUDDataAdapter.adapt(state, stale_threshold_sec=2.0, lost_threshold_sec=5.0)
    assert model.is_stale is True
    assert model.is_link_lost is True
