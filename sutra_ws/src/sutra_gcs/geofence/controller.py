"""
SUTRA GCS — Geofence Controller & Safety Interlock
"""

from typing import Dict, Any
from ..services.event_bus import event_bus
from .validator import geofence_validator
from .service import geofence_service


class GeofenceController:
    """Interlocks with GNC state to force RTL on safety boundary breach."""

    @staticmethod
    def monitor_drone(drone_lat: float, drone_lon: float, alt_agl: float) -> Dict[str, Any]:
        fence = geofence_service.get_primary_geofence()
        result = geofence_validator.validate_position(drone_lat, drone_lon, alt_agl, fence)
        if result["breached"]:
            event_bus.publish("GEOFENCE_BREACH", result)
        return result


geofence_controller = GeofenceController()
