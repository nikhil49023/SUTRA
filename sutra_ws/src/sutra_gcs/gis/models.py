"""
Smart Horizon GCS — Tactical GIS Intelligence Domain Models
Subsystem: GIS Subsystem (Phase 7)
"""

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


class SlopeCategory(str, Enum):
    LOW = "LOW"             # 0 - 10 deg
    MODERATE = "MODERATE"   # 10 - 20 deg
    HIGH = "HIGH"           # 20 - 35 deg
    VERY_HIGH = "VERY_HIGH" # > 35 deg


class ClearanceStatus(str, Enum):
    SAFE = "SAFE"           # Clearance >= 30m
    WARNING = "WARNING"     # 10m <= Clearance < 30m
    CRITICAL = "CRITICAL"   # Clearance < 10m


class SearchPattern(str, Enum):
    GRID = "GRID"
    LAWN_MOWER = "LAWN_MOWER"
    SPIRAL = "SPIRAL"
    PERIMETER = "PERIMETER"
    CUSTOM = "CUSTOM"


@dataclass(frozen=True)
class ElevationPoint:
    """Sampled terrain elevation node along a spatial vector."""
    latitude: float
    longitude: float
    elevation_m: float
    distance_along_m: float = 0.0


@dataclass(frozen=True)
class ElevationProfileReport:
    """Structured report of topography along a flight segment or route."""
    start_point: Tuple[float, float]
    end_point: Tuple[float, float]
    total_distance_m: float
    min_elevation_m: float
    max_elevation_m: float
    avg_elevation_m: float
    highest_point: ElevationPoint
    lowest_point: ElevationPoint
    samples: List[ElevationPoint] = field(default_factory=list)


@dataclass(frozen=True)
class SlopeAnalysisReport:
    """Terrain gradient analysis."""
    avg_slope_deg: float
    max_slope_deg: float
    steepest_point: ElevationPoint
    category: SlopeCategory


@dataclass(frozen=True)
class GroundClearanceReport:
    """Vertical buffer assessment between aircraft and underlying topography."""
    drone_id: str
    latitude: float
    longitude: float
    altitude_msl: float
    altitude_agl: float
    terrain_elevation_m: float
    clearance_m: float
    status: ClearanceStatus


@dataclass(frozen=True)
class LOSResult:
    """Optical and RF line-of-sight ray tracing assessment."""
    visible: bool
    blocked: bool
    blocking_location: Optional[Tuple[float, float]] = None
    blocking_elevation_m: float = 0.0
    min_clearance_m: float = 100.0
    distance_m: float = 0.0
    profile: List[Dict[str, Any]] = field(default_factory=list)


@dataclass(frozen=True)
class RFLinkResult:
    """Free Space Path Loss and Link Margin calculation."""
    frequency_mhz: float
    distance_m: float
    fspl_db: float
    rx_power_dbm: float
    link_margin_db: float
    link_quality: str   # EXCELLENT, GOOD, DEGRADED, CRITICAL, LOST
    fresnel_radius_m: float


@dataclass(frozen=True)
class RFGridPoint:
    """Single spatial coverage node in an RF propagation heatmap."""
    latitude: float
    longitude: float
    distance_m: float
    elevation_m: float
    rx_power_dbm: float
    link_margin_db: float
    status: str


@dataclass(frozen=True)
class WeatherData:
    """Atmospheric conditions report."""
    temperature_c: float = 20.0
    wind_speed_mps: float = 4.0
    wind_direction_deg: float = 270.0
    wind_gusts_mps: float = 6.0
    visibility_km: float = 10.0
    precipitation_mm: float = 0.0
    cloud_cover_pct: float = 20.0
    pressure_hpa: float = 1013.25
    condition: str = "CLEAR"
    timestamp: float = field(default_factory=time.time)
    location: Tuple[float, float] = (37.774929, -122.419416)
    available: bool = True


@dataclass(frozen=True)
class WeatherRiskReport:
    """Safety evaluation of atmospheric parameters against UAV operating limits."""
    risk_level: str  # SAFE, WARNING, CRITICAL
    wind_status: str
    visibility_status: str
    precipitation_status: str
    reasons: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class SearchGridConfig:
    """Parameters defining an autonomous SAR / Survey polygon search pattern."""
    bounds_coordinates: List[Tuple[float, float]]
    spacing_m: float = 25.0
    orientation_deg: float = 0.0
    altitude_m: float = 30.0
    speed_mps: float = 8.0
    pattern: SearchPattern = SearchPattern.LAWN_MOWER


@dataclass(frozen=True)
class MeasurementResult:
    """Tactical distance, bearing, and surface area measurement outcome."""
    distance_m: float = 0.0
    bearing_deg: float = 0.0
    elevation_diff_m: float = 0.0
    area_m2: float = 0.0
    perimeter_m: float = 0.0
