"""
Smart Horizon GCS — AI ETA Predictor Unit Tests
Subsystem: Test Suite (Phase 10)
"""

import pytest
from ai.eta_predictor import ETAPredictor


def test_eta_prediction_calculation():
    """Verify segment and mission completion ETA calculations."""
    pred = ETAPredictor.predict(
        drone_id="drone_alpha",
        current_speed_mps=10.0,
        dist_to_next_wp_m=500.0,
        dist_remaining_mission_m=2000.0,
        dist_to_home_m=800.0,
    )

    assert pred.eta_to_next_waypoint_sec == pytest.approx(50.0, rel=0.1)
    assert pred.eta_to_mission_end_sec == pytest.approx(200.0, rel=0.1)
    assert pred.eta_to_home_sec == pytest.approx(80.0, rel=0.1)
    assert pred.average_speed_mps == 10.0
