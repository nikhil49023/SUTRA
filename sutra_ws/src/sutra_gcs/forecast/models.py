"""
Smart Horizon GCS — Forecast Data Models & Schemas
Subsystem: Predictive Disaster Risk Engine (Production-Grade Ingestion)
"""

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class WarningLevel(Enum):
    NONE = "NONE"
    GREEN = "GREEN"      # Normal conditions
    YELLOW = "YELLOW"    # Watch / Be Updated
    ORANGE = "ORANGE"    # Warning / Be Prepared
    RED = "RED"          # Severe Danger / Take Action


class ProviderHealth(Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    STALE = "STALE"
    OFFLINE = "OFFLINE"


@dataclass(frozen=True)
class ForecastObservation:
    """
    Normalized, provider-independent meteorological forecast observation.
    """
    timestamp: float = field(default_factory=time.time)
    valid_from: float = field(default_factory=time.time)
    valid_until: float = field(default_factory=lambda: time.time() + 3600.0)
    latitude: float = 37.774929
    longitude: float = -122.419416
    rainfall_mm: float = 0.0                     # Expected accumulation in period (mm)
    rainfall_rate_mm_h: float = 0.0              # Intensity (mm/hour)
    precipitation_probability: float = 0.0       # Probability [0.0 - 1.0]
    wind_speed_mps: float = 3.5                  # Wind speed (m/s)
    wind_gusts_mps: float = 5.0                  # Gusts (m/s)
    wind_direction_deg: float = 270.0            # Direction in degrees [0 - 360)
    temperature_c: float = 24.0                  # Ambient temperature (°C)
    humidity_pct: float = 65.0                   # Relative humidity [0 - 100%]
    pressure_hpa: float = 1013.25                # Atmospheric pressure (hPa)
    warning_level: WarningLevel = WarningLevel.NONE
    warning_headline: str = ""
    source: str = "SIMULATION"                   # Provider name (IMD, OPEN_METEO, SIM)
    source_timestamp: float = field(default_factory=time.time)
    confidence: float = 0.90                     # Confidence score [0.0 - 1.0]
    freshness_s: float = 0.0                     # Age in seconds
    is_stale: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "valid_from": self.valid_from,
            "valid_until": self.valid_until,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "rainfall_mm": round(self.rainfall_mm, 2),
            "rainfall_rate_mm_h": round(self.rainfall_rate_mm_h, 2),
            "precipitation_probability": round(self.precipitation_probability, 2),
            "wind_speed_mps": round(self.wind_speed_mps, 2),
            "wind_gusts_mps": round(self.wind_gusts_mps, 2),
            "wind_direction_deg": round(self.wind_direction_deg, 1),
            "temperature_c": round(self.temperature_c, 1),
            "humidity_pct": round(self.humidity_pct, 1),
            "pressure_hpa": round(self.pressure_hpa, 1),
            "warning_level": self.warning_level.value,
            "warning_headline": self.warning_headline,
            "source": self.source,
            "source_timestamp": self.source_timestamp,
            "confidence": round(self.confidence, 2),
            "freshness_s": round(self.freshness_s, 1),
            "is_stale": self.is_stale,
        }


@dataclass
class ForecastHorizon:
    """
    Multi-step temporal forecast sequence covering an operational window.
    """
    reference_time: float = field(default_factory=time.time)
    horizon_hours: int = 4
    observations: List[ForecastObservation] = field(default_factory=list)
    provider_name: str = "SIMULATION"
    provider_health: ProviderHealth = ProviderHealth.HEALTHY
    stale_warning: Optional[str] = None

    def get_observation_at(self, hours_from_now: float) -> Optional[ForecastObservation]:
        """Finds closest observation matching the future offset."""
        target_time = self.reference_time + (hours_from_now * 3600.0)
        if not self.observations:
            return None
        return min(self.observations, key=lambda o: abs(o.valid_from - target_time))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "reference_time": self.reference_time,
            "horizon_hours": self.horizon_hours,
            "observations": [o.to_dict() for o in self.observations],
            "provider_name": self.provider_name,
            "provider_health": self.provider_health.value,
            "stale_warning": self.stale_warning,
        }
