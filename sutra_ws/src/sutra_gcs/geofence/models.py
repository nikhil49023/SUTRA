"""
SUTRA GCS — Geofence Models
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any
from enum import Enum


class GeofenceType(str, Enum):
    INCLUSION_CYLINDER = "INCLUSION_CYLINDER"
    INCLUSION_POLYGON = "INCLUSION_POLYGON"
    EXCLUSION_ZONE = "EXCLUSION_ZONE"


@dataclass
class GeofenceBoundary:
    id: str = "gf_primary"
    name: str = "Primary Operations Geofence"
    type: GeofenceType = GeofenceType.INCLUSION_CYLINDER
    center_lat: float = 37.774929
    center_lon: float = -122.419416
    radius_m: float = 500.0
    min_alt_m: float = 2.0
    max_alt_m: float = 120.0
    polygon_coords: List[Dict[str, float]] = field(default_factory=list)
