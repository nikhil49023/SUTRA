"""
SUTRA GCS — Geofence Interactive Editor
"""

from typing import List, Dict, Any
from .models import GeofenceBoundary, GeofenceType


class GeofenceEditor:
    """Modifies geofence polygon vertices and altitude ceiling parameters."""

    @staticmethod
    def update_polygon(fence: GeofenceBoundary, vertices: List[Dict[str, float]]) -> GeofenceBoundary:
        fence.polygon_coords = vertices
        fence.type = GeofenceType.INCLUSION_POLYGON
        return fence


geofence_editor = GeofenceEditor()
