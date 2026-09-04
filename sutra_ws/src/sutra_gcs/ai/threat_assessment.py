"""
Smart Horizon GCS — Tactical Airspace Threat & Obstacle Assessment Engine
Subsystem: AI Subsystem (Phase 10)
"""

import time
from typing import List, Optional

from state.application_state import ApplicationState
from .confidence import ConfidenceCalculator
from .models import RecommendationSeverity, ThreatItem


class ThreatAssessmentEngine:
    """
    Synthesizes sensor detections, geofence breaches, and GIS topography into a prioritized threat matrix.
    """

    @classmethod
    def evaluate_threats(cls, state: ApplicationState) -> List[ThreatItem]:
        threats: List[ThreatItem] = []
        geofence = state.geofence_state
        alerts = getattr(state.alert_state, "alerts", [])

        # 1. Geofence Breaches
        for a in alerts:
            if "GEOFENCE" in a.title.upper() or "NO-FLY" in a.title.upper():
                threats.append(
                    ThreatItem(
                        label="NO-FLY GEOFENCE BREACH",
                        severity=RecommendationSeverity.EMERGENCY,
                        distance_m=0.0,
                        source="GEOFENCE_VALIDATOR",
                        confidence=0.99,
                    )
                )

        # 2. Weather hazards from GIS State
        gis = state.gis_state
        if gis.analysis_result and isinstance(gis.analysis_result, dict):
            wind = gis.analysis_result.get("wind_speed_mps", 0.0)
            if wind > 15.0:
                threats.append(
                    ThreatItem(
                        label=f"SEVERE WIND GUSTS ({wind:.1f} m/s)",
                        severity=RecommendationSeverity.HIGH,
                        distance_m=0.0,
                        source="GIS_WEATHER_STATION",
                        confidence=0.92,
                    )
                )

        return threats


# Global singleton
threat_assessment = ThreatAssessmentEngine()
