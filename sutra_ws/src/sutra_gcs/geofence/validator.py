"""
Smart Horizon GCS — 3D Airspace Safety & Geofence Containment Validator
Subsystem: Geofence Subsystem (Phase 4)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, List, Optional

from .geometry import GeofenceGeometry
from .models import Geofence, GeometryType, ZoneType

if TYPE_CHECKING:
    from mission.models import Mission
    from mission.waypoint import Waypoint


@dataclass(frozen=True)
class GeofenceValidationResult:
    """
    Structured airspace safety analysis report.
    """

    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    info: List[str] = field(default_factory=list)


class GeofenceValidator:
    """
    Validates flight plans against active 3D airspace restriction boundaries.
    """

    @classmethod
    def validate_mission_geofences(
        cls,
        mission: Mission,
        geofences: List[Geofence],
    ) -> GeofenceValidationResult:
        """
        Runs comprehensive 3D containment and corridor intersection checks
        between mission waypoints/legs and active geofences.
        """
        errors: List[str] = []
        warnings: List[str] = []
        info: List[str] = []

        active_geofences = [g for g in geofences if g.enabled]
        if not active_geofences:
            info.append("No active airspace geofences enforced.")
            return GeofenceValidationResult(valid=True, errors=errors, warnings=warnings, info=info)

        wps = mission.waypoints
        if not wps:
            return GeofenceValidationResult(valid=True, errors=errors, warnings=warnings, info=info)

        # 1. Individual Waypoint 3D Containment Checks
        for wp in wps:
            cls._check_waypoint_containment(wp, active_geofences, errors, warnings, info)

        # 2. Flight Path Route Leg Intersection Checks
        points = [(mission.home_latitude, mission.home_longitude, wps[0].altitude)] + [
            (wp.latitude, wp.longitude, wp.altitude) for wp in wps
        ]
        for i in range(len(points) - 1):
            p1 = (points[i][0], points[i][1])
            p2 = (points[i + 1][0], points[i + 1][1])
            alt1 = points[i][2]
            alt2 = points[i + 1][2]
            wp_start_name = "HOME" if i == 0 else f"WP{i:02d}"
            wp_end_name = f"WP{i+1:02d}"

            cls._check_route_leg_intersection(
                p1, p2, alt1, alt2, wp_start_name, wp_end_name, active_geofences, errors, warnings
            )

        is_valid = len(errors) == 0
        return GeofenceValidationResult(
            valid=is_valid, errors=errors, warnings=warnings, info=info
        )

    @classmethod
    def _check_waypoint_containment(
        cls,
        wp: Waypoint,
        geofences: List[Geofence],
        errors: List[str],
        warnings: List[str],
        info: List[str],
    ) -> None:
        for g in geofences:
            # Check vertical altitude window
            if not (g.altitude_min <= wp.altitude <= g.altitude_max):
                continue

            # Convert geofence to geometry
            poly = cls._get_geofence_poly(g)
            if not poly:
                continue

            is_inside = GeofenceGeometry.contains_point(poly, wp.latitude, wp.longitude)

            if is_inside:
                if g.zone_type == ZoneType.NO_FLY:
                    errors.append(
                        f"CRITICAL: WP{wp.index:02d} ({wp.latitude:.5f}, {wp.longitude:.5f}, {wp.altitude:.0f}m) "
                        f"violates NO-FLY ZONE '{g.name}'!"
                    )
                elif g.zone_type == ZoneType.WARNING:
                    warnings.append(
                        f"WARNING: WP{wp.index:02d} enters WARNING ZONE '{g.name}'."
                    )

    @classmethod
    def _check_route_leg_intersection(
        cls,
        p1: tuple,
        p2: tuple,
        alt1: float,
        alt2: float,
        start_name: str,
        end_name: str,
        geofences: List[Geofence],
        errors: List[str],
        warnings: List[str],
    ) -> None:
        for g in geofences:
            if g.zone_type != ZoneType.NO_FLY:
                continue

            # 3D vertical window check on leg
            leg_min_alt = min(alt1, alt2)
            leg_max_alt = max(alt1, alt2)
            if leg_min_alt > g.altitude_max or leg_max_alt < g.altitude_min:
                continue

            poly = cls._get_geofence_poly(g)
            if not poly:
                continue

            if GeofenceGeometry.intersects_line(poly, p1[0], p1[1], p2[0], p2[1]):
                errors.append(
                    f"CRITICAL: Route leg {start_name} -> {end_name} intersects NO-FLY ZONE '{g.name}'!"
                )

    @classmethod
    def _get_geofence_poly(cls, g: Geofence):
        if g.geometry_type == GeometryType.CIRCLE and g.center:
            return GeofenceGeometry.create_circle(g.center[0], g.center[1], g.radius)
        elif g.geometry_type == GeometryType.CORRIDOR and len(g.coordinates) >= 2:
            return GeofenceGeometry.create_corridor(g.coordinates, g.corridor_width)
        elif g.coordinates and len(g.coordinates) >= 3:
            return GeofenceGeometry.create_polygon(g.coordinates)
        return None

    def validate_position(self, lat: float, lon: float, alt: float, fence) -> dict:
        """Compatibility method for point checks."""
        from mission.route_calculator import RouteCalculator
        dist = RouteCalculator.calculate_distance(fence.center_lat, fence.center_lon, lat, lon)
        breached = dist > fence.radius_m or alt > getattr(fence, "max_alt_m", 120.0) or alt < getattr(fence, "min_alt_m", 0.0)
        reason = f"Distance {dist:.1f}m exceeds 500m radial geofence" if breached else "Position within geofence"
        return {"breached": breached, "distance_to_boundary": abs(dist - fence.radius_m), "reason": reason}


# Backward compatibility singleton
geofence_validator = GeofenceValidator()
