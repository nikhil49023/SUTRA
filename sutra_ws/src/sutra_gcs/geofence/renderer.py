"""
SUTRA GCS — Geofence Primitives Renderer
"""

from typing import Dict, Any
from .models import GeofenceBoundary


class GeofenceRenderer:
    """Generates GeoJSON format for Leaflet/WebGIS rendering."""

    @staticmethod
    def to_geojson(fence: GeofenceBoundary) -> Dict[str, Any]:
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [fence.center_lon, fence.center_lat]
            },
            "properties": {
                "id": fence.id,
                "radius_m": fence.radius_m,
                "max_alt_m": fence.max_alt_m
            }
        }


geofence_renderer = GeofenceRenderer()
