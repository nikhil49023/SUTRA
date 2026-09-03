"""
Smart Horizon GCS — AI Mission Progress & Waypoint ETA Predictor
Subsystem: AI Subsystem (Phase 10)
"""

import time
from typing import Optional
from .confidence import ConfidenceCalculator
from .models import ETAPrediction


class ETAPredictor:
    """
    Predicts accurate time-to-target arrivals taking speed adjustments and remaining segments into account.
    """

    @classmethod
    def predict(
        cls,
        drone_id: str,
        current_speed_mps: float,
        dist_to_next_wp_m: float,
        dist_remaining_mission_m: float,
        dist_to_home_m: float,
        nominal_speed_mps: float = 10.0,
    ) -> ETAPrediction:
        eff_speed = current_speed_mps if current_speed_mps > 1.0 else nominal_speed_mps
        eff_speed = max(1.0, eff_speed)

        eta_next_sec = dist_to_next_wp_m / eff_speed
        eta_mission_sec = dist_remaining_mission_m / eff_speed
        eta_home_sec = dist_to_home_m / eff_speed

        conf = ConfidenceCalculator.calculate_confidence(
            data_age_sec=0.1,
            sample_count=10,
            sensor_healthy=True,
            variance=0.1,
        )

        return ETAPrediction(
            drone_id=drone_id,
            eta_to_next_waypoint_sec=round(eta_next_sec, 1),
            eta_to_mission_end_sec=round(eta_mission_sec, 1),
            eta_to_home_sec=round(eta_home_sec, 1),
            estimated_distance_remaining_m=round(dist_remaining_mission_m, 1),
            average_speed_mps=round(eff_speed, 1),
            confidence=conf,
        )


# Global singleton
eta_predictor = ETAPredictor()
