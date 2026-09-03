"""
Smart Horizon GCS — Predictive Disaster Risk State
Subsystem: State Management (Risk, Forecast & Pre-Positioning State)
"""

import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class RiskState:
    """
    Reactive state model representing predictive risk grids, forecasts, and staging recommendations.
    """
    enabled: bool = True
    last_calculated: float = field(default_factory=time.time)
    current_grid_summary: Dict[str, Any] = field(default_factory=dict)
    temporal_horizons: Dict[str, Any] = field(default_factory=dict)
    active_risk_alerts: List[Dict[str, Any]] = field(default_factory=list)
    current_forecast: Dict[str, Any] = field(default_factory=dict)
    prepositioning_recommendations: List[Dict[str, Any]] = field(default_factory=list)
    charging_stations: List[Dict[str, Any]] = field(default_factory=list)
    weights: Dict[str, float] = field(
        default_factory=lambda: {
            "rainfall": 0.25,
            "flood": 0.25,
            "terrain": 0.15,
            "population": 0.15,
            "infrastructure": 0.10,
            "wind": 0.05,
            "accessibility": 0.05,
        }
    )
