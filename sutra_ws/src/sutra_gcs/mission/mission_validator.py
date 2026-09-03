"""
Smart Horizon GCS — Pre-Flight Mission & Route Validator
Subsystem: Mission Engine (Phase 3)
"""

import math
from dataclasses import dataclass, field
from typing import List, Optional

from .models import Mission
from .route_calculator import RouteCalculator
from .waypoint import Waypoint


@dataclass(frozen=True)
class ValidationReport:
    """
    Structured pre-flight safety validation report.
    """

    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    info: List[str] = field(default_factory=list)


class MissionValidator:
    """
    Validates mission plans against airspace regulations, physical bounds,
    and UAV flight performance limits.
    """

    MIN_ALTITUDE_M: float = 2.0
    MAX_ALTITUDE_M: float = 120.0  # Standard civilian AGL ceiling
    MIN_SPEED_MPS: float = 0.5
    MAX_SPEED_MPS: float = 25.0
    MIN_DISTANCE_BETWEEN_WPS_M: float = 1.0

    @classmethod
    def validate(cls, mission: Mission) -> ValidationReport:
        """
        Runs comprehensive validation rules against the mission aggregate.
        """
        errors: List[str] = []
        warnings: List[str] = []
        info: List[str] = []

        wps = mission.waypoints

        # 1. Waypoint Count Rule
        if not wps:
            errors.append("Mission contains zero waypoints.")
            return ValidationReport(valid=False, errors=errors, warnings=warnings, info=info)

        # 2. Home Position Validation
        if abs(mission.home_latitude) < 0.0001 and abs(mission.home_longitude) < 0.0001:
            warnings.append("Home position is set to (0, 0) Null Island. Verify GPS launch origin.")
        else:
            info.append(f"Home set to ({mission.home_latitude:.5f}, {mission.home_longitude:.5f}).")

        # 3. Individual Waypoint Validation
        prev_wp: Optional[Waypoint] = None
        for i, wp in enumerate(wps):
            # Index check
            if wp.index != i + 1:
                warnings.append(f"WP{wp.index} sequence mismatch (expected index {i + 1}).")

            # Geodetic coordinate bounds
            if not (-90.0 <= wp.latitude <= 90.0):
                errors.append(f"WP{wp.index}: Latitude {wp.latitude}° is outside valid range [-90, +90].")
            if not (-180.0 <= wp.longitude <= 180.0):
                errors.append(f"WP{wp.index}: Longitude {wp.longitude}° is outside valid range [-180, +180].")

            # Altitude bounds
            if wp.altitude < cls.MIN_ALTITUDE_M:
                errors.append(f"WP{wp.index}: Altitude {wp.altitude}m is below minimum {cls.MIN_ALTITUDE_M}m AGL.")
            elif wp.altitude > cls.MAX_ALTITUDE_M:
                errors.append(f"WP{wp.index}: Altitude {wp.altitude}m exceeds legal ceiling of {cls.MAX_ALTITUDE_M}m AGL.")

            # Speed bounds
            if wp.speed < cls.MIN_SPEED_MPS:
                warnings.append(f"WP{wp.index}: Speed {wp.speed} m/s is very low.")
            elif wp.speed > cls.MAX_SPEED_MPS:
                errors.append(f"WP{wp.index}: Speed {wp.speed} m/s exceeds max airframe velocity {cls.MAX_SPEED_MPS} m/s.")

            # Duplicate / proximity check
            if prev_wp:
                dist = RouteCalculator.calculate_distance(
                    prev_wp.latitude, prev_wp.longitude, wp.latitude, wp.longitude
                )
                if dist < cls.MIN_DISTANCE_BETWEEN_WPS_M:
                    warnings.append(
                        f"WP{prev_wp.index} and WP{wp.index} are within {dist:.2f}m of each other (possible duplicate)."
                    )

            prev_wp = wp

        # 4. Total Distance Check
        total_dist_m = RouteCalculator.calculate_total_distance(wps, mission.home_latitude, mission.home_longitude)
        info.append(f"Total path length: {total_dist_m:.1f} meters ({len(wps)} waypoints).")

        if total_dist_m > 25000.0:  # 25km range warning
            warnings.append(f"Mission distance ({total_dist_m/1000:.1f} km) exceeds typical single-battery range.")

        # 5. Geofence Airspace Safety Audit
        from state.application_state import get_state_store
        from geofence.validator import GeofenceValidator
        geofences = get_state_store().get_state().geofence_state.geofences
        if geofences:
            geo_res = GeofenceValidator.validate_mission_geofences(mission, geofences)
            errors.extend(geo_res.errors)
            warnings.extend(geo_res.warnings)
            info.extend(geo_res.info)

        is_valid = len(errors) == 0
        return ValidationReport(valid=is_valid, errors=errors, warnings=warnings, info=info)
