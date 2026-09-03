"""
Unit & Integration Tests — Explainable Predictive Disaster Risk Engine
Subsystem: Risk Engine & Temporal Projections (Phase 15 Testing)
"""

import pytest
from risk.models import FactorScore, GeospatialRiskGrid, RiskCategory, RiskGridCell
from risk.models_engine import RiskModelWeights, WeightedRiskModel
from risk.engine import PredictiveRiskEngine


def test_weighted_risk_model_calculation():
    weights = RiskModelWeights(
        rainfall=0.30,
        flood=0.30,
        terrain=0.10,
        population=0.15,
        infrastructure=0.05,
        wind=0.05,
        accessibility=0.05,
    )
    model = WeightedRiskModel(weights)

    # Moderate Risk Cell
    cell_mod = RiskGridCell(
        cell_id="Z_01_01",
        latitude=37.7749,
        longitude=-122.4194,
        bounds=(37.77, -122.42, 37.78, -122.41),
        forecast_rainfall_rate_mm_h=25.0,
        elevation_m=30.0,
        flood_susceptibility=0.3,
        population_exposure=0.4,
    )
    score_mod, cat_mod, factors_mod, exp_mod = model.evaluate_cell(cell_mod)
    assert 20.0 <= score_mod <= 60.0
    assert cat_mod in (RiskCategory.MODERATE, RiskCategory.HIGH)
    assert len(factors_mod) == 7
    assert "hazard" in exp_mod.lower()

    # Extreme Critical Flood Cell
    cell_crit = RiskGridCell(
        cell_id="Z_05_05",
        latitude=37.7749,
        longitude=-122.4194,
        bounds=(37.77, -122.42, 37.78, -122.41),
        forecast_rainfall_rate_mm_h=85.0,
        elevation_m=5.0,
        flood_susceptibility=0.95,
        population_exposure=0.9,
        confirmed_flooded=True,
    )
    score_crit, cat_crit, factors_crit, exp_crit = model.evaluate_cell(cell_crit)
    assert score_crit >= 80.0
    assert cat_crit == RiskCategory.CRITICAL
    assert any("drone camera" in f.description.lower() for f in factors_crit)


def test_geospatial_risk_grid_and_coordinate_lookup():
    engine = PredictiveRiskEngine(
        center_lat=37.774929,
        center_lon=-122.419416,
        rows=8,
        cols=8,
        resolution_m=50.0,
    )
    t_map = engine.evaluate_temporal_risk_map()
    assert "0h" in t_map.horizons
    assert "2h" in t_map.horizons
    assert "4h" in t_map.horizons

    grid_0h = t_map.horizons["0h"]
    assert len(grid_0h.cells) == 64

    # Lookup cell at center
    center_cell = grid_0h.get_cell_at_coords(37.774929, -122.419416)
    assert center_cell is not None
    assert center_cell.risk_score >= 0.0


def test_temporal_risk_escalation_and_alerts():
    engine = PredictiveRiskEngine()
    t_map = engine.evaluate_temporal_risk_map()
    alerts = engine.get_active_alerts()

    # Check that +2h projections show higher risk than 0h baseline
    grid_0 = t_map.horizons["0h"]
    grid_2 = t_map.horizons["2h"]

    avg_risk_0 = sum(c.risk_score for c in grid_0.cells) / len(grid_0.cells)
    avg_risk_2 = sum(c.risk_score for c in grid_2.cells) / len(grid_2.cells)

    assert avg_risk_2 >= avg_risk_0
