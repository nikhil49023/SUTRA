"""
SUTRA GCS — Geofence Service
"""

from typing import Dict, Any, List, Optional
from .models import GeofenceBoundary, GeofenceType


class GeofenceService:
    """Manages active geofence zones in system memory."""

    def __init__(self):
        self.primary_fence = GeofenceBoundary()

    def get_primary_geofence(self) -> GeofenceBoundary:
        return self.primary_fence

    def update_radius(self, radius_m: float) -> None:
        self.primary_fence.radius_m = radius_m


geofence_service = GeofenceService()
