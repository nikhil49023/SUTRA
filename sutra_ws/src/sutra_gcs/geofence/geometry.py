"""
SUTRA GCS — Geofence Geometric Calculations
"""

import math
from typing import List, Dict, Any


class GeofenceGeometry:
    """Calculates Point-in-Polygon (PIP) and radial geodesic boundaries."""

    @staticmethod
    def calculate_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        dlat = (lat2 - lat1) * 111139.0
        dlon = (lon2 - lon1) * 111139.0 * math.cos(math.radians(lat1))
        return math.sqrt(dlat**2 + dlon**2)

    @staticmethod
    def point_in_polygon(lat: float, lon: float, polygon: List[Dict[str, float]]) -> bool:
        """Ray-casting algorithm for 2D polygon inclusion."""
        num_vertices = len(polygon)
        if num_vertices < 3:
            return True
        inside = False
        p1 = polygon[0]
        for i in range(num_vertices + 1):
            p2 = polygon[i % num_vertices]
            if lon > min(p1["lon"], p2["lon"]):
                if lon <= max(p1["lon"], p2["lon"]):
                    if lat <= max(p1["lat"], p2["lat"]):
                        if p1["lon"] != p2["lon"]:
                            xinters = (lon - p1["lon"]) * (p2["lat"] - p1["lat"]) / (p2["lon"] - p1["lon"]) + p1["lat"]
                            if p1["lat"] == p2["lat"] or lat <= xinters:
                                inside = not inside
            p1 = p2
        return inside
