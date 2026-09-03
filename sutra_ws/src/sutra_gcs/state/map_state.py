"""
Smart Horizon GCS — Map & GIS Viewport State Model
Subsystem: State Management
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(frozen=True)
class MapState:
    """
    Persistent map camera, layer visibility, and selection state.
    """

    latitude: float = 37.774929
    longitude: float = -122.419416
    zoom: float = 16.0
    bearing: float = 0.0
    pitch: float = 0.0
    active_style: str = "dark"
    visible_layers: List[str] = field(
        default_factory=lambda: ["drones", "waypoints", "geofence", "breadcrumbs"]
    )
    follow_drone: bool = False
    selected_drone_id: Optional[str] = None
    selected_geofence_id: Optional[str] = None
