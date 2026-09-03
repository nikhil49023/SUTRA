"""
Smart Horizon GCS — Dynamic Mapping & Perception Bridge
Subsystem: Closed-Loop Dynamic Map Synchronization with Predictive Risk
"""

import time
from typing import Any, Dict, Optional

from services.event_bus import Event, EventBus, get_event_bus
from services.logging_service import get_logger
from .engine import PredictiveRiskEngine, get_risk_engine

logger = get_logger("dynamic_mapping_bridge")


class DynamicMappingBridge:
    """
    Subscribes to Subsystem C edge perception and target detection streams,
    mapping localized camera observations into geospatial risk grid cell overrides.
    """

    def __init__(self, risk_engine: Optional[PredictiveRiskEngine] = None):
        self.risk_engine = risk_engine or get_risk_engine()
        self.event_bus: EventBus = get_event_bus()
        self._subscribe_events()

    def _subscribe_events(self):
        # Listen for perception detections
        self.event_bus.subscribe("perception.target_detected", self._handle_target_detected)
        self.event_bus.subscribe("perception.hazard_detected", self._handle_hazard_detected)
        self.event_bus.subscribe("ai.target_injected", self._handle_ai_target)

    def _handle_target_detected(self, event: Event):
        payload = event.payload or {}
        lat = payload.get("latitude")
        lon = payload.get("longitude")
        label = str(payload.get("label", "")).upper()

        if lat is not None and lon is not None:
            self.ingest_observation(lat, lon, label)

    def _handle_hazard_detected(self, event: Event):
        payload = event.payload or {}
        lat = payload.get("latitude")
        lon = payload.get("longitude")
        hazard_type = str(payload.get("hazard_type", "")).upper()

        if lat is not None and lon is not None:
            self.ingest_observation(lat, lon, hazard_type)

    def _handle_ai_target(self, event: Event):
        payload = event.payload or {}
        lat = payload.get("latitude")
        lon = payload.get("longitude")
        label = str(payload.get("label", "")).upper()
        if lat is not None and lon is not None:
            self.ingest_observation(lat, lon, label)

    def ingest_observation(self, latitude: float, longitude: float, observation_type: str) -> bool:
        """
        Maps a 2D/3D localized camera observation to the containing risk grid cell.
        """
        grid = self.risk_engine.get_current_grid()
        if not grid:
            return False

        cell = grid.get_cell_at_coords(latitude, longitude)
        if not cell:
            return False

        is_flood = "FLOOD" in observation_type or "WATER" in observation_type
        is_debris = "DEBRIS" in observation_type or "COLLAPSE" in observation_type or "BLOCKED" in observation_type
        is_survivor = "SURVIVOR" in observation_type or "PERSON" in observation_type or "HUMAN" in observation_type

        survivor_count = cell.survivor_count + 1 if is_survivor else None

        updated = self.risk_engine.apply_observation_override(
            cell_id=cell.cell_id,
            confirmed_flooded=True if is_flood else None,
            confirmed_debris=True if is_debris else None,
            survivor_count=survivor_count,
        )

        if updated:
            logger.info(
                f"[DynamicMappingBridge] Camera observation '{observation_type}' dynamically updated cell {cell.cell_id} "
                f"at [{latitude:.4f}, {longitude:.4f}]"
            )
            self.event_bus.emit(
                "dynamic_map.cell_updated",
                payload={
                    "cell_id": cell.cell_id,
                    "latitude": latitude,
                    "longitude": longitude,
                    "observation": observation_type,
                    "confirmed_flooded": cell.confirmed_flooded,
                    "survivor_count": cell.survivor_count,
                },
                source="dynamic_mapping_bridge",
            )
        return updated


# Global singleton
_global_mapping_bridge: Optional[DynamicMappingBridge] = None


def get_dynamic_mapping_bridge() -> DynamicMappingBridge:
    global _global_mapping_bridge
    if _global_mapping_bridge is None:
        _global_mapping_bridge = DynamicMappingBridge()
    return _global_mapping_bridge
