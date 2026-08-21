"""
SUTRA GCS — Geofence Real-Time Validator
"""

from typing import Dict, Any
from .models import GeofenceBoundary, GeofenceType
from .geometry import GeofenceGeometry


class GeofenceValidator:
    """Validates drone position in real time against active boundaries."""

    @staticmethod
    def validate_position(lat: float, lon: float, alt_agl: float, geofence: GeofenceBoundary) -> Dict[str, Any]:
        # 1. Altitude check
        if alt_agl > geofence.max_alt_m:
            return {"breached": True, "reason": f"Altitude {alt_agl:.1f}m exceeds max ceiling {geofence.max_alt_m}m"}
        if alt_agl < geofence.min_alt_m and alt_agl > 0.5:
            return {"breached": True, "reason": f"Altitude {alt_agl:.1f}m below floor {geofence.min_alt_m}m"}

        # 2. Horizontal check
        if geofence.type == GeofenceType.INCLUSION_CYLINDER:
            dist = GeofenceGeometry.calculate_distance_m(lat, lon, geofence.center_lat, geofence.center_lon)
            if dist > geofence.radius_m:
                return {"breached": True, "reason": f"Distance {dist:.1f}m exceeds 500m geofence radius"}
        elif geofence.type == GeofenceType.INCLUSION_POLYGON and geofence.polygon_coords:
            if not GeofenceGeometry.point_in_polygon(lat, lon, geofence.polygon_coords):
                return {"breached": True, "reason": "Drone position outside geofence polygon boundary"}

        return {"breached": False, "reason": "Nominal"}


geofence_validator = GeofenceValidator()
