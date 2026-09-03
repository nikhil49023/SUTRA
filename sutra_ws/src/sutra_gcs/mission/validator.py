"""
SUTRA GCS — Pre-Flight Mission Validator
"""

import math
from typing import List, Dict, Any


class MissionValidator:
    """Audits mission routes against geofence limits, terrain clearance, and battery reserve."""

    @staticmethod
    def validate(waypoints: List[Dict[str, Any]], home_lat: float, home_lon: float, battery_pct: float = 100.0) -> Dict[str, Any]:
        if not waypoints or len(waypoints) < 1:
            return {"valid": False, "error": "Mission contains zero waypoints."}

        total_dist = 0.0
        prev_lat, prev_lon = home_lat, home_lon

        for wp in waypoints:
            lat = wp.get("lat", 0.0)
            lon = wp.get("lon", 0.0)
            alt = wp.get("alt", 0.0)

            # Altitude constraints
            if alt < 2.0 or alt > 120.0:
                return {"valid": False, "error": f"Waypoint altitude {alt}m violates [2m, 120m] ceiling limits."}

            # Geofence boundary check (500m radius from home)
            dlat = (lat - home_lat) * 111139.0
            dlon = (lon - home_lon) * 111139.0 * math.cos(math.radians(home_lat))
            radial_dist = math.sqrt(dlat**2 + dlon**2)
            if radial_dist > 500.0:
                return {"valid": False, "error": f"Waypoint ({lat:.5f}, {lon:.5f}) breaches 500m geofence ({radial_dist:.1f}m)."}

            # Leg distance
            leg_dist = math.sqrt(((lat - prev_lat) * 111139.0)**2 + ((lon - prev_lon) * 111139.0 * math.cos(math.radians(home_lat)))**2)
            total_dist += leg_dist
            prev_lat, prev_lon = lat, lon

        # RTL leg back to home
        rtl_dist = math.sqrt(((prev_lat - home_lat) * 111139.0)**2 + ((prev_lon - home_lon) * 111139.0 * math.cos(math.radians(home_lat)))**2)
        total_dist += rtl_dist

        # Power estimation (0.04% battery per meter)
        consumed_pct = total_dist * 0.04
        remaining_at_rtl = battery_pct - consumed_pct

        if remaining_at_rtl < 25.0:
            return {
                "valid": False,
                "error": f"Insufficient battery reserve: Remaining {remaining_at_rtl:.1f}% is below 25.0% RTL safety threshold."
            }

        return {
            "valid": True,
            "total_distance_m": round(total_dist, 1),
            "estimated_flight_time_sec": round(total_dist / 5.0, 1),
            "remaining_battery_at_rtl_pct": round(remaining_at_rtl, 1)
        }


mission_validator = MissionValidator()
