"""
Smart Horizon GCS — AI Subsystem Domain Models & Prediction Types
Subsystem: AI Subsystem (Phase 10)
"""

from typing import Dict, List, Optional
from state.ai_state import (
    AIAnalysisStatus,
    AIMode,
    AssistantMessage,
    BatteryPrediction,
    ETAPrediction,
    FailurePrediction,
    RecommendationItem,
    RecommendationSeverity,
    RouteRiskReport,
    ThreatItem,
    TrackedTarget,
)


class AIConfidenceLevel:
    VERY_LOW = "VERY_LOW"  # < 0.50
    LOW = "LOW"            # 0.50 - 0.70
    MEDIUM = "MEDIUM"      # 0.70 - 0.85
    HIGH = "HIGH"          # 0.85 - 0.95
    VERY_HIGH = "VERY_HIGH"# > 0.95


__all__ = [
    "AIMode",
    "AIAnalysisStatus",
    "RecommendationSeverity",
    "BatteryPrediction",
    "ETAPrediction",
    "RouteRiskReport",
    "FailurePrediction",
    "ThreatItem",
    "RecommendationItem",
    "TrackedTarget",
    "AssistantMessage",
    "AIConfidenceLevel",
]
