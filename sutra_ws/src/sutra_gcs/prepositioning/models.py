"""
Smart Horizon GCS — Resource Pre-Positioning, Charging & Risk-to-Mission Synthesis Models
Subsystem: Resource Pre-Positioning & Fleet Tactical Optimization (Phase 15 Hardened)
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


class SynthesisPlanStatus(Enum):
    SYNTHESIZED = "SYNTHESIZED"
    DISPATCHED = "DISPATCHED"
    EXECUTING = "EXECUTING"
    REPLANNED = "REPLANNED"
    COMPLETED = "COMPLETED"


@dataclass
class ChargingStation:
    """Portable multi-drone charging and staging node."""
    station_id: str = "STATION-01"
    name: str = "Tactical Fast-Deploy Station Alpha"
    latitude: float = 12.9330
    longitude: float = 77.6890
    elevation_m: float = 905.0
    total_bays: int = 4
    occupied_bays: int = 1
    battery_capacity_pct: float = 92.0
    power_source: str = "SOLAR_HYBRID_48V"
    status: ChargingStationStatus = ChargingStationStatus.READY
    reserved_drones: List[str] = field(default_factory=list)

    @property
    def available_bays(self) -> int:
        return max(0, self.total_bays - self.occupied_bays - len(self.reserved_drones))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "station_id": self.station_id,
            "name": self.name,
            "latitude": round(self.latitude, 6),
            "longitude": round(self.longitude, 6),
            "elevation_m": round(self.elevation_m, 1),
            "total_bays": self.total_bays,
            "occupied_bays": self.occupied_bays,
            "available_bays": self.available_bays,
            "battery_capacity_pct": round(self.battery_capacity_pct, 1),
            "power_source": self.power_source,
            "status": self.status.value,
            "reserved_drones": self.reserved_drones,
        }


@dataclass
class StagingLocation:
    """Designated safe landing / pre-positioning pad outside high-risk hazard zones."""
    location_id: str
    name: str
    latitude: float
    longitude: float
    elevation_m: float
    risk_score: float = 10.0
    is_accessible: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "location_id": self.location_id,
            "name": self.name,
            "latitude": round(self.latitude, 6),
            "longitude": round(self.longitude, 6),
            "elevation_m": round(self.elevation_m, 1),
            "risk_score": round(self.risk_score, 1),
            "is_accessible": self.is_accessible,
        }


@dataclass
class PrepositioningRecommendation:
    """
    Actionable multi-UAV swarm pre-positioning recommendation.
    """
    recommendation_id: str
    target_zone_id: str
    target_risk_score: float
    lead_time_hours: float
    recommended_drone_ids: List[str]
    recommended_station_id: Optional[str]
    staging_latitude: float
    staging_longitude: float
    staging_name: str
    estimated_flight_time_s: float
    estimated_energy_consumption_pct: float
    safe_battery_margin_pct: float
    rationale: str
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


@dataclass
class RiskMissionSynthesisPlan:
    """
    Complete end-to-end Risk-to-Mission Synthesis Plan:
    Alert -> Risk Score -> Search Area -> Number of Drones -> Battery Requirement -> Staging LZ -> Mission Waypoints
    """
    plan_id: str
    alert_id: str
    place_name: str
    district: str
    state: str
    risk_score: float
    risk_category: str
    search_area_km2: float
    search_polygon_coords: List[List[float]]
    num_drones_required: int
    assigned_drone_ids: List[str]
    battery_required_pct: float
    safe_battery_margin_pct: float
    staging_location_name: str
    staging_coords: List[float]
    charging_station_id: str
    mission_waypoints: List[Dict[str, Any]]
    status: SynthesisPlanStatus = SynthesisPlanStatus.SYNTHESIZED
    generated_at: float = field(default_factory=time.time)
    replanning_history: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plan_id": self.plan_id,
            "alert_id": self.alert_id,
            "place_name": self.place_name,
            "district": self.district,
            "state": self.state,
            "risk_score": round(self.risk_score, 1),
            "risk_category": self.risk_category,
            "search_area_km2": round(self.search_area_km2, 4),
            "search_polygon_coords": self.search_polygon_coords,
            "num_drones_required": self.num_drones_required,
            "assigned_drone_ids": self.assigned_drone_ids,
            "battery_required_pct": round(self.battery_required_pct, 1),
            "safe_battery_margin_pct": round(self.safe_battery_margin_pct, 1),
            "staging_location_name": self.staging_location_name,
            "staging_coords": self.staging_coords,
            "charging_station_id": self.charging_station_id,
            "mission_waypoints": self.mission_waypoints,
            "status": self.status.value,
            "generated_at": self.generated_at,
            "replanning_history": self.replanning_history,
        }
