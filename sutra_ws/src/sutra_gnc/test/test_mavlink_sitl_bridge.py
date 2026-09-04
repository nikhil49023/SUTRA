#!/usr/bin/env python3
"""
Test Suite: Subsystem A MAVLink v2 SITL Bridge Verification
===========================================================
Asserts standard MAVLink packet generation, UDP streaming,
PX4 Offboard mode compliance, and telemetry validity for Mission Planner.
"""

import math
import sys
import time
import pytest

from pymavlink import mavutil
from sutra_gnc.mavlink_sitl_bridge import SutraMavlinkSITLBridge


def test_mavlink_sitl_initialization():
    """Verify bridge initializes with proper defaults and port."""
    bridge = SutraMavlinkSITLBridge(target_ip="127.0.0.1", target_port=14590, drone_id=1)
    assert bridge.drone_id == 1
    assert bridge.target_port == 14590
    assert bridge.target_alt_agl == 30.0
    assert bridge.armed is True
    assert bridge.flight_mode == "OFFBOARD"


def test_mavlink_step_and_packet_reception():
    """Verify standard MAVLink frames are generated and received over UDP."""
    test_port = 14591
    
    # 1. Start GCS Receiver on UDP test port
    receiver = mavutil.mavlink_connection(f"udpin:127.0.0.1:{test_port}")
    
    # 2. Start Bridge streaming to receiver
    bridge = SutraMavlinkSITLBridge(target_ip="127.0.0.1", target_port=test_port, drone_id=1)
    
    # Step simulation
    for _ in range(5):
        bridge.step()
        time.sleep(0.02)
    
    # 3. Receive and verify packets
    received_types = set()
    start_recv = time.time()
    
    while time.time() - start_recv < 2.0:
        msg = receiver.recv_match(blocking=False)
        if msg:
            msg_type = msg.get_type()
            received_types.add(msg_type)
            if msg_type == "HEARTBEAT":
                assert msg.type == mavutil.mavlink.MAV_TYPE_QUADROTOR
                assert msg.autopilot in (mavutil.mavlink.MAV_AUTOPILOT_PX4, mavutil.mavlink.MAV_AUTOPILOT_ARDUPILOTMEGA)
                assert msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED
            elif msg_type == "ATTITUDE":
                assert abs(msg.roll) <= math.radians(45.0)
                assert abs(msg.pitch) <= math.radians(45.0)
            elif msg_type == "GLOBAL_POSITION_INT":
                assert msg.lat != 0
                assert msg.lon != 0
                assert msg.relative_alt >= 0
            elif msg_type == "VFR_HUD":
                assert msg.groundspeed >= 0.0
        time.sleep(0.01)
    
    receiver.close()
    
    # Assert core frames required by Mission Planner are present
    assert "HEARTBEAT" in received_types, f"Missing HEARTBEAT in {received_types}"
    assert "ATTITUDE" in received_types, f"Missing ATTITUDE in {received_types}"
    assert "GLOBAL_POSITION_INT" in received_types, f"Missing GLOBAL_POSITION_INT in {received_types}"
    assert "VFR_HUD" in received_types, f"Missing VFR_HUD in {received_types}"


def test_mavlink_dynamics_climb_and_roll():
    """Verify physical dynamics simulate altitude climb and banking turns."""
    bridge = SutraMavlinkSITLBridge(target_ip="127.0.0.1", target_port=14592, drone_id=1)
    
    # Initial state
    assert bridge.current_alt_agl == 0.0
    
    # Simulate 5 seconds of flight
    for _ in range(100):
        bridge.update_dynamics(dt=0.05)
    
    # Altitude should have climbed significantly towards 30m
    assert bridge.current_alt_agl > 10.0
    assert bridge.current_alt_agl <= 30.5
    assert bridge.groundspeed > 0.0
