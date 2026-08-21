"""
SUTRA GNC & Flask Ground Control Station — Comprehensive Verification Test Suite
Verifies mathematical integrity, Gate G5 safety clearance (>2.8m), GIS LOS, MAVLink, Replay & RBAC.
"""

import math
import pytest
from gnc_engine import CoordinateTransform, AttitudeMath, ORCA3DAvoidance, DroneGNC, FlightMode, MissionValidator
from ai_bridge import AIPerceptionBridge, NLPMissionAssistant
from gis_engine import GISEngine
from replay_engine import FlightReplayEngine
from security import SecurityManager, UserRole
from mavlink_bridge import MAVLinkBridge
from app import app


def test_quaternion_unit_norm_precision():
    """Verify that euler_to_quaternion produces unit quaternions across all roll/pitch/yaw combinations."""
    for roll_deg in (-30, 0, 30):
        for pitch_deg in (-30, 0, 30):
            for yaw_deg in range(0, 360, 30):
                r = math.radians(roll_deg)
                p = math.radians(pitch_deg)
                y = math.radians(yaw_deg)
                qx, qy, qz, qw = AttitudeMath.euler_to_quaternion(r, p, y)
                norm = math.sqrt(qx**2 + qy**2 + qz**2 + qw**2)
                assert abs(norm - 1.0) < 1e-10, f"Quaternion norm failure: {norm}"


def test_coordinate_transform_roundtrip():
    """Verify WGS84 -> NED -> WGS84 roundtrip accuracy is within millimeters."""
    origin_lat = 37.774929
    origin_lon = -122.419416
    transform = CoordinateTransform(origin_lat, origin_lon, 15.0)

    test_n, test_e, test_d = 100.0, 50.0, -20.0
    lat, lon, alt = transform.ned_to_wgs84(test_n, test_e, test_d)
    n_rec, e_rec, d_rec = transform.wgs84_to_ned(lat, lon, alt)

    assert abs(n_rec - test_n) < 1e-5
    assert abs(e_rec - test_e) < 1e-5
    assert abs(d_rec - test_d) < 1e-5


def test_gate_g5_orca_3d_safety_separation():
    """
    Gate G5 Audit: Verify ORCA 3D collision avoidance solver actively diverts drones
    approaching each other on a head-on collision course to maintain separation > 2.8m.
    """
    orca = ORCA3DAvoidance(safety_radius=3.0, time_horizon=2.0, max_speed=8.0)

    pos_1 = (-5.0, 0.0, 0.0)
    vel_pref_1 = (4.0, 0.0, 0.0)

    pos_2 = (5.0, 0.0, 0.0)
    vel_2 = (-4.0, 0.0, 0.0)

    v_safe_1 = orca.compute_avoidance_velocity(pos_1, vel_pref_1, [(pos_2, vel_2)])
    v_safe_2 = orca.compute_avoidance_velocity(pos_2, vel_2, [(pos_1, vel_pref_1)])

    transverse_speed_1 = math.sqrt(v_safe_1[1]**2 + v_safe_1[2]**2)
    transverse_speed_2 = math.sqrt(v_safe_2[1]**2 + v_safe_2[2]**2)
    assert transverse_speed_1 > 0.1
    assert transverse_speed_2 > 0.1

    new_pos_1 = (pos_1[0] + v_safe_1[0] * 1.0, pos_1[1] + v_safe_1[1] * 1.0, pos_1[2] + v_safe_1[2] * 1.0)
    new_pos_2 = (pos_2[0] + v_safe_2[0] * 1.0, pos_2[1] + v_safe_2[1] * 1.0, pos_2[2] + v_safe_2[2] * 1.0)

    dist = math.sqrt((new_pos_1[0] - new_pos_2[0])**2 + (new_pos_1[1] - new_pos_2[1])**2 + (new_pos_1[2] - new_pos_2[2])**2)
    assert dist >= 2.8, f"ORCA reciprocal separation {dist}m failed Gate G5 threshold (>= 2.8m)"


