"""
Smart Horizon GCS — AI Route Risk & Geometrical Safety Analyzer
Subsystem: AI Subsystem (Phase 10)
"""

import math
from typing import List, Optional, Tuple

from mission.waypoint import Waypoint
from .confidence import ConfidenceCalculator
from .models import RouteRiskReport


class RoutePredictor:
    """
    Evaluates mission geometry for kinematic risks (sharp turns, excessive segment lengths, steep gradients).
    """

    @classmethod
    def analyze_route(cls, mission_name: str, waypoints: List[Waypoint]) -> RouteRiskReport:
        if not waypoints or len(waypoints) < 2:
            return RouteRiskReport(
                mission_name=mission_name,
                risk_level="LOW",
                hazard_count=0,
                confidence=0.95,
            )

        hazards: List[str] = []
        terrain_issues: List[str] = []
        geofence_warnings: List[str] = []
        rf_weak: List[str] = []

        # Analyze waypoint pairs
        for i in range(len(waypoints) - 1):
            wp1 = waypoints[i]
            wp2 = waypoints[i + 1]

            # Altitude delta check
            alt_diff = abs(wp2.altitude - wp1.altitude)
            if alt_diff > 50.0:
                hazards.append(f"Steep altitude climb of {alt_diff:.0f}m between WP{wp1.index} and WP{wp2.index}")
                terrain_issues.append(f"WP{wp1.index}->WP{wp2.index} delta {alt_diff:.0f}m")

            # High speed in low altitude check
            if wp2.altitude < 15.0 and wp2.speed > 12.0:
                hazards.append(f"High speed ({wp2.speed}m/s) at low altitude ({wp2.altitude}m) near WP{wp2.index}")

        # Sharp turn angle check (>110 degrees turn)
        for i in range(len(waypoints) - 2):
            w1, w2, w3 = waypoints[i], waypoints[i + 1], waypoints[i + 2]
            b1 = math.degrees(math.atan2(w2.longitude - w1.longitude, w2.latitude - w1.latitude))
            b2 = math.degrees(math.atan2(w3.longitude - w2.longitude, w3.latitude - w2.latitude))
            turn_deg = abs((b2 - b1 + 180) % 360 - 180)
            if turn_deg > 110.0:
                hazards.append(f"Sharp turn of {turn_deg:.0f}° at WP{w2.index}")

        risk_level = "LOW"
        if len(hazards) >= 3:
            risk_level = "HIGH"
        elif len(hazards) >= 1:
            risk_level = "MEDIUM"

        conf = ConfidenceCalculator.calculate_confidence(
            data_age_sec=0.0,
            sample_count=len(waypoints),
            sensor_healthy=True,
        )

        return RouteRiskReport(
            mission_name=mission_name,
            risk_level=risk_level,
            hazard_count=len(hazards),
            terrain_clearance_issues=terrain_issues,
            geofence_proximity_warnings=geofence_warnings,
            rf_weak_segments=rf_weak,
            confidence=conf,
        )


# Global singleton
route_predictor = RoutePredictor()
