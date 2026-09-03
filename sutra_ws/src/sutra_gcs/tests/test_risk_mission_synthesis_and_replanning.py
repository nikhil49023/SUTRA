"""
Unit & Integration Tests — SUTRA 10-Variable Risk Engine, Mission Synthesis,
Dynamic Replanning & Autonomous Charging Bay Energy Management
"""

import pytest
from risk.engine import PredictiveRiskEngine
from risk.models import RiskCategory
from prepositioning.optimizer import PrepositioningOptimizer
from prepositioning.models import SynthesisPlanStatus, ChargingStationStatus
from forecast.forecast_service import ForecastService


def test_10_variable_risk_engine_evaluation():
    engine = PredictiveRiskEngine()
    t_map = engine.evaluate_temporal_risk_map()
    assert "0h" in t_map.horizons
    assert "2h" in t_map.horizons

    grid_0 = t_map.horizons["0h"]
    assert len(grid_0.cells) == 100

    cell_sample = grid_0.cells[0]
    # Verify all 10 variables are evaluated
    factor_names = [f.name for f in cell_sample.factors]
    expected_10 = [
        "RAINFALL",
        "FLOOD",
        "TERRAIN",
        "BUILDING",
        "WIND",
        "COMMS",
        "ENERGY",
        "AIRSPACE",
        "POPULATION",
        "ACCESSIBILITY",
    ]
    for exp in expected_10:
        assert exp in factor_names

    # Check weights sum to 1.0
    weight_sum = sum(f.weight for f in cell_sample.factors)
    assert abs(weight_sum - 1.0) < 0.01


def test_risk_to_mission_synthesis_pipeline():
    optimizer = PrepositioningOptimizer()
    plan = optimizer.synthesize_mission_from_risk(
        alert_id="IMD-NDRF-2026-BLR-01",
        place_name="Bellandur / Varthur Basin, Bengaluru",
        district="Bengaluru Urban",
        state="Karnataka",
    )

    assert plan.plan_id.startswith("plan_")
    assert plan.risk_score > 0.0
    assert plan.search_area_km2 > 0.0
    assert plan.num_drones_required >= 2
    assert len(plan.assigned_drone_ids) == plan.num_drones_required
    assert plan.battery_required_pct > 0.0
    assert plan.safe_battery_margin_pct >= 25.0
    assert len(plan.mission_waypoints) == 5
    assert plan.status == SynthesisPlanStatus.SYNTHESIZED


def test_dynamic_mission_replanning_on_hazard_detection():
    optimizer = PrepositioningOptimizer()
    # Synthesize initial plan
    plan = optimizer.synthesize_mission_from_risk(alert_id="TEST-ALERT-01")
    assert plan.status == SynthesisPlanStatus.SYNTHESIZED

    # Simulate Drone 03 detecting a collapsed structure blockage in cell Z_04_04
    replan_res = optimizer.trigger_dynamic_replanning(
        detected_hazard_cell_id="Z_04_04",
        hazard_type="COLLAPSED_STRUCTURE_BLOCKAGE",
        reporting_drone_id="drone_charlie",
    )

    assert replan_res["success"] is True
    assert replan_res["hazard_cell_id"] == "Z_04_04"
    assert plan.status == SynthesisPlanStatus.REPLANNED
    assert len(plan.replanning_history) >= 1
    assert plan.replanning_history[-1]["min_orca_clearance_m"] == 3.8


def test_autonomous_charging_divert_and_swap():
    optimizer = PrepositioningOptimizer()
    res = optimizer.autonomous_charging_divert_and_swap(
        low_battery_drone_id="drone_bravo",
        current_battery_pct=21.5,
    )

    assert res["success"] is True
    swap = res["swap_record"]
    assert swap["diverted_drone_id"] == "drone_bravo"
    assert swap["charging_station_id"] == "STATION-01"
    assert "reserve_dispatched_drone_id" in swap
    assert swap["status"] == "CHARGING_BAY_RESERVED_AND_STANDBY_DISPATCHED"


def test_offline_disaster_mesh_mode_toggle():
    forecast_svc = ForecastService()
    forecast_svc.set_offline_disaster_mode(True)
    horizon = forecast_svc.get_forecast_horizon()
    assert horizon.offline_mesh_mode is True
