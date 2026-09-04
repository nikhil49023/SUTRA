"""
Smart Horizon GCS — GIS Intelligence, Topography & Tactical Analysis Package
"""

from .models import (
    SlopeCategory,
    ClearanceStatus,
    SearchPattern,
    ElevationPoint,
    ElevationProfileReport,
    SlopeAnalysisReport,
    GroundClearanceReport,
    LOSResult,
    RFLinkResult,
    RFGridPoint,
    WeatherData,
    WeatherRiskReport,
    SearchGridConfig,
    MeasurementResult,
)
from .gis_cache import GISCache, gis_cache
from .elevation_service import ElevationService, elevation_service
from .terrain_service import TerrainService, terrain_service
from .elevation_profile import ElevationProfileGenerator, elevation_profile_generator, ElevationProfiler, elevation_profiler
from .slope_analyzer import SlopeAnalyzer, slope_analyzer
from .ground_clearance import GroundClearanceAnalyzer, ground_clearance_analyzer
from .line_of_sight import LineOfSightAnalyzer, los_analyzer
from .rf_coverage import RFCoverageAnalyzer, rf_coverage_analyzer, RFAnalyzer, rf_analyzer
from .weather_service import WeatherService, weather_service
from .weather_analyzer import WeatherAnalyzer, weather_analyzer
from .search_grid import SearchGridGenerator, search_grid_generator
from .measurement import MeasurementTool, measurement_tool
from .gis_controller import GISController, get_gis_controller

# Backward compatibility alias
terrain_model = terrain_service

__all__ = [
    "SlopeCategory",
    "ClearanceStatus",
    "SearchPattern",
    "ElevationPoint",
    "ElevationProfileReport",
    "SlopeAnalysisReport",
    "GroundClearanceReport",
    "LOSResult",
    "RFLinkResult",
    "RFGridPoint",
    "WeatherData",
    "WeatherRiskReport",
    "SearchGridConfig",
    "MeasurementResult",
    "GISCache",
    "gis_cache",
    "ElevationService",
    "elevation_service",
    "TerrainService",
    "terrain_service",
    "terrain_model",
    "ElevationProfileGenerator",
    "elevation_profile_generator",
    "ElevationProfiler",
    "elevation_profiler",
    "SlopeAnalyzer",
    "slope_analyzer",
    "GroundClearanceAnalyzer",
    "ground_clearance_analyzer",
    "LineOfSightAnalyzer",
    "los_analyzer",
    "RFCoverageAnalyzer",
    "rf_coverage_analyzer",
    "RFAnalyzer",
    "rf_analyzer",
    "WeatherService",
    "weather_service",
    "WeatherAnalyzer",
    "weather_analyzer",
    "SearchGridGenerator",
    "search_grid_generator",
    "MeasurementTool",
    "measurement_tool",
    "GISController",
    "get_gis_controller",
]
