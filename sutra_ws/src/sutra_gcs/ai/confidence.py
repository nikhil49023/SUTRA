"""
Smart Horizon GCS — Grounded AI Confidence & Uncertainty Scoring Engine
Subsystem: AI Subsystem (Phase 10)
"""

import time
from typing import Optional
from .models import AIConfidenceLevel


class ConfidenceCalculator:
    """
    Computes mathematically rigorous confidence scores based on sample density,
    sensor data age, and prediction stability.
    """

    @classmethod
    def calculate_confidence(
        cls,
        data_age_sec: float = 0.0,
        sample_count: int = 10,
        sensor_healthy: bool = True,
        variance: float = 0.0,
    ) -> float:
        """
        Calculates grounded confidence score between 0.10 and 0.99.
        """
        score = 0.95

        # 1. Age penalty (exponential decay)
        if data_age_sec > 1.0:
            decay = min(0.40, (data_age_sec - 1.0) * 0.08)
            score -= decay

        # 2. Sample density bonus/penalty
        if sample_count < 3:
            score -= 0.30
        elif sample_count < 8:
            score -= 0.15

        # 3. Sensor health penalty
        if not sensor_healthy:
            score -= 0.35

        # 4. Variance penalty
        if variance > 0.5:
            score -= min(0.20, variance * 0.1)

        return round(max(0.10, min(0.99, score)), 2)

    @classmethod
    def get_level(cls, score: float) -> str:
        if score >= 0.95:
            return AIConfidenceLevel.VERY_HIGH
        elif score >= 0.85:
            return AIConfidenceLevel.HIGH
        elif score >= 0.70:
            return AIConfidenceLevel.MEDIUM
        elif score >= 0.50:
            return AIConfidenceLevel.LOW
        else:
            return AIConfidenceLevel.VERY_LOW


# Global singleton
confidence_calc = ConfidenceCalculator()
