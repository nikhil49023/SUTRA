"""
Unit & Integration Tests — IMD & NDRF National Disaster Alert Feed
Subsystem: Multi-Agency Disaster Surveillance & Threat Zone Dynamic Routing
"""

import pytest
from forecast.disaster_alert_feed import (
    DisasterAlertFeedService,
    DisasterCategory,
    DisasterWarningSeverity,
    NationalDisasterZone,
    get_disaster_feed_service,
)
from risk.engine import PredictiveRiskEngine
from prepositioning.optimizer import PrepositioningOptimizer


def test_disaster_alert_feed_ingestion_and_sorting():
    svc = DisasterAlertFeedService()
    zones = svc.get_active_disaster_zones()
    assert len(zones) >= 6

    # Verify RED alerts are sorted first
    assert zones[0].severity == DisasterWarningSeverity.RED
    assert zones[0].rainfall_nowcast_mm_h >= 60.0

    # Test retrieval by ID
    z_blr = svc.get_zone_by_id("IMD-NDRF-2026-BLR-01")
    assert z_blr is not None
    assert z_blr.district == "Bengaluru Urban"
    assert "Bellandur" in z_blr.place_name
    assert "10th Bn NDRF" in z_blr.ndrf_battalion

    z_ked = svc.get_zone_by_id("IMD-NDRF-2026-KED-02")
    assert z_ked is not None
    assert z_ked.disaster_type == DisasterCategory.CLOUDBURST
    assert "8th Bn NDRF" in z_ked.ndrf_battalion


def test_dynamic_theater_realignment_to_ndrf_zone():
    risk_engine = PredictiveRiskEngine()
    feed_svc = DisasterAlertFeedService()
    zone = feed_svc.get_zone_by_id("IMD-NDRF-2026-WAY-03")
    assert zone is not None

    # Shift Risk Engine to Wayanad Disaster Zone
    risk_engine.set_center_coordinates(zone.latitude, zone.longitude)
    t_map = risk_engine.evaluate_temporal_risk_map()
    grid_0 = t_map.horizons["0h"]

    assert abs(grid_0.center_lat - 11.5300) < 0.001
    assert abs(grid_0.center_lon - 76.1300) < 0.001
    assert len(grid_0.cells) == 100
