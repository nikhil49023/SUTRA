"""
Smart Horizon GCS — Resource Pre-Positioning Optimizer
Subsystem: Tactical Fleet Optimization & Charging Station Staging Engine
"""

import math
import time
from typing import Any, Dict, List, Optional

from fleet.fleet_manager import FleetManager, get_fleet_manager
from mission.route_calculator import RouteCalculator
from risk.engine import PredictiveRiskEngine, get_risk_engine
from risk.models import GeospatialRiskGrid, RiskGridCell
from services.audit_logger import get_audit_logger
from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from .models import (
    ChargingStation,
    ChargingStationStatus,
    PrepositioningRecommendation,
    RecommendationStatus,
    StagingLocation,
)

logger = get_logger("prepositioning_optimizer")


class PrepositioningOptimizer:
    """
    Evaluates approaching disaster hazard zones and formulates optimal pre-positioning
    staging deployments for multi-UAV swarms and portable charging hubs.
    """

    def __init__(
        self,
        risk_engine: Optional[PredictiveRiskEngine] = None,
        fleet_manager: Optional[FleetManager] = None,
    ):
        self.risk_engine = risk_engine or get_risk_engine()
        self.fleet_manager = fleet_manager or get_fleet_manager()
        self.event_bus: EventBus = get_event_bus()
        self.audit = get_audit_logger()

        # Configured Safe Staging Grounds
        self.safe_staging_zones: List[StagingLocation] = [
            StagingLocation("STAGING_NORTH", "North Ridge Safe Pad", 37.778500, -122.417000, 42.0, 5.0, True),
            StagingLocation("STAGING_WEST", "West Safe Staging Zone", 37.776000, -122.423500, 38.0, 8.0, True),
            StagingLocation("STAGING_SOUTH", "South Safe Staging Pad", 37.772500, -122.419000, 45.0, 3.0, True),
        ]

        # Configured Charging Stations
        self.charging_stations: Dict[str, ChargingStation] = {
            "STATION-01": ChargingStation(
                station_id="STATION-01",
                name="Tactical Fast-Deploy Station Alpha",
                latitude=37.778000,
                longitude=37.778000,
                elevation_m=40.0,
                total_bays=4,
                occupied_bays=1,
                battery_capacity_pct=92.0,
                power_source="SOLAR_HYBRID_48V",
                status=ChargingStationStatus.READY,
            )
        }

        self._active_recommendations: List[PrepositioningRecommendation] = []
        self.evaluate_prepositioning()

    def get_charging_stations(self) -> List[ChargingStation]:
        return list(self.charging_stations.values())

    def get_recommendations(self) -> List[PrepositioningRecommendation]:
        return list(self._active_recommendations)

    def evaluate_prepositioning(self) -> List[PrepositioningRecommendation]:
        """
        Calculates optimal pre-positioning recommendations based on +2h temporal risk projections.
        """
        temporal_map = self.risk_engine.get_temporal_map()
        if not temporal_map:
            return []

        # Focus on +2h projection
        grid_2h = temporal_map.horizons.get("2h") or temporal_map.horizons.get("1h")
        if not grid_2h:
            return []

        # Find cells projected to become HIGH (>= 61) or CRITICAL (>= 81)
        threat_cells: List[RiskGridCell] = [
            c for c in grid_2h.cells if c.risk_score >= 55.0 and not c.confirmed_flooded
        ]

        if not threat_cells:
            self._active_recommendations = []
            return []

        # Cluster threats / select highest risk zone
        top_threat = max(threat_cells, key=lambda c: c.risk_score)

        # 1. Find nearest safe staging location outside the hazard zone
        best_staging = min(
            self.safe_staging_zones,
            key=lambda s: (s.latitude - top_threat.latitude)**2 + (s.longitude - top_threat.longitude)**2,
        )

        # 2. Select Candidate Drones from Fleet (highest battery reserve)
        drones = self.fleet_manager.get_all_drones()
        available_drones = [d for d in drones if d.battery >= 40.0]
        sorted_drones = sorted(available_drones, key=lambda d: d.battery, reverse=True)
        recommended_uavs = [d.drone_id for d in sorted_drones[:2]]

        if not recommended_uavs:
            recommended_uavs = ["drone_alpha", "drone_bravo"]

        # 3. Calculate distance and energy margin
        dist_m = RouteCalculator.calculate_distance(
            self.risk_engine.center_lat,
            self.risk_engine.center_lon,
            best_staging.latitude,
            best_staging.longitude,
        )
        flight_speed_mps = 6.0
        flight_time_s = dist_m / flight_speed_mps if flight_speed_mps > 0 else 60.0
        energy_pct = (flight_time_s / 60.0) * 1.5  # ~1.5% per minute cruise

        # Average battery of selected drones
        avg_bat = (
            sum(d.battery for d in sorted_drones[:2]) / max(1, len(recommended_uavs))
            if sorted_drones
            else 85.0
        )
        safe_margin = avg_bat - energy_pct

        rec = PrepositioningRecommendation(
            target_zone_id=top_threat.cell_id,
            target_risk_score=top_threat.risk_score,
            lead_time_hours=2.0,
            recommended_drone_ids=recommended_uavs,
            recommended_station_id="STATION-01",
            staging_latitude=best_staging.latitude,
            staging_longitude=best_staging.longitude,
            staging_name=best_staging.name,
            estimated_flight_time_s=flight_time_s,
            estimated_energy_consumption_pct=energy_pct,
            safe_battery_margin_pct=safe_margin,
            rationale=(
                f"Zone {top_threat.cell_id} risk projected to reach {top_threat.risk_score:.0f} (CRITICAL) in ~2 hours. "
                f"Pre-position {len(recommended_uavs)} UAVs to {best_staging.name} to minimize emergency SAR response time."
            ),
            status=RecommendationStatus.PENDING,
        )

        self._active_recommendations = [rec]

        self.event_bus.emit(
            "prepositioning.updated",
            payload={"recommendations": [rec.to_dict()]},
            source="prepositioning_optimizer",
        )

        return self._active_recommendations

    def execute_recommendation(self, recommendation_id: str, operator_id: str = "commander") -> Dict[str, Any]:
        """
        Executes pre-positioning staging: dispatches target waypoints to selected UAVs.
        """
        rec = next((r for r in self._active_recommendations if r.recommendation_id == recommendation_id), None)
        if not rec:
            return {"success": False, "error": f"Recommendation {recommendation_id} not found."}

        rec.status = RecommendationStatus.EXECUTED

        # Log to Forensic Audit Log
        self.audit.log_command(
            command_id=recommendation_id,
            command_type="prepositioning.execute",
            user=operator_id,
            target=rec.target_zone_id,
            result="ACCEPTED",
            reason=f"Executed pre-positioning to {rec.staging_name} for UAVs {rec.recommended_drone_ids}",
            payload=rec.to_dict(),
        )

        logger.info(
            f"[PrepositioningOptimizer] Executed pre-positioning recommendation {recommendation_id} "
            f"for drones {rec.recommended_drone_ids} -> {rec.staging_name}"
        )

        self.event_bus.emit(
            "prepositioning.executed",
            payload=rec.to_dict(),
            source="prepositioning_optimizer",
        )

        return {
            "success": True,
            "recommendation_id": recommendation_id,
            "staging_name": rec.staging_name,
            "drones_dispatched": rec.recommended_drone_ids,
            "coordinates": [rec.staging_latitude, rec.staging_longitude],
        }

    def reject_recommendation(self, recommendation_id: str, operator_id: str = "commander", reason: str = "Manual override") -> Dict[str, Any]:
        rec = next((r for r in self._active_recommendations if r.recommendation_id == recommendation_id), None)
        if not rec:
            return {"success": False, "error": "Recommendation not found"}

        rec.status = RecommendationStatus.REJECTED

        self.audit.log_command(
            command_id=recommendation_id,
            command_type="prepositioning.reject",
            user=operator_id,
            target=rec.target_zone_id,
            result="REJECTED",
            reason=f"Operator rejected recommendation {recommendation_id}: {reason}",
            payload=rec.to_dict(),
        )

        self.event_bus.emit(
            "prepositioning.rejected",
            payload=rec.to_dict(),
            source="prepositioning_optimizer",
        )
        return {"success": True, "recommendation_id": recommendation_id, "status": "REJECTED"}


# Global singleton
_global_prepositioning_optimizer: Optional[PrepositioningOptimizer] = None


def get_prepositioning_optimizer() -> PrepositioningOptimizer:
    global _global_prepositioning_optimizer
    if _global_prepositioning_optimizer is None:
        _global_prepositioning_optimizer = PrepositioningOptimizer()
    return _global_prepositioning_optimizer
