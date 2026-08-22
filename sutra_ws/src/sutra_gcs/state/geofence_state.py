"""
Smart Horizon GCS — Geofence Subsystem State Model
Subsystem: State Management (Phase 4)
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from geofence.models import Geofence, GeometryType, ZoneType


@dataclass(frozen=True)
class GeofenceState:
    """
    Immutable representation of all active airspace safety containment zones,
    drawing session vertices, and active selection.
    """

    geofences: List[Geofence] = field(default_factory=list)
    selected_geofence_id: Optional[str] = None
    drawing_mode: bool = False
    drawing_points: List[Tuple[float, float]] = field(default_factory=list)
    preview_point: Optional[Tuple[float, float]] = None
    editing_vertex: Optional[int] = None
    active_zone_type: ZoneType = ZoneType.NO_FLY
    active_geometry_type: GeometryType = GeometryType.POLYGON

    def get_selected(self) -> Optional[Geofence]:
        """Returns the selected Geofence object, if any."""
        if not self.selected_geofence_id:
            return None
        for g in self.geofences:
            if g.id == self.selected_geofence_id:
                return g
        return None
