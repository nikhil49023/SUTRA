"""
Unit & Integration Tests — Resource Pre-Positioning & Charging Optimizer
Subsystem: Tactical Fleet Optimization
"""

import pytest
from prepositioning.optimizer import PrepositioningOptimizer
from prepositioning.models import RecommendationStatus
from risk.engine import PredictiveRiskEngine


def test_prepositioning_optimizer_recommendation_flow():
    risk_engine = PredictiveRiskEngine()
    optimizer = PrepositioningOptimizer(risk_engine=risk_engine)

    recs = optimizer.evaluate_prepositioning()
    assert len(recs) >= 1

    rec = recs[0]
    assert rec.target_risk_score >= 50.0
    assert len(rec.recommended_drone_ids) >= 1
    assert "safe" in rec.staging_name.lower() or "staging" in rec.staging_name.lower()
    assert rec.safe_battery_margin_pct >= 25.0
    assert rec.status == RecommendationStatus.PENDING

    # Test Execution
    exec_res = optimizer.execute_recommendation(rec.recommendation_id, operator_id="commander_test")
    assert exec_res["success"] is True
    assert rec.status == RecommendationStatus.EXECUTED


def test_charging_station_status():
    optimizer = PrepositioningOptimizer()
    stations = optimizer.get_charging_stations()
    assert len(stations) >= 1

    station = stations[0]
    assert station.station_id == "STATION-01"
    assert station.total_bays >= 4
    assert station.available_bays >= 1
    assert station.battery_capacity_pct >= 80.0
