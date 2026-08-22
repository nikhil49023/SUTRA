"""
Smart Horizon GCS — Geofence Domain Models, Zone Types & Geometry Enums
Subsystem: Geofence Engine (Phase 4)
"""

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Tuple


class ZoneType(str, Enum):
    """
    Airspace safety containment and restriction categories.
    """

    NO_FLY = "NO_FLY"
    WARNING = "WARNING"
    SAFE = "SAFE"

    @property
    def fill_color(self) -> str:
        """Semi-transparent hex/rgba color for shaded map fill."""
        return {
            ZoneType.NO_FLY: "rgba(239, 68, 68, 0.25)",
            ZoneType.WARNING: "rgba(245, 158, 11, 0.25)",
            ZoneType.SAFE: "rgba(16, 185, 129, 0.25)",
        }[self]

    @property
    def border_color(self) -> str:
        """Opaque hex color for boundary outlines."""
        return {
            ZoneType.NO_FLY: "#ef4444",
            ZoneType.WARNING: "#f59e0b",
            ZoneType.SAFE: "#10b981",
        }[self]

    @property
    def severity(self) -> str:
        return {
            ZoneType.NO_FLY: "CRITICAL",
            ZoneType.WARNING: "WARNING",
            ZoneType.SAFE: "INFO",
        }[self]


class GeometryType(str, Enum):
    """
    Supported spatial geometry primitives.
    """

    POLYGON = "POLYGON"
    CIRCLE = "CIRCLE"
    CORRIDOR = "CORRIDOR"


@dataclass(frozen=True)
class Geofence:
    """
    Strongly-typed immutable geofence domain model.
    """

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Restricted Airspace Zone"
    zone_type: ZoneType = ZoneType.NO_FLY
    geometry_type: GeometryType = GeometryType.POLYGON
    coordinates: List[Tuple[float, float]] = field(default_factory=list)  # [(lat, lon), ...]
    center: Optional[Tuple[float, float]] = None  # (lat, lon) for circle
    radius: float = 200.0  # meters for circle
    corridor_width: float = 50.0  # meters for corridor
    altitude_min: float = 0.0  # meters AGL
    altitude_max: float = 120.0  # meters AGL
    visible: bool = True
    color: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    enabled: bool = True
    description: str = ""

    @property
    def center_lat(self) -> float:
        if self.center:
            return self.center[0]
        if self.coordinates:
            return sum(c[0] for c in self.coordinates) / len(self.coordinates)
        return 37.774929

    @property
    def center_lon(self) -> float:
        if self.center:
            return self.center[1]
        if self.coordinates:
            return sum(c[1] for c in self.coordinates) / len(self.coordinates)
        return -122.419416

    @property
    def radius_m(self) -> float:
        return self.radius


# Backward compatibility aliases
GeofenceType = ZoneType


@dataclass
class GeofenceBoundary:
    center_lat: float = 37.774929
    center_lon: float = -122.419416
    radius_m: float = 500.0
    max_alt_m: float = 120.0
    min_alt_m: float = 0.0
    fence_type: ZoneType = ZoneType.NO_FLY
