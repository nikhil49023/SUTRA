"""
Unit & Integration Tests — SUTRA Human Emergency Abort & Charger Contingency Management
"""

import pytest
from prepositioning.optimizer import PrepositioningOptimizer
from prepositioning.models import ChargingStationStatus


def test_emergency_abort_all_swarm_uavs():
    optimizer = PrepositioningOptimizer()
    res = optimizer.emergency_abort_all(reason="Test operator emergency abort", operator_id="commander_test")
    assert res["success"] is True
    abort_rec = res["abort_record"]
    assert abort_rec["action"] == "EMERGENCY_ABORT_ALL_SWARM_UAVS_AUTO_RTL"
    assert "LOCAL_ESCAPE_CORRIDOR" in abort_rec["failsafe_mode"]


def test_emergency_abort_individual_uav():
    optimizer = PrepositioningOptimizer()
    res = optimizer.emergency_abort_uav(drone_id="drone_alpha", reason="Motor thermal throttle", operator_id="commander_test")
    assert res["success"] is True
    abort_rec = res["abort_record"]
    assert abort_rec["drone_id"] == "drone_alpha"
    assert "AUTO_RTL" in abort_rec["action"]


def test_charger_unavailable_contingency_fallback():
    optimizer = PrepositioningOptimizer()
    station = optimizer.charging_stations["STATION-01"]
    # Simulate all 4 bays occupied
    station.occupied_bays = 4
    assert station.available_bays == 0

    # Execute charging divert when station is full
    res = optimizer.autonomous_charging_divert_and_swap(low_battery_drone_id="drone_delta", current_battery_pct=18.0)
    assert res["success"] is True
    assert res["contingency"] is True
    swap = res["swap_record"]
    assert "CHARGER_UNAVAILABLE" in swap["status"]
    assert "Diverted" in swap["contingency_action"]
