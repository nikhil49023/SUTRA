"""
Smart Horizon GCS — Master Pre-Flight Mission & Airspace Safety Validator
Subsystem: Mission Engine (Phase 5)
"""

from typing import List, Optional

from geofence.models import Geofence
from geofence.validator import GeofenceValidator
from mission.mission_validator import ValidationReport
from mission.models import Mission
from mission.route_calculator import RouteCalculator
from .battery_estimator import BatteryEstimator
from .models import PreflightItem, PreflightItemStatus, PreflightReport, RiskLevel
from .risk_engine import RiskEngine


class ComprehensiveMissionValidator:
    """
    Comprehensive multi-layer validator executing flight envelope audits,
    geofence safety restrictions, battery RTH reserves, and risk profiling.
    """

    @classmethod
    def validate_complete_mission(
        cls,
        mission: Mission,
        geofences: List[Geofence],
        battery_pct: float = 100.0,
        gps_satellites: int = 14,
        rssi_pct: float = 95.0,
    ) -> ValidationReport:
        """
        Runs comprehensive 16-point pre-flight validation.
        """
        errors: List[str] = []
        warnings: List[str] = []
        info: List[str] = []

        wps = mission.waypoints

        # 1. Mission & Waypoint Count Check
        if not wps:
            errors.append("Mission contains zero waypoints.")
            return ValidationReport(valid=False, errors=errors, warnings=warnings, info=info)

        # 2. Home Position
        if abs(mission.home_latitude) < 0.0001 and abs(mission.home_longitude) < 0.0001:
            warnings.append("Home coordinate is set to (0, 0) Null Island. Verify GPS origin.")
        else:
            info.append(f"Home set to ({mission.home_latitude:.5f}, {mission.home_longitude:.5f}).")

        # 3. Individual Waypoints (Lat, Lon, Alt, Speed, Duplicates)
        prev_wp = None
        for i, wp in enumerate(wps):
            if not (-90.0 <= wp.latitude <= 90.0) or not (-180.0 <= wp.longitude <= 180.0):
                errors.append(f"WP{wp.index:02d}: Coordinates ({wp.latitude}, {wp.longitude}) out of valid range.")

            if wp.altitude < 2.0 or wp.altitude > 120.0:
                errors.append(f"WP{wp.index:02d}: Altitude {wp.altitude:.1f}m violates legal window [2m, 120m] AGL.")

            if wp.speed < 0.5 or wp.speed > 25.0:
                errors.append(f"WP{wp.index:02d}: Speed {wp.speed:.1f} m/s exceeds airframe limit [0.5m/s, 25m/s].")

            if prev_wp:
                dist = RouteCalculator.calculate_distance(
                    prev_wp.latitude, prev_wp.longitude, wp.latitude, wp.longitude
                )
                if dist < 1.0:
                    warnings.append(f"WP{prev_wp.index:02d} and WP{wp.index:02d} are within {dist:.2f}m (possible duplicate).")

            prev_wp = wp

        # 4. Geofence Airspace Safety Audit (3D Containment & Route Intersections)
        geo_res = GeofenceValidator.validate_mission_geofences(mission, geofences)
        errors.extend(geo_res.errors)
        warnings.extend(geo_res.warnings)
        info.extend(geo_res.info)

        # 5. Battery & RTH Reserve Audit
        bat_res = BatteryEstimator.estimate_mission_energy(mission, battery_pct)
        if bat_res.status == "CRITICAL" or not bat_res.rth_safe:
            errors.append(f"Insufficient battery for mission + RTH reserve ({bat_res.battery_at_completion_pct:.1f}% remaining).")
        elif bat_res.status == "WARNING":
            warnings.append(f"Low battery completion margin ({bat_res.battery_at_completion_pct:.1f}% remaining).")
        info.append(f"Estimated flight time: {bat_res.estimated_flight_time_sec/60:.1f} min ({bat_res.estimated_energy_wh:.1f} Wh).")

        # 6. Risk Scoring
        risk_rep = RiskEngine.evaluate_mission_risk(
            mission, geofences, battery_pct, gps_satellites, rssi_pct
        )
        if risk_rep.risk_level == RiskLevel.CRITICAL:
            errors.append(f"Mission Risk is CRITICAL (Score: {risk_rep.risk_score}/100).")
        elif risk_rep.risk_level == RiskLevel.HIGH:
            warnings.append(f"Mission Risk is HIGH (Score: {risk_rep.risk_score}/100).")
        info.append(f"Mission Risk Level: {risk_rep.risk_level.value} ({risk_rep.risk_score}/100).")

        is_valid = len(errors) == 0
        return ValidationReport(valid=is_valid, errors=errors, warnings=warnings, info=info)

    @classmethod
    def generate_preflight_checklist(
        cls,
        mission: Mission,
        geofences: List[Geofence],
        battery_pct: float = 100.0,
        gps_satellites: int = 14,
        rssi_pct: float = 95.0,
    ) -> PreflightReport:
        """
        Generates structured itemized Pre-Flight Checklist items.
        """
        items: List[PreflightItem] = []

        # 1. GPS Lock Check
        if gps_satellites >= 10:
            items.append(PreflightItem("GPS Constellation", PreflightItemStatus.PASS, f"3D DGPS Fix ({gps_satellites} Sats)", critical=True))
        elif gps_satellites >= 6:
            items.append(PreflightItem("GPS Constellation", PreflightItemStatus.WARNING, f"Degraded Fix ({gps_satellites} Sats)", critical=True))
        else:
            items.append(PreflightItem("GPS Constellation", PreflightItemStatus.FAIL, f"No 3D Lock ({gps_satellites} Sats)", critical=True))

        # 2. Battery Check
        bat_res = BatteryEstimator.estimate_mission_energy(mission, battery_pct)
        if bat_res.rth_safe and bat_res.status == "SAFE":
            items.append(PreflightItem("Battery Capacity", PreflightItemStatus.PASS, f"Initial {battery_pct:.0f}% (Est {bat_res.battery_at_completion_pct:.0f}% rem)", critical=True))
        elif bat_res.rth_safe:
            items.append(PreflightItem("Battery Capacity", PreflightItemStatus.WARNING, f"Low Reserve ({bat_res.battery_at_completion_pct:.0f}% rem)", critical=True))
        else:
            items.append(PreflightItem("Battery Capacity", PreflightItemStatus.FAIL, f"Insufficient RTH Margin ({bat_res.battery_at_completion_pct:.0f}% rem)", critical=True))

        # 3. Telemetry Link
        if rssi_pct >= 70.0:
            items.append(PreflightItem("Telemetry Link", PreflightItemStatus.PASS, f"Signal Strong ({rssi_pct:.0f}%)", critical=True))
        elif rssi_pct >= 40.0:
            items.append(PreflightItem("Telemetry Link", PreflightItemStatus.WARNING, f"Signal Marginal ({rssi_pct:.0f}%)", critical=False))
        else:
            items.append(PreflightItem("Telemetry Link", PreflightItemStatus.FAIL, f"Signal Weak ({rssi_pct:.0f}%)", critical=True))

        # 4. Home Position
        if abs(mission.home_latitude) > 0.0001:
            items.append(PreflightItem("Home Position", PreflightItemStatus.PASS, f"Home Locked ({mission.home_latitude:.4f}, {mission.home_longitude:.4f})", critical=True))
        else:
            items.append(PreflightItem("Home Position", PreflightItemStatus.FAIL, "Home origin invalid (0,0)", critical=True))

        # 5. Mission Corridor
        if len(mission.waypoints) >= 1:
            items.append(PreflightItem("Mission Plan", PreflightItemStatus.PASS, f"{len(mission.waypoints)} Waypoints Configured", critical=True))
        else:
            items.append(PreflightItem("Mission Plan", PreflightItemStatus.FAIL, "Zero waypoints in plan", critical=True))

        # 6. Geofence Containment
        geo_res = GeofenceValidator.validate_mission_geofences(mission, geofences)
        if geo_res.valid:
            items.append(PreflightItem("Airspace Geofence", PreflightItemStatus.PASS, "No-Fly clearance verified", critical=True))
        else:
            items.append(PreflightItem("Airspace Geofence", PreflightItemStatus.FAIL, "No-Fly Zone breach detected", critical=True))

        # 7. Altitude Window
        alt_valid = all(2.0 <= wp.altitude <= 120.0 for wp in mission.waypoints) if mission.waypoints else False
        if alt_valid:
            items.append(PreflightItem("Altitude Window", PreflightItemStatus.PASS, "All waypoints within [2m, 120m] AGL", critical=True))
        else:
            items.append(PreflightItem("Altitude Window", PreflightItemStatus.FAIL, "Altitude ceiling/floor violation", critical=True))

        has_critical = any(item.status == PreflightItemStatus.FAIL and item.critical for item in items)
        all_passed = all(item.status == PreflightItemStatus.PASS for item in items)

        return PreflightReport(
            items=items,
            all_passed=all_passed,
            has_critical_failures=has_critical,
        )
