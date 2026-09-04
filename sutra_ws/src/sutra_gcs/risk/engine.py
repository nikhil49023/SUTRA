"""
Smart Horizon GCS — Master Predictive Disaster Risk Engine
Subsystem: Geospatial Temporal Risk Evaluation & Hazard Alert Generation
"""

import math
import threading
import time
from typing import Dict, List, Optional, Tuple

from forecast.forecast_service import ForecastService, get_forecast_service
from forecast.models import ForecastHorizon, ForecastObservation
from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from .models import (
    AlertSeverity,
    FactorScore,
    GeospatialRiskGrid,
    RiskAlert,
    RiskCategory,
    RiskGridCell,
    TemporalRiskMap,
)
from .models_engine import RiskModel, RiskModelWeights, WeightedRiskModel

logger = get_logger("risk_engine")


class PredictiveRiskEngine:
    """
    Coordinates spatial risk grid generation, multi-horizon temporal projections,
    explainability generation, and dynamic hazard change detection.
    """

    def __init__(
        self,
        center_lat: float = 37.774929,
        center_lon: float = -122.419416,
        rows: int = 10,
        cols: int = 10,
        resolution_m: float = 50.0,
        weights: Optional[RiskModelWeights] = None,
    ):
        self.center_lat = center_lat
        self.center_lon = center_lon
        self.rows = rows
        self.cols = cols
        self.resolution_m = resolution_m
        self.weights = weights or RiskModelWeights()
        self.model: RiskModel = WeightedRiskModel(self.weights)

        self.event_bus: EventBus = get_event_bus()
        self.forecast_service: ForecastService = get_forecast_service()

        self._grid_template: List[RiskGridCell] = []
        self._current_grid: Optional[GeospatialRiskGrid] = None
        self._current_temporal_map: Optional[TemporalRiskMap] = None
        self._active_alerts: List[RiskAlert] = []
        self._lock = threading.Lock()

        # Build base geographic grid template
        self._initialize_grid_template()

        # Eager calculation
        self.evaluate_temporal_risk_map()

    def set_weights(self, weights: RiskModelWeights) -> None:
        """Dynamically updates risk factor weights and triggers recalculation."""
        with self._lock:
            self.weights = weights
            self.model = WeightedRiskModel(self.weights)
        self.evaluate_temporal_risk_map()
        logger.info("[RiskEngine] Configured new model factor weights.")

    def _initialize_grid_template(self) -> None:
        """Constructs Cartesian-to-Geodetic grid covering the operational bounds."""
        cells = []
        # Degrees per meter approximations
        lat_deg_per_m = 1.0 / 111139.0
        lon_deg_per_m = 1.0 / (111139.0 * math.cos(math.radians(self.center_lat)))

        half_rows = self.rows / 2.0
        half_cols = self.cols / 2.0

        for r in range(self.rows):
            for c in range(self.cols):
                # Calculate bounding box
                r_offset = (r - half_rows) * self.resolution_m
                c_offset = (c - half_cols) * self.resolution_m

                min_lat = self.center_lat + r_offset * lat_deg_per_m
                max_lat = self.center_lat + (r_offset + self.resolution_m) * lat_deg_per_m
                min_lon = self.center_lon + c_offset * lon_deg_per_m
                max_lon = self.center_lon + (c_offset + self.resolution_m) * lon_deg_per_m

                cell_lat = (min_lat + max_lat) / 2.0
                cell_lon = (min_lon + max_lon) / 2.0
                cell_id = f"Z_{r:02d}_{c:02d}"

                # Synthesize 10-variable baseline terrain & vulnerability variation
                dist_from_center = math.sqrt((r - half_rows)**2 + (c - half_cols)**2)
                elev = 12.0 + dist_from_center * 4.5
                slope = max(1.0, min(35.0, dist_from_center * 2.5))
                flood_susc = max(0.1, min(0.95, 1.0 - (elev / 45.0)))
                building_inst = 0.2 + (0.3 if r in (3, 4, 5) else 0.05)
                pop_exp = 0.2 + 0.6 * math.exp(-0.5 * (dist_from_center / 3.0)**2)
                infra_exp = 0.3 if (r in (4, 5) or c in (4, 5)) else 0.15
                comm_qual = max(0.4, 0.95 - dist_from_center * 0.05)
                energy_cost = min(0.8, 0.15 + dist_from_center * 0.08)

                cell = RiskGridCell(
                    cell_id=cell_id,
                    latitude=cell_lat,
                    longitude=cell_lon,
                    bounds=(min_lat, min_lon, max_lat, max_lon),
                    elevation_m=elev,
                    slope_deg=slope,
                    flood_susceptibility=flood_susc,
                    building_instability_index=building_inst,
                    comm_link_quality=comm_qual,
                    drone_transit_energy_cost=energy_cost,
                    airspace_clearance_index=0.92,
                    population_exposure=pop_exp,
                    infrastructure_exposure=infra_exp,
                    accessibility_index=0.85,
                )
                cells.append(cell)

        self._grid_template = cells

    def evaluate_temporal_risk_map(self) -> TemporalRiskMap:
        """
        Runs multi-horizon predictive risk evaluations for 0h, 1h, 2h, 3h, 4h.
        """
        horizon = self.forecast_service.get_forecast_horizon(self.center_lat, self.center_lon)
        now = time.time()
        temporal_grids: Dict[str, GeospatialRiskGrid] = {}
        new_alerts: List[RiskAlert] = []

        with self._lock:
            for h in range(5):  # 0h to 4h
                obs = horizon.get_observation_at(float(h))
                rain_rate = obs.rainfall_rate_mm_h if obs else 5.0
                wind_speed = obs.wind_speed_mps if obs else 4.0
                accum_rain = (obs.rainfall_mm if obs else 0.0)

                grid_cells: List[RiskGridCell] = []
                for base in self._grid_template:
                    # Clone and populate 10 horizon parameters
                    cell = RiskGridCell(
                        cell_id=base.cell_id,
                        latitude=base.latitude,
                        longitude=base.longitude,
                        bounds=base.bounds,
                        elevation_m=base.elevation_m,
                        slope_deg=base.slope_deg,
                        forecast_rainfall_rate_mm_h=rain_rate,
                        accumulated_rainfall_mm=accum_rain,
                        flood_susceptibility=base.flood_susceptibility,
                        building_instability_index=base.building_instability_index,
                        wind_speed_mps=wind_speed,
                        comm_link_quality=base.comm_link_quality,
                        drone_transit_energy_cost=base.drone_transit_energy_cost,
                        airspace_clearance_index=base.airspace_clearance_index,
                        population_exposure=base.population_exposure,
                        infrastructure_exposure=base.infrastructure_exposure,
                        accessibility_index=max(0.1, base.accessibility_index - (0.15 * h if rain_rate > 30 else 0)),
                        uav_coverage_count=base.uav_coverage_count,
                        survivor_count=base.survivor_count,
                        confirmed_flooded=base.confirmed_flooded,
                        confirmed_debris=base.confirmed_debris,
                        confidence=base.confidence,
                        horizon_offset_hours=float(h),
                    )

                    # Evaluate Risk
                    score, cat, factors, explanation = self.model.evaluate_cell(cell)
                    cell.risk_score = score
                    cell.uncertainty_margin = round(max(2.5, (1.0 - cell.confidence) * 16.0 + 2.8), 1)
                    cell.category = cat
                    cell.factors = factors
                    cell.primary_explanation = explanation
                    grid_cells.append(cell)

                    # Trigger Alerts if Risk crosses Thresholds into HIGH/CRITICAL in near future
                    if h in (1, 2) and score >= 61.0 and not base.confirmed_flooded:
                        sev = AlertSeverity.CRITICAL if score >= 81.0 else AlertSeverity.WARNING
                        alert = RiskAlert(
                            alert_id=f"alert_{cell.cell_id}_{h}h",
                            level=sev,
                            title=f"{cell.cell_id}: Risk escalating to {cat.value} (+{h}h)",
                            message=f"{explanation} (Forecast: {rain_rate:.0f} mm/h rain)",
                            affected_cells=[cell.cell_id],
                            max_risk_score=score,
                            primary_factor=factors[0].name,
                            lead_time_hours=float(h),
                        )
                        new_alerts.append(alert)

                horizon_key = f"{h}h"
                temporal_grids[horizon_key] = GeospatialRiskGrid(
                    grid_id=f"grid_{horizon_key}_{int(now)}",
                    resolution_m=self.resolution_m,
                    center_lat=self.center_lat,
                    center_lon=self.center_lon,
                    rows=self.rows,
                    cols=self.cols,
                    cells=grid_cells,
                    timestamp=now,
                    horizon_offset_hours=float(h),
                )

            self._current_grid = temporal_grids["0h"]
            self._current_temporal_map = TemporalRiskMap(
                reference_time=now,
                horizons=temporal_grids,
            )
            self._active_alerts = new_alerts[:10]  # retain top 10 unique alerts

        # Broadcast update over EventBus
        self.event_bus.emit(
            "risk.updated",
            payload=self._current_temporal_map.to_dict(),
            source="risk_engine",
        )

        return self._current_temporal_map

    def get_current_grid(self) -> Optional[GeospatialRiskGrid]:
        with self._lock:
            return self._current_grid

    def get_temporal_map(self) -> Optional[TemporalRiskMap]:
        with self._lock:
            return self._current_temporal_map

    def get_active_alerts(self) -> List[RiskAlert]:
        with self._lock:
            return list(self._active_alerts)

    def apply_observation_override(
        self,
        cell_id: str,
        confirmed_flooded: Optional[bool] = None,
        confirmed_debris: Optional[bool] = None,
        survivor_count: Optional[int] = None,
    ) -> bool:
        """
        Allows real-time drone camera observations to update and override predictive assumptions.
        """
        updated = False
        with self._lock:
            for cell in self._grid_template:
                if cell.cell_id == cell_id:
                    if confirmed_flooded is not None:
                        cell.confirmed_flooded = confirmed_flooded
                        cell.confidence = 0.95 if confirmed_flooded else cell.confidence
                    if confirmed_debris is not None:
                        cell.confirmed_debris = confirmed_debris
                        cell.confidence = 0.92 if confirmed_debris else cell.confidence
                    if survivor_count is not None:
                        cell.survivor_count = survivor_count
                    cell.last_updated = time.time()
                    updated = True
                    break

        if updated:
            self.evaluate_temporal_risk_map()
            logger.info(f"[RiskEngine] Observation override applied to {cell_id}")
        return updated

    def set_center_coordinates(self, center_lat: float, center_lon: float) -> None:
        """Dynamically shifts the 10x10 risk matrix to a new disaster theater center."""
        with self._lock:
            self.center_lat = center_lat
            self.center_lon = center_lon
            self._initialize_grid_template()
        self.evaluate_temporal_risk_map()
        logger.info(f"[RiskEngine] Updated operational center to [{center_lat:.6f}, {center_lon:.6f}]")


# Global singleton
_global_risk_engine: Optional[PredictiveRiskEngine] = None


def get_risk_engine() -> PredictiveRiskEngine:
    global _global_risk_engine
    if _global_risk_engine is None:
        _global_risk_engine = PredictiveRiskEngine()
    return _global_risk_engine
