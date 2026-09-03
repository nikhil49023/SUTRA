"""
Smart Horizon GCS — Geospatial Risk Grid & Predictive Disaster Data Models
Subsystem: Predictive Risk Engine (Phase 15 Production Hardened)
"""

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


class RiskCategory(Enum):
    LOW = "LOW"               # 0 - 20
    MODERATE = "MODERATE"     # 21 - 40
    HIGH = "HIGH"             # 41 - 60
    VERY_HIGH = "VERY_HIGH"   # 61 - 80
    CRITICAL = "CRITICAL"     # 81 - 100


class AlertSeverity(Enum):
    INFO = "INFO"
    WATCH = "WATCH"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


@dataclass(frozen=True)
class FactorScore:
    """Individual normalized risk factor contribution."""
    name: str
    raw_value: float
    normalized_score: float  # [0.0 - 100.0]
    weight: float            # [0.0 - 1.0]
    weighted_contribution: float
    description: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "raw_value": round(self.raw_value, 2),
            "normalized_score": round(self.normalized_score, 1),
            "weight": round(self.weight, 2),
            "weighted_contribution": round(self.weighted_contribution, 1),
            "description": self.description,
        }


@dataclass
class RiskGridCell:
    """
    Individual spatial element of the SUTRA disaster risk grid.
    """
    cell_id: str
    latitude: float
    longitude: float
    bounds: Tuple[float, float, float, float]  # min_lat, min_lon, max_lat, max_lon
    elevation_m: float = 15.0

    # Environmental & Predictive Factors
    forecast_rainfall_rate_mm_h: float = 0.0
    accumulated_rainfall_mm: float = 0.0
    wind_speed_mps: float = 3.0
    flood_susceptibility: float = 0.2          # Hydrological & slope index [0.0 - 1.0]
    population_exposure: float = 0.3           # Density index [0.0 - 1.0]
    infrastructure_exposure: float = 0.2       # Critical roads/hospitals index [0.0 - 1.0]
    accessibility_index: float = 0.8           # Land access [1.0 = clear, 0.0 = isolated]

    # Dynamic Operational Layer
    uav_coverage_count: int = 0
    survivor_count: int = 0
    confirmed_flooded: bool = False
    confirmed_debris: bool = False

    # Composite Risk Output
    risk_score: float = 0.0                    # [0.0 - 100.0]
    category: RiskCategory = RiskCategory.LOW
    confidence: float = 0.70                   # [0.0 - 1.0]
    factors: List[FactorScore] = field(default_factory=list)
    primary_explanation: str = "Nominal baseline risk."
    last_updated: float = field(default_factory=time.time)
    horizon_offset_hours: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "cell_id": self.cell_id,
            "latitude": round(self.latitude, 6),
            "longitude": round(self.longitude, 6),
            "bounds": [round(b, 6) for b in self.bounds],
            "elevation_m": round(self.elevation_m, 1),
            "forecast_rainfall_rate_mm_h": round(self.forecast_rainfall_rate_mm_h, 1),
            "accumulated_rainfall_mm": round(self.accumulated_rainfall_mm, 1),
            "wind_speed_mps": round(self.wind_speed_mps, 1),
            "flood_susceptibility": round(self.flood_susceptibility, 2),
            "population_exposure": round(self.population_exposure, 2),
            "infrastructure_exposure": round(self.infrastructure_exposure, 2),
            "accessibility_index": round(self.accessibility_index, 2),
            "uav_coverage_count": self.uav_coverage_count,
            "survivor_count": self.survivor_count,
            "confirmed_flooded": self.confirmed_flooded,
            "confirmed_debris": self.confirmed_debris,
            "risk_score": round(self.risk_score, 1),
            "category": self.category.value,
            "confidence": round(self.confidence, 2),
            "factors": [f.to_dict() for f in self.factors],
            "primary_explanation": self.primary_explanation,
            "last_updated": self.last_updated,
            "horizon_offset_hours": self.horizon_offset_hours,
        }


@dataclass
class GeospatialRiskGrid:
    """
    Spatial matrix covering the SUTRA operational area.
    """
    grid_id: str = field(default_factory=lambda: f"grid_{uuid.uuid4().hex[:8]}")
    resolution_m: float = 50.0
    center_lat: float = 37.774929
    center_lon: float = -122.419416
    rows: int = 10
    cols: int = 10
    cells: List[RiskGridCell] = field(default_factory=list)
    timestamp: float = field(default_factory=time.time)
    horizon_offset_hours: float = 0.0

    def get_cell(self, cell_id: str) -> Optional[RiskGridCell]:
        for c in self.cells:
            if c.cell_id == cell_id:
                return c
        return None

    def get_cell_at_coords(self, lat: float, lon: float) -> Optional[RiskGridCell]:
        for c in self.cells:
            min_lat, min_lon, max_lat, max_lon = c.bounds
            if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
                return c
        # fallback to nearest centroid
        if self.cells:
            return min(self.cells, key=lambda c: (c.latitude - lat)**2 + (c.longitude - lon)**2)
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "grid_id": self.grid_id,
            "resolution_m": self.resolution_m,
            "center_lat": self.center_lat,
            "center_lon": self.center_lon,
            "rows": self.rows,
            "cols": self.cols,
            "cell_count": len(self.cells),
            "cells": [c.to_dict() for c in self.cells],
            "timestamp": self.timestamp,
            "horizon_offset_hours": self.horizon_offset_hours,
        }


@dataclass
class TemporalRiskMap:
    """
    Multi-horizon collection of spatial risk grids.
    """
    reference_time: float = field(default_factory=time.time)
    horizons: Dict[str, GeospatialRiskGrid] = field(default_factory=dict)  # "0h", "1h", "2h", "3h", "4h"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "reference_time": self.reference_time,
            "horizons": {k: v.to_dict() for k, v in self.horizons.items()},
        }


@dataclass
class RiskAlert:
    """Severity-based predictive hazard alert."""
    alert_id: str = field(default_factory=lambda: f"alert_{uuid.uuid4().hex[:8]}")
    timestamp: float = field(default_factory=time.time)
    severity: AlertSeverity = AlertSeverity.INFO
    cell_id: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    risk_score: float = 0.0
    title: str = ""
    message: str = ""
    primary_factor: str = ""
    lead_time_hours: float = 0.0
    acknowledged: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "alert_id": self.alert_id,
            "timestamp": self.timestamp,
            "severity": self.severity.value,
            "cell_id": self.cell_id,
            "latitude": round(self.latitude, 6),
            "longitude": round(self.longitude, 6),
            "risk_score": round(self.risk_score, 1),
            "title": self.title,
            "message": self.message,
            "primary_factor": self.primary_factor,
            "lead_time_hours": self.lead_time_hours,
            "acknowledged": self.acknowledged,
        }
