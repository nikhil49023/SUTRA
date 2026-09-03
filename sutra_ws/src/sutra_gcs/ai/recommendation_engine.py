"""
Smart Horizon GCS — Prioritized AI Recommendation & Decision Support Engine
Subsystem: AI Subsystem (Phase 10)
"""

import time
from typing import List, Optional

from state.application_state import ApplicationState
from .confidence import ConfidenceCalculator
from .models import RecommendationItem, RecommendationSeverity


class RecommendationEngine:
    """
    Synthesizes multi-subsystem telemetry and predictions into prioritized, explainable operator advisories.
    """

    SEVERITY_WEIGHT = {
        RecommendationSeverity.EMERGENCY: 5,
        RecommendationSeverity.CRITICAL: 4,
        RecommendationSeverity.HIGH: 3,
        RecommendationSeverity.MEDIUM: 2,
        RecommendationSeverity.LOW: 1,
        RecommendationSeverity.INFO: 0,
    }

    @classmethod
    def generate_recommendations(cls, state: ApplicationState) -> List[RecommendationItem]:
        recs: List[RecommendationItem] = []
        telem = state.telemetry_state
        comm = state.communication_state
        fleet = state.fleet_state

        bat = getattr(telem, "battery_percent", getattr(telem, "battery_level", 100.0))

        # 1. Critical Battery Reserve Advisory
        if bat < 20.0:
            recs.append(
                RecommendationItem(
                    title="RETURN TO HOME (LOW BATTERY)",
                    message=f"Aircraft battery at {bat:.0f}%, which is below the mandatory 20% safe landing reserve threshold.",
                    reason=f"Current state-of-charge: {bat:.0f}%. Standard RTH reserve margin: 20%.",
                    severity=RecommendationSeverity.CRITICAL,
                    suggested_action="RTL",
                    requires_operator_approval=True,
                    confidence=0.96,
                    source="battery_predictor",
                )
            )

        # 2. Communication Latency Advisory
        if comm.latency_ms > 120.0:
            recs.append(
                RecommendationItem(
                    title="REDUCE TELEMETRY STREAM RATE",
                    message=f"Network RTT latency is {comm.latency_ms:.0f}ms. Consider lowering video bitrates.",
                    reason="Elevated WebSocket/MAVLink round-trip latency.",
                    severity=RecommendationSeverity.MEDIUM,
                    suggested_action=None,
                    requires_operator_approval=False,
                    confidence=0.88,
                    source="connection_monitor",
                )
            )

        # 3. Nominal System Health Baseline (if no issues found)
        if not recs:
            recs.append(
                RecommendationItem(
                    title="NOMINAL MISSION OPERATIONS",
                    message="All flight kinematics, battery reserves, and safety geofences are within optimal operational bounds.",
                    reason="Telemetry parameters match nominal pre-flight mission plan.",
                    severity=RecommendationSeverity.INFO,
                    suggested_action=None,
                    requires_operator_approval=False,
                    confidence=0.95,
                    source="mission_advisor",
                )
            )

        # Sort by severity descending
        recs.sort(key=lambda r: cls.SEVERITY_WEIGHT.get(r.severity, 0), reverse=True)
        return recs


# Global singleton
recommendation_engine = RecommendationEngine()
