"""
Smart Horizon GCS — AI Battery Discharge & Reserve Predictor
Subsystem: AI Subsystem (Phase 10)
"""

import time
from collections import deque
from typing import Deque, Dict, Optional, Tuple

from .confidence import ConfidenceCalculator
from .models import BatteryPrediction


class BatteryPredictor:
    """
    Predicts battery consumption rate, remaining endurance, landing state-of-charge,
    and flags abnormal energy drain anomalies.
    """

    def __init__(self, history_window: int = 30) -> None:
        self.history_window = history_window
        # History map: drone_id -> deque of (timestamp, battery_pct)
        self._history: Dict[str, Deque[Tuple[float, float]]] = {}

    def record_sample(self, drone_id: str, battery_pct: float) -> None:
        if drone_id not in self._history:
            self._history[drone_id] = deque(maxlen=self.history_window)
        self._history[drone_id].append((time.time(), battery_pct))

    def predict(
        self,
        drone_id: str,
        current_battery: float,
        remaining_distance_m: float,
        rth_distance_m: float,
        ground_speed_mps: float = 10.0,
    ) -> BatteryPrediction:
        """
        Runs dynamic regression to predict battery at landing and RTH reserve.
        """
        self.record_sample(drone_id, current_battery)
        history = self._history[drone_id]

        # 1. Compute dynamic discharge rate (% / min)
        discharge_rate_pct_per_min = 2.5  # Baseline nominal quadrotor rate
        if len(history) >= 4:
            dt_sec = history[-1][0] - history[0][0]
            dbat = history[0][1] - history[-1][1]
            if dt_sec > 3.0 and dbat > 0.0:
                discharge_rate_pct_per_min = max(0.5, (dbat / dt_sec) * 60.0)

        # 2. Time required for mission completion and RTH
        eff_speed = max(2.0, ground_speed_mps)
        mission_time_min = (remaining_distance_m / eff_speed) / 60.0
        rth_time_min = (rth_distance_m / eff_speed) / 60.0

        # 3. Predicted consumption
        pred_mission_consumption = mission_time_min * discharge_rate_pct_per_min
        pred_rth_consumption = rth_time_min * discharge_rate_pct_per_min

        predicted_landing = max(0.0, current_battery - pred_mission_consumption)
        predicted_rth = max(0.0, current_battery - pred_rth_consumption)

        reserve_margin = predicted_landing - 15.0  # 15% standard safety buffer
        is_anomaly = discharge_rate_pct_per_min > 8.0  # >8%/min is abnormally high drain

        confidence = ConfidenceCalculator.calculate_confidence(
            data_age_sec=0.1,
            sample_count=len(history),
            sensor_healthy=True,
            variance=0.1 if not is_anomaly else 0.4,
        )

        return BatteryPrediction(
            drone_id=drone_id,
            current_battery_pct=round(current_battery, 1),
            predicted_landing_pct=round(predicted_landing, 1),
            predicted_rth_pct=round(predicted_rth, 1),
            discharge_rate_pct_per_min=round(discharge_rate_pct_per_min, 2),
            reserve_margin_pct=round(reserve_margin, 1),
            is_anomaly=is_anomaly,
            confidence=confidence,
        )


# Global singleton
battery_predictor = BatteryPredictor()
