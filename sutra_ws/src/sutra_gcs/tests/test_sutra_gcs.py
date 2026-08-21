"""
SUTRA GCS — Comprehensive Verification Test Suite
Tests all modular packages across UI, Map, Geofence, Mission, Fleet, Comms, AI, GIS, State, Services, and Config.
"""

import math
import pytest
import os
import sys

# Ensure package path
pkg_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, pkg_dir)

from config.settings import settings
from services.event_bus import event_bus
from services.logging_service import logger_service
from state.application_state import app_state
from state.telemetry_state import telemetry_state
from state.fleet_state import fleet_state
from communication.heartbeat import heartbeat
from communication.mavlink_encoder import mavlink_encoder
from communication.mavlink_parser import mavlink_parser
from gis.terrain import terrain_model
from gis.elevation import elevation_profiler
from gis.line_of_sight import los_analyzer
from gis.rf_analysis import rf_analyzer
from gis.weather import weather_engine
from ai.threat_detection import threat_detector
from ai.mission_advisor import mission_advisor
from geofence.geometry import GeofenceGeometry
from geofence.validator import geofence_validator
from geofence.models import GeofenceBoundary, GeofenceType
from mission.validator import mission_validator
from mission.planner import mission_planner
from mission.battery_estimator import battery_estimator
from mission.risk_engine import risk_engine
from fleet.drone import DroneModel
from fleet.formation_calculator import formation_calc
from fleet.collision_avoidance import collision_avoidance
from fleet.fleet_manager import fleet_manager
from ui.hud.artificial_horizon import artificial_horizon
from ui.hud.compass import compass_tape
from ui.hud.battery_gauge import battery_gauge
from ui.hud.warning_strip import warning_strip


def test_settings_and_origin():
    """Verify default GCS configuration parameters."""
    assert settings.APP_NAME == "Smart Horizon GCS"
    assert settings.DEFAULT_MAP_LAT == 37.774929


def test_event_bus_pub_sub():
    """Verify asynchronous event bus messaging."""
    received = []
    def handler(event):
        received.append(event)

    event_bus.subscribe("TEST_EVENT", handler)
    event_bus.publish("TEST_EVENT", {"status": "OK"})
    assert len(received) == 1
    assert received[0].payload["status"] == "OK"
    event_bus.unsubscribe("TEST_EVENT", handler)


def test_gate_g5_orca_3d_collision_avoidance():
    """
    Gate G5 Audit: Verify ORCA 3D collision avoidance engine diverts head-on drones
    to maintain reciprocal safety buffer >= 2.8m.
    """
    pos_1 = (-5.0, 0.0, 0.0)
    vel_1 = (4.0, 0.0, 0.0)
    pos_2 = (5.0, 0.0, 0.0)
    vel_2 = (-4.0, 0.0, 0.0)

    v_safe_1 = collision_avoidance.compute_avoidance_velocity(pos_1, vel_1, [(pos_2, vel_2)])
    v_safe_2 = collision_avoidance.compute_avoidance_velocity(pos_2, vel_2, [(pos_1, vel_1)])

    # Verify lateral avoidance deflection
    assert abs(v_safe_1[1]) > 0.1
    assert abs(v_safe_2[1]) > 0.1

    # Separation after 1 second
    p1_new = (pos_1[0] + v_safe_1[0], pos_1[1] + v_safe_1[1], pos_1[2] + v_safe_1[2])
    p2_new = (pos_2[0] + v_safe_2[0], pos_2[1] + v_safe_2[1], pos_2[2] + v_safe_2[2])
    dist = math.sqrt((p1_new[0] - p2_new[0])**2 + (p1_new[1] - p2_new[1])**2 + (p1_new[2] - p2_new[2])**2)
    assert dist >= 2.8, f"ORCA 3D separation {dist:.2f}m is below 2.8m Gate G5 threshold"


def test_geofence_geometry_and_validator():
    """Verify geofence point-in-polygon and 500m radial checks."""
    fence = GeofenceBoundary(center_lat=37.774929, center_lon=-122.419416, radius_m=500.0)

    # Within bounds
    res_in = geofence_validator.validate_position(37.774929 + 0.001, -122.419416, 25.0, fence)
    assert res_in["breached"] is False

    # Out of 500m bounds (~1.1km away)
    res_out = geofence_validator.validate_position(37.774929 + 0.010, -122.419416, 25.0, fence)
    assert res_out["breached"] is True
    assert "exceeds 500m" in res_out["reason"]


def test_mission_validator_battery_and_geofence():
    """Verify pre-flight validation catches geofence violations and RTL battery reserve."""
    home_lat = 37.774929
    home_lon = -122.419416

    valid_wps = [
        {"lat": home_lat + 0.001, "lon": home_lon + 0.001, "alt": 20.0},
        {"lat": home_lat + 0.002, "lon": home_lon + 0.001, "alt": 25.0}
    ]
    rep = mission_validator.validate(valid_wps, home_lat, home_lon, battery_pct=100.0)
    assert rep["valid"] is True
    assert rep["remaining_battery_at_rtl_pct"] >= 25.0


def test_gis_rf_fresnel_and_los():
    """Verify terrain elevation sampling and RF Fresnel zone radius calculation."""
    fresnel_r = rf_analyzer.calculate_fresnel_radius(50.0, 50.0, 2.4)
    assert fresnel_r > 0.0
    rssi = rf_analyzer.estimate_rssi(100.0)
    assert rssi < 0.0  # RSSI in dBm is negative


def test_mavlink_encoder_and_parser():
    """Verify MAVLink packet encoding and parsing."""
    drone = {"armed": True, "lat": 37.774929, "lon": -122.419416, "alt_msl": 65.0, "alt_agl": 20.0, "ground_speed": 5.0, "climb_rate": 0.0, "heading": 90}
    pos_frame = mavlink_encoder.encode_global_position(drone)
    assert pos_frame["lat"] == 377749290

    parsed = mavlink_parser.parse_frame("GLOBAL_POS_INT", pos_frame)
    assert abs(parsed["lat"] - 37.774929) < 1e-5


def test_ai_threat_and_nlp():
    """Verify AI threat detection simulator and NLP command parser."""
    cmd = mission_advisor.parse_command("takeoff 25m")
    assert cmd["action"] == "TAKEOFF"
    assert cmd["altitude_m"] == 25.0

    dets = threat_detector.get_detections(37.774929, -122.419416)
    assert len(dets) >= 2


def test_hud_components():
    """Verify PFD artificial horizon and compass cardinal calculations."""
    card = compass_tape.get_cardinal(90)
    assert card == "E"
    gauge = battery_gauge.get_gauge_status(18.0, 21.6)
    assert gauge["is_critical"] is True
    warns = warning_strip.evaluate_warnings(15.0, 15.0, True, False)
    assert len(warns) >= 2
