"""
Smart Horizon GCS — Multivariable Operational Flight Risk Assessment Engine
Subsystem: Mission Engine (Phase 5)
"""

from typing import List, Optional

from geofence.models import Geofence, ZoneType
from geofence.validator import GeofenceValidator
from mission.models import Mission
from mission.route_calculator import RouteCalculator
from .battery_estimator import BatteryEstimator
from .models import RiskFactor, RiskLevel, RiskReport


class RiskEngine:
    """
    Evaluates multi-factor operational flight risk scores [0.0 - 100.0]
    across airspace constraints, airframe energy, corridor geometry, and environmental limits.
    """

    @classmethod
    def evaluate_mission_risk(
        cls,
        mission: Mission,
        geofences: List[Geofence],
        battery_pct: float = 100.0,
        gps_satellites: int = 14,
        rssi_pct: float = 95.0,
    ) -> RiskReport:
        """
        Runs comprehensive multi-criteria risk scoring.
        """
        factors: List[RiskFactor] = []
        recommendations: List[str] = []

        wps = mission.waypoints
        if not wps:
            return RiskReport(
                risk_level=RiskLevel.LOW,
                risk_score=0.0,
                factors=[RiskFactor("MISSION", 0.0, 1.0, "Empty mission")],
                recommendations=["Add waypoints to plan flight corridor."],
            )

        # 1. Geofence & Airspace Restriction Risk (Weight: 35%)
        geo_res = GeofenceValidator.validate_mission_geofences(mission, geofences)
        if not geo_res.valid:
            geo_score = 100.0
            factors.append(RiskFactor("AIRSPACE", 100.0, 0.35, "Critical No-Fly Zone violation detected"))
            recommendations.append("Re-route waypoints outside restricted No-Fly airspace.")
        elif geo_res.warnings:
            geo_score = 45.0
            factors.append(RiskFactor("AIRSPACE", 45.0, 0.35, "Flight plan intersects advisory warning zones"))
            recommendations.append("Verify flight corridor altitude over warning zones.")
        else:
            geo_score = 5.0
            factors.append(RiskFactor("AIRSPACE", 5.0, 0.35, "Airspace clear of active restrictions"))

        # 2. Battery & Energy Depletion Risk (Weight: 30%)
        bat_analysis = BatteryEstimator.estimate_mission_energy(mission, battery_pct)
        if bat_analysis.status == "CRITICAL" or not bat_analysis.rth_safe:
            bat_score = 90.0
            factors.append(RiskFactor("BATTERY", 90.0, 0.30, f"Insufficient RTH reserve ({bat_analysis.battery_at_completion_pct:.1f}% remaining)"))
            recommendations.append("Shorten mission corridor or recharge flight battery.")
        elif bat_analysis.status == "WARNING":
            bat_score = 40.0
            factors.append(RiskFactor("BATTERY", 40.0, 0.30, f"Low completion reserve ({bat_analysis.battery_at_completion_pct:.1f}%)"))
            recommendations.append("Monitor battery telemetry closely during flight.")
        else:
            bat_score = 10.0
            factors.append(RiskFactor("BATTERY", 10.0, 0.30, f"Nominal energy reserve ({bat_analysis.battery_at_completion_pct:.1f}%)"))

        # 3. Path Distance & Complexity Risk (Weight: 20%)
        total_dist_m = RouteCalculator.calculate_total_distance(wps, mission.home_latitude, mission.home_longitude)
        if total_dist_m > 15000.0:
            dist_score = 80.0
            factors.append(RiskFactor("GEOMETRY", 80.0, 0.20, f"Long corridor range: {total_dist_m/1000:.1f} km"))
            recommendations.append("Consider multi-hop relay or intermediate staging points.")
        elif total_dist_m > 5000.0:
            dist_score = 35.0
            factors.append(RiskFactor("GEOMETRY", 35.0, 0.20, f"Moderate path distance: {total_dist_m/1000:.1f} km"))
        else:
            dist_score = 10.0
            factors.append(RiskFactor("GEOMETRY", 10.0, 0.20, f"Short tactical corridor: {total_dist_m:.0f} m"))

        # 4. Telemetry & Navigation Link Quality Risk (Weight: 15%)
        comm_score = 0.0
        if gps_satellites < 8:
            comm_score += 50.0
            recommendations.append("Wait for 3D GPS satellite constellation lock (>=10 satellites).")
        if rssi_pct < 50.0:
            comm_score += 40.0
            recommendations.append("Verify directional ground station telemetry antenna alignment.")
        factors.append(RiskFactor("TELEMETRY", min(100.0, comm_score), 0.15, f"GPS Satellites: {gps_satellites}, Link Quality: {rssi_pct:.0f}%"))

        # Aggregate Weighted Risk Score
        total_score = sum(f.score * f.weight for f in factors)

        if total_score >= 70.0 or not geo_res.valid:
            level = RiskLevel.CRITICAL
        elif total_score >= 45.0:
            level = RiskLevel.HIGH
        elif total_score >= 25.0:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW

        return RiskReport(
            risk_level=level,
            risk_score=round(total_score, 1),
            factors=factors,
            recommendations=recommendations or ["All systems nominal. Pre-flight checks clear."],
        )
