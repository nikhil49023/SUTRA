"""
Smart Horizon GCS — Resource Pre-Positioning & Charging Station Models
Subsystem: Resource Pre-Positioning & Fleet Tactical Optimization
"""

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ChargingStationStatus(Enum):
    READY = "READY"
    CHARGING = "CHARGING"
    DEPLOYING = "DEPLOYING"
    MAINTENANCE = "MAINTENANCE"
    OFFLINE = "OFFLINE"


class RecommendationStatus(Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


@dataclass
class ChargingStation:
    """Portable multi-drone charging and staging node."""
    station_id: str = "STATION-01"
    name: str = "Tactical Fast-Deploy Station Alpha"
    latitude: float = 37.773500
    longitude: float = -122.421000
    elevation_m: float = 28.0
    total_bays: int = 4
    occupied_bays: int = 1
    battery_capacity_pct: float = 88.0
    power_source: str = "SOLAR_HYBRID_48V"
    status: ChargingStationStatus = ChargingStationStatus.READY

    @property
    def available_bays(self) -> int:
        return max(0, self.total_bays - self.occupied_bays)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "station_id": self.station_id,
            "name": self.name,
            "latitude": round(self.latitude, 6),
            "longitude": round(self.longitude, 6),
            "elevation_m": round(self.elevation_m, 1),
            "total_bays": self.total_bays,
            "occupied_bays": self.occupied_bays,
            "available_bays": max(0, self.total_bays - self.occupied_bays),
            "battery_capacity_pct": round(self.battery_capacity_pct, 1),
            "power_source": self.power_source,
            "status": self.status.value,
        }


@dataclass
class StagingLocation:
    """Designated safe landing / pre-positioning pad outside high-risk hazard zones."""
    location_id: str
    name: str
    latitude: float
    longitude: float
    elevation_m: float
    flood_risk_score: float = 5.0
    is_safe: bool = True


@dataclass
class PrepositioningRecommendation:
    """Actionable decision support item for operator approval."""
    recommendation_id: str = field(default_factory=lambda: f"prep_{uuid.uuid4().hex[:8]}")
    target_zone_id: str = ""
    target_risk_score: float = 0.0
    lead_time_hours: float = 2.0
    recommended_drone_ids: List[str] = field(default_factory=list)
    recommended_station_id: Optional[str] = "STATION-01"
    staging_latitude: float = 0.0
    staging_longitude: float = 0.0
    staging_name: str = "Safe Staging Ridge Alpha"
    estimated_flight_time_s: float = 180.0
    estimated_energy_consumption_pct: float = 8.5
    safe_battery_margin_pct: float = 65.0
    rationale: str = ""
    status: RecommendationStatus = RecommendationStatus.PENDING
    created_at: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "recommendation_id": self.recommendation_id,
            "target_zone_id": self.target_zone_id,
            "target_risk_score": round(self.target_risk_score, 1),
            "lead_time_hours": self.lead_time_hours,
            "recommended_drone_ids": self.recommended_drone_ids,
            "recommended_station_id": self.recommended_station_id,
            "staging_latitude": round(self.staging_latitude, 6),
            "staging_longitude": round(self.staging_longitude, 6),
            "staging_name": self.staging_name,
            "estimated_flight_time_s": round(self.estimated_flight_time_s, 1),
            "estimated_energy_consumption_pct": round(self.estimated_energy_consumption_pct, 1),
            "safe_battery_margin_pct": round(self.safe_battery_margin_pct, 1),
            "rationale": self.rationale,
            "status": self.status.value,
            "created_at": self.created_at,
        }
