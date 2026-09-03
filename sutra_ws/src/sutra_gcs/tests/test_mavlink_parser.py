"""
Smart Horizon GCS — MAVLink v2 Parser Unit Tests
Subsystem: Test Suite (Phase 8)
"""

import pytest
from communication.mavlink.mavlink_parser import MAVLinkParser


def test_mavlink_parser_global_position():
    """Verify GLOBAL_POSITION_INT frame decoding into geodetic degrees and meters."""
    raw = {
        "lat": 377749290,
        "lon": -1224194160,
        "alt": 65000,
        "relative_alt": 25000,
        "hdg": 9000,
        "vx": 400,
        "vy": 300,
        "vz": -100,
    }

    parsed = MAVLinkParser.parse_frame("GLOBAL_POSITION_INT", raw)
    assert abs(parsed["lat"] - 37.774929) < 1e-6
    assert abs(parsed["lon"] - (-122.419416)) < 1e-6
    assert parsed["alt_msl"] == 65.0
    assert parsed["alt_agl"] == 25.0
    assert parsed["heading"] == 90.0
    assert parsed["ground_speed"] == 5.0  # sqrt(4^2 + 3^2)
    assert parsed["climb_rate"] == 1.0


def test_mavlink_parser_heartbeat_and_attitude():
    """Verify HEARTBEAT arming status and ATTITUDE angles."""
    hb_raw = {"type": 2, "autopilot": 12, "base_mode": 128, "custom_mode": 4}
    hb_parsed = MAVLinkParser.parse_frame("HEARTBEAT", hb_raw)
    assert hb_parsed["armed"] is True
    assert hb_parsed["autopilot"] == 12

    att_raw = {"roll": 5.0, "pitch": -2.5, "yaw": 180.0}
    att_parsed = MAVLinkParser.parse_frame("ATTITUDE", att_raw)
    assert att_parsed["roll_deg"] == 5.0
    assert att_parsed["pitch_deg"] == -2.5
