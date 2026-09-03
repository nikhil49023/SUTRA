"""
Smart Horizon GCS — Master GIS Intelligence Controller & Workflow Orchestrator
Subsystem: GIS Subsystem (Phase 7)
"""

import logging
from dataclasses import replace
from typing import Any, Dict, List, Optional, Tuple

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.application_state import ApplicationState, StateStore, get_state_store
from state.gis_state import GISState

from .elevation_profile import ElevationProfileGenerator, elevation_profile_generator
from .elevation_service import ElevationService, elevation_service
from .ground_clearance import GroundClearanceAnalyzer, ground_clearance_analyzer
from .line_of_sight import LineOfSightAnalyzer, los_analyzer
from .measurement import MeasurementTool, measurement_tool
from .models import ElevationProfileReport, LOSResult, MeasurementResult, RFLinkResult, SearchGridConfig
from .rf_coverage import RFCoverageAnalyzer, rf_coverage_analyzer
from .search_grid import SearchGridGenerator, search_grid_generator
from .slope_analyzer import SlopeAnalyzer, slope_analyzer
from .weather_analyzer import WeatherAnalyzer, weather_analyzer
from .weather_service import WeatherService, weather_service

logger = logging.getLogger("sutra_gcs.gis_controller")


class GISController:
    """
    Coordinates high-level GIS tactical analysis workflows, executes non-blocking
    spatial algorithms, and updates GISState and EventBus notifications.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.logger = get_logger("gis_controller")

    def toggle_overlay(self, overlay_name: str, enabled: bool) -> None:
        """Toggles visibility of a specific GIS tactical map overlay."""
        field_name = f"{overlay_name.lower()}_enabled"
        self.state_store.update_state(
            lambda s: replace(
                s,
                gis_state=replace(s.gis_state, **{field_name: enabled}),
            )
        )
        self.event_bus.emit(
            f"gis.{overlay_name.lower()}_updated",
            payload={"enabled": enabled},
            source="gis_controller",
        )

    def run_elevation_profile(
        self, start_p: Tuple[float, float], end_p: Tuple[float, float]
    ) -> ElevationProfileReport:
        """Executes cross-sectional elevation profile analysis."""
        self.event_bus.emit("gis.analysis_started", payload={"type": "ELEVATION"}, source="gis_controller")
        rep = elevation_profile_generator.generate_profile(
            start_p[0], start_p[1], end_p[0], end_p[1]
        )

        samples_dict = [
            {"dist": pt.distance_along_m, "elev": pt.elevation_m, "lat": pt.latitude, "lon": pt.longitude}
            for pt in rep.samples
        ]

        self.state_store.update_state(
            lambda s: replace(
                s,
                gis_state=replace(
                    s.gis_state,
                    selected_analysis="ELEVATION",
                    analysis_status="COMPLETED",
                    elevation_samples=samples_dict,
                ),
            )
        )
        self.event_bus.emit("gis.analysis_completed", payload={"type": "ELEVATION"}, source="gis_controller")
        return rep

    def run_los_analysis(
        self,
        obs_p: Tuple[float, float],
        obs_alt: float,
        target_p: Tuple[float, float],
        target_alt: float,
    ) -> LOSResult:
        """Runs 3D optical/RF line-of-sight ray tracing."""
        self.event_bus.emit("gis.analysis_started", payload={"type": "LOS"}, source="gis_controller")
        res = los_analyzer.analyze_los(
            obs_p[0], obs_p[1], obs_alt, target_p[0], target_p[1], target_alt
        )

        vector_info = [{
            "obs_lat": obs_p[0],
            "obs_lon": obs_p[1],
            "target_lat": target_p[0],
            "target_lon": target_p[1],
            "visible": res.visible,
            "min_clearance": res.min_clearance_m,
        }]

        self.state_store.update_state(
            lambda s: replace(
                s,
                gis_state=replace(
                    s.gis_state,
                    selected_analysis="LOS",
                    analysis_status="COMPLETED",
                    los_vectors=vector_info,
                    los_enabled=True,
                ),
            )
        )
        self.event_bus.emit("gis.analysis_completed", payload={"type": "LOS"}, source="gis_controller")
        return res

    def run_rf_analysis(self, center_p: Tuple[float, float], radius_m: float = 2500.0) -> List[Any]:
        """Calculates 2D RF propagation coverage heatmap grid."""
        self.event_bus.emit("gis.analysis_started", payload={"type": "RF"}, source="gis_controller")
        grid = rf_coverage_analyzer.generate_coverage_grid(center_p[0], center_p[1], radius_m)

        grid_dicts = [
            {"lat": g.latitude, "lon": g.longitude, "dist": g.distance_m, "rx_power": g.rx_power_dbm, "status": g.status}
            for g in grid
        ]

        self.state_store.update_state(
            lambda s: replace(
                s,
                gis_state=replace(
                    s.gis_state,
                    selected_analysis="RF",
                    analysis_status="COMPLETED",
                    rf_grid_points=grid_dicts,
                    rf_enabled=True,
                ),
            )
        )
        self.event_bus.emit("gis.analysis_completed", payload={"type": "RF"}, source="gis_controller")
        return grid

    def run_search_grid(self, config: SearchGridConfig) -> None:
        """Generates search path and synchronizes to MissionManager."""
        from mission.mission_manager import get_mission_manager
        path = search_grid_generator.generate_search_path(config)
        wps = search_grid_generator.generate_mission_waypoints(config)

        # Update MissionManager
        mm = get_mission_manager()
        for wp in wps:
            mm.add_waypoint(wp.latitude, wp.longitude, wp.altitude, wp.speed)

        self.state_store.update_state(
            lambda s: replace(
                s,
                gis_state=replace(
                    s.gis_state,
                    search_path_points=path,
                    grid_enabled=True,
                ),
            )
        )
        self.event_bus.emit("gis.grid_created", payload={"waypoints": len(wps)}, source="gis_controller")

    def run_slope_analysis(
        self, start_p: Tuple[float, float], end_p: Tuple[float, float]
    ) -> Dict[str, Any]:
        """Computes slope gradient and classification along path."""
        rep = elevation_profile_generator.generate_profile(
            start_p[0], start_p[1], end_p[0], end_p[1]
        )
        slope_rep = slope_analyzer.analyze_profile_slope(rep)
        
        result = {
            "avg_slope_deg": slope_rep.avg_slope_deg,
            "max_slope_deg": slope_rep.max_slope_deg,
            "category": slope_rep.category.value,
            "steepest_point": {
                "lat": slope_rep.steepest_point.latitude,
                "lon": slope_rep.steepest_point.longitude,
                "elev": slope_rep.steepest_point.elevation_m,
            },
        }

        self.state_store.update_state(
            lambda s: replace(
                s,
                gis_state=replace(
                    s.gis_state,
                    selected_analysis="SLOPE",
                    analysis_status="COMPLETED",
                    slope_enabled=True,
                ),
            )
        )
        self.event_bus.emit("gis.slope_updated", payload=result, source="gis_controller")
        return result

    def run_weather_analysis(self, wind_speed: float = 4.2, wind_gusts: float = 6.5, visibility_km: float = 10.0, precip_mm: float = 0.0) -> Dict[str, Any]:
        """Assesses tactical weather conditions against UAV flight limits."""
        from .models import WeatherData
        weather_data = WeatherData(
            temperature_c=21.5,
            humidity_percent=58.0,
            pressure_hpa=1013.25,
            wind_speed_mps=wind_speed,
            wind_direction_deg=230.0,
            wind_gusts_mps=wind_gusts,
            visibility_km=visibility_km,
            precipitation_mm=precip_mm,
            cloud_cover_percent=20.0,
            available=True,
        )
        rep = weather_analyzer.evaluate_weather(weather_data)
        result = {
            "risk_level": rep.risk_level,
            "wind_status": rep.wind_status,
            "visibility_status": rep.visibility_status,
            "precipitation_status": rep.precipitation_status,
            "reasons": rep.reasons,
            "temperature_c": weather_data.temperature_c,
            "wind_speed_mps": weather_data.wind_speed_mps,
            "pressure_hpa": weather_data.pressure_hpa,
            "humidity_percent": weather_data.humidity_percent,
        }
        self.event_bus.emit("gis.weather_updated", payload=result, source="gis_controller")
        return result


# Global singleton
_global_gis_controller: Optional[GISController] = None


def get_gis_controller() -> GISController:
    global _global_gis_controller
    if _global_gis_controller is None:
        _global_gis_controller = GISController()
    return _global_gis_controller
