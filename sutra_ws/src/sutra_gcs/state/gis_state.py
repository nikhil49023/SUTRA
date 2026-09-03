"""
Smart Horizon GCS — GIS Intelligence & Tactical Analysis State Model
Subsystem: State Management (Phase 7)
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass(frozen=True)
class GISState:
    """
    Immutable representation of tactical GIS overlay toggles, active analysis state,
    measurement points, and computed terrain/RF/LOS grids.
    """

    # Overlay Toggles
    terrain_enabled: bool = False
    elevation_enabled: bool = True
    slope_enabled: bool = False
    los_enabled: bool = True
    rf_enabled: bool = False
    weather_enabled: bool = False
    grid_enabled: bool = False
    measurement_enabled: bool = False

    # Active Analysis State
    selected_analysis: Optional[str] = None  # ELEVATION, LOS, RF, WEATHER, SEARCH, MEASUREMENT
    analysis_status: str = "IDLE"           # IDLE, ANALYZING, COMPLETED, FAILED
    analysis_progress: float = 0.0          # 0.0 - 100.0
    analysis_result: Optional[Dict[str, Any]] = None
    analysis_error: Optional[str] = None
    selected_source: str = "DEM_SYNTHETIC"  # DEM_SYNTHETIC, DEM_LOCAL, DEM_REMOTE

    # Interactive Measurement Points
    measurement_start: Optional[Tuple[float, float]] = None
    measurement_end: Optional[Tuple[float, float]] = None
    measurement_polygon: List[Tuple[float, float]] = field(default_factory=list)

    # Computed Tactical Grids & Vectors
    elevation_samples: List[Dict[str, Any]] = field(default_factory=list)
    los_vectors: List[Dict[str, Any]] = field(default_factory=list)
    rf_grid_points: List[Dict[str, Any]] = field(default_factory=list)
    search_grid_cells: List[Dict[str, Any]] = field(default_factory=list)
    search_path_points: List[Tuple[float, float]] = field(default_factory=list)


gis_state = GISState()