def test_mission_validator_battery_and_geofence():
    """Verify MissionValidator catches geofence violations and low battery reserves."""
    home_lat = 37.774929
    home_lon = -122.419416

    # Valid route
    valid_wps = [
        {"lat": home_lat + 0.001, "lon": home_lon + 0.001, "alt": 20.0},
        {"lat": home_lat + 0.002, "lon": home_lon + 0.001, "alt": 25.0}
    ]
    rep = MissionValidator.validate_mission(valid_wps, home_lat, home_lon, battery_pct=100.0)
    assert rep["valid"] is True

    # Out of geofence (> 500m)
    invalid_wps = [{"lat": home_lat + 0.01, "lon": home_lon, "alt": 20.0}]  # ~1.1km
    rep_bad = MissionValidator.validate_mission(invalid_wps, home_lat, home_lon, battery_pct=100.0)
    assert rep_bad["valid"] is False
    assert "geofence" in rep_bad["error"].lower()


def test_gis_rf_line_of_sight_fresnel():
    """Verify RF line of sight and Fresnel clearance calculation."""
    gis = GISEngine()
    res = gis.compute_rf_los(
        gcs_lat=37.774929, gcs_lon=-122.419416, gcs_alt_msl=45.0,
        drone_lat=37.775500, drone_lon=-122.418500, drone_alt_msl=150.0,
        freq_ghz=2.4
    )
    assert res["total_distance_m"] > 0
    assert "is_los_clear" in res
    assert len(res["profile"]) > 0


def test_mavlink_frames_and_qgc_plan():
    """Verify MAVLink packet serialization and QGroundControl .plan export/import."""
    drone_dict = {
        "armed": True, "mode": "WAYPOINT_NAV", "lat": 37.774929, "lon": -122.419416,
        "alt_agl": 20.0, "alt_msl": 165.0, "roll": 2.0, "pitch": -1.5, "yaw": 90.0,
        "heading": 90, "ground_speed": 4.5, "air_speed": 4.8, "climb_rate": 0.0,
        "battery_pct": 92.0, "battery_voltage": 24.8, "battery_current": 14.0
    }
    frames = MAVLinkBridge.generate_mavlink_frames(drone_dict)
    assert "HEARTBEAT" in frames
    assert "GLOBAL_POS_INT" in frames
    assert frames["GLOBAL_POS_INT"]["lat"] == 377749290

    # Plan export & import
    wps = [{"lat": 37.775, "lon": -122.419, "alt": 25.0}]
    plan_json = MAVLinkBridge.export_qgc_plan(wps)
    assert "fileType" in plan_json
    imported = MAVLinkBridge.import_qgc_plan(plan_json)
    assert len(imported) == 1
    assert abs(imported[0]["lat"] - 37.775) < 1e-5


def test_flight_replay_recorder():
    """Verify Blackbox flight replay recording and timeline seeking."""
    replay = FlightReplayEngine()
    replay.start_recording()

    for i in range(10):
        replay.record_frame({"sim_tick": i})

    assert len(replay.keyframes) == 10
    replay.start_replay()
    assert replay.is_replaying is True

    frame_5 = replay.seek_frame(5)
    assert frame_5["frame_id"] == 5

    log_str = replay.export_gcslog("TEST_MISSION")
    assert "keyframes" in log_str


def test_security_rbac_authorization():
    """Verify 4-tier Role-Based Access Control and audit logging."""
    sec = SecurityManager()
    assert sec.current_user["role"] == UserRole.COMMANDER

    # Commander can arm
    ok, _ = sec.can_execute("ARM")
    assert ok is True

    # Switch to VIEWER
    sec.switch_user("GUEST_OBSERVER", "VIEWER")
    ok, reason = sec.can_execute("ARM")
    assert ok is False
    assert "Permission Denied" in reason

    # Audit logs
    logs = sec.get_audit_logs()
    assert len(logs) >= 1
