"""
Smart Horizon GCS — AI Battery Discharge Predictor Unit Tests
Subsystem: Test Suite (Phase 10)
"""

import time
import pytest
from ai.battery_predictor import BatteryPredictor


def test_battery_prediction_nominal_mission():
    """Verify nominal linear regression battery prediction."""
    predictor = BatteryPredictor(history_window=10)
    # Simulate decreasing battery
    predictor.record_sample("drone_alpha", 90.0)
    time.sleep(0.05)
    predictor.record_sample("drone_alpha", 88.0)

    pred = predictor.predict(
        drone_id="drone_alpha",
        current_battery=88.0,
        remaining_distance_m=1000.0,
        rth_distance_m=400.0,
        ground_speed_mps=10.0,
    )

    assert pred.drone_id == "drone_alpha"
    assert pred.predicted_landing_pct < 88.0
    assert pred.predicted_rth_pct < 88.0
    assert pred.is_anomaly is False


def test_battery_prediction_anomaly_detection():
    """Verify abnormal discharge rate triggers is_anomaly flag."""
    predictor = BatteryPredictor(history_window=10)
    # Rapid discharge simulation
    t0 = time.time()
    predictor._history["drone_alpha"] = [
        (t0 - 10.0, 100.0),
        (t0 - 5.0, 80.0),
        (t0, 60.0),
        (t0 + 0.1, 55.0),
    ]

    pred = predictor.predict(
        drone_id="drone_alpha",
        current_battery=55.0,
        remaining_distance_m=2000.0,
        rth_distance_m=500.0,
        ground_speed_mps=10.0,
    )

    assert pred.discharge_rate_pct_per_min > 8.0
    assert pred.is_anomaly is True
