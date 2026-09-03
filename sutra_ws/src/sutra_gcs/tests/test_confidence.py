"""
Smart Horizon GCS — AI Confidence Calculator Unit Tests
Subsystem: Test Suite (Phase 10)
"""

import pytest
from ai.confidence import ConfidenceCalculator
from ai.models import AIConfidenceLevel


def test_confidence_decay_with_age():
    """Verify confidence decreases when data freshness degrades."""
    fresh_conf = ConfidenceCalculator.calculate_confidence(data_age_sec=0.1, sample_count=10)
    stale_conf = ConfidenceCalculator.calculate_confidence(data_age_sec=5.0, sample_count=10)
    assert fresh_conf > stale_conf
    assert ConfidenceCalculator.get_level(fresh_conf) in (AIConfidenceLevel.HIGH, AIConfidenceLevel.VERY_HIGH)


def test_confidence_sensor_penalty():
    """Verify confidence drops significantly if sensor is unhealthy."""
    healthy_conf = ConfidenceCalculator.calculate_confidence(sensor_healthy=True)
    unhealthy_conf = ConfidenceCalculator.calculate_confidence(sensor_healthy=False)
    assert healthy_conf > unhealthy_conf
    assert unhealthy_conf < 0.70
