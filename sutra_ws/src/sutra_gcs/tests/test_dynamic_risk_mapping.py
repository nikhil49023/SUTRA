"""
Unit & Integration Tests — Dynamic Mapping & Observation Overrides
Subsystem: Closed-Loop Dynamic Map Synchronization
"""

import pytest
from risk.engine import PredictiveRiskEngine
from risk.dynamic_mapping_bridge import DynamicMappingBridge


def test_dynamic_observation_override():
    engine = PredictiveRiskEngine()
    bridge = DynamicMappingBridge(engine)

    grid_before = engine.get_current_grid()
    target_cell = grid_before.cells[12]
    initial_score = target_cell.risk_score
    initial_confidence = target_cell.confidence

    # Drone camera detects flooded road at cell coordinates
    updated = bridge.ingest_observation(
        latitude=target_cell.latitude,
        longitude=target_cell.longitude,
        observation_type="ROAD_FLOODED_ACTIVE",
    )
    assert updated is True

    grid_after = engine.get_current_grid()
    updated_cell = grid_after.get_cell(target_cell.cell_id)

    assert updated_cell.confirmed_flooded is True
    assert updated_cell.confidence >= 0.90
    assert updated_cell.risk_score >= initial_score


def test_survivor_observation_injection():
    engine = PredictiveRiskEngine()
    bridge = DynamicMappingBridge(engine)

    grid = engine.get_current_grid()
    target_cell = grid.cells[5]

    updated = bridge.ingest_observation(
        latitude=target_cell.latitude,
        longitude=target_cell.longitude,
        observation_type="SURVIVOR_DETECTED_ROOFTOP",
    )
    assert updated is True

    grid_after = engine.get_current_grid()
    cell_after = grid_after.get_cell(target_cell.cell_id)
    assert cell_after.survivor_count >= 1
