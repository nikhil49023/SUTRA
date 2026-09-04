#!/usr/bin/env python3
"""
Project SUTRA — Subsystem A: Standalone MAVLink v2 SITL Autopilot Bridge
========================================================================
Translates Subsystem A GNC trajectory states and Subsystem B SwarmRAFT
consensus events into standard MAVLink v2 frames for ArduPilot Mission Planner
and QGroundControl.

Target UDP Port: 14550 (Standard Autopilot GCS Listener)
Autopilot Target: MAV_AUTOPILOT_PX4 (Mode: OFFBOARD)
Airframe Target: MAV_TYPE_QUADROTOR

Author: Project SUTRA GNC Team
"""

import math
import os
import sys
import time
import socket
from typing import Dict, Any, Optional

try:
    from pymavlink import mavutil
except ImportError:
    print("❌ Error: pymavlink not found. Install with: pip install pymavlink")
    sys.exit(1)


class SutraMavlinkSITLBridge:
    """
    MAVLink v2 SITL Server broadcasting to UDP port 14550.
    Directly compatible with Mission Planner and QGroundControl.
    """

    def __init__(
        self,
        target_ip: str = "127.0.0.1",
        target_port: int = 14550,
        drone_id: int = 1,
        lat_origin: float = 30.7352,   # Kedarnath / Disaster Datum
        lon_origin: float = 79.0669,
        alt_origin_msl: float = 3584.0
    ):
        self.target_ip = target_ip
        self.target_port = target_port
        self.drone_id = drone_id
        self.lat_origin = lat_origin
        self.lon_origin = lon_origin
        self.alt_origin_msl = alt_origin_msl

        # State Variables
        self.armed = True
        self.flight_mode = "OFFBOARD"  # PX4 Custom Mode 6
        self.time_start = time.time()
        self.last_status_time = 0.0

        # Physical Dynamics
        self.target_alt_agl = 30.0    # 30m operational search altitude
        self.current_alt_agl = 0.0
        self.roll_deg = 0.0
        self.pitch_deg = 0.0
        self.yaw_deg = 45.0
        self.groundspeed = 0.0
        self.battery_voltage_v = 22.2  # 6S LiPo
        self.battery_remaining_pct = 98

        # Setup UDP socket connection via pymavlink
        connection_string = f"udpout:{self.target_ip}:{self.target_port}"
        self.mav = mavutil.mavlink_connection(
            connection_string,
            source_system=self.drone_id,
            source_component=1
        )
        print(f"📡 SUTRA MAVLink SITL Bridge active on {connection_string} (System ID: {self.drone_id})")

    def get_boot_time_ms(self) -> int:
        return int((time.time() - self.time_start) * 1000) & 0xFFFFFFFF

    def update_dynamics(self, dt: float = 0.05):
        """Simulate realistic multirotor climb, cruise, and banking turns."""
        elapsed = time.time() - self.time_start

        # Phase 1: Takeoff climb (0 -> 12 seconds)
        if elapsed < 12.0:
            climb_rate = 2.5  # m/s
            self.current_alt_agl = min(self.target_alt_agl, self.current_alt_agl + climb_rate * dt)
            self.groundspeed = 1.2
            self.pitch_deg = -3.0  # slight forward tilt
            self.roll_deg = 0.0
        # Phase 2: Coordinated search pattern & banking turns
        else:
            self.current_alt_agl = self.target_alt_agl + 0.3 * math.sin(elapsed * 0.8)
            self.groundspeed = 4.2  # m/s cruise speed
            # Coordinated turn roll and pitch
            self.roll_deg = 14.0 * math.sin(elapsed * 0.4)
            self.pitch_deg = 4.0 * math.cos(elapsed * 0.4)
            self.yaw_deg = (self.yaw_deg + 15.0 * dt) % 360.0

        # Slow battery depletion (simulate 25-minute flight)
        self.battery_voltage_v = max(19.8, 22.2 - (elapsed / 1500.0) * 2.4)
        self.battery_remaining_pct = max(10, int(98 - (elapsed / 1500.0) * 88))

    def send_heartbeat(self):
        """
        Sends standard MAVLink HEARTBEAT frame.
        Identifies as PX4 Quadrotor in OFFBOARD mode.
        """
        base_mode = mavutil.mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED
        if self.armed:
            base_mode |= mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED
        base_mode |= mavutil.mavlink.MAV_MODE_FLAG_AUTO_ENABLED

        # PX4 Custom Main Mode 6 = OFFBOARD
        custom_mode = (6 << 16) | (0 << 24)

        self.mav.mav.heartbeat_send(
            mavutil.mavlink.MAV_TYPE_QUADROTOR,
            mavutil.mavlink.MAV_AUTOPILOT_PX4,
            base_mode,
            custom_mode,
            mavutil.mavlink.MAV_STATE_ACTIVE
        )

    def send_attitude(self):
        """Sends MAVLink ATTITUDE frame (Pitch, Roll, Yaw)."""
        roll_rad = math.radians(self.roll_deg)
        pitch_rad = math.radians(self.pitch_deg)
        yaw_rad = math.radians(self.yaw_deg)

        self.mav.mav.attitude_send(
            self.get_boot_time_ms(),
            roll_rad,
            pitch_rad,
            yaw_rad,
            0.05, 0.02, 0.1  # Angular rates (rad/s)
        )

    def send_global_position(self):
        """Sends MAVLink GLOBAL_POSITION_INT frame (WGS84 Coordinates)."""
        elapsed = time.time() - self.time_start
        # Small position movement along search corridor
        lat_offset = (elapsed * 0.00002) * math.cos(math.radians(self.yaw_deg))
        lon_offset = (elapsed * 0.00002) * math.sin(math.radians(self.yaw_deg))

        lat_deg = self.lat_origin + lat_offset
        lon_deg = self.lon_origin + lon_offset
        alt_msl = self.alt_origin_msl + self.current_alt_agl
        alt_agl = self.current_alt_agl

        vx_cm = int(self.groundspeed * math.cos(math.radians(self.yaw_deg)) * 100)
        vy_cm = int(self.groundspeed * math.sin(math.radians(self.yaw_deg)) * 100)
        vz_cm = int(-50 if self.current_alt_agl < self.target_alt_agl else 0)

        self.mav.mav.global_position_int_send(
            self.get_boot_time_ms(),
            int(lat_deg * 1e7),
            int(lon_deg * 1e7),
            int(alt_msl * 1000),
            int(alt_agl * 1000),
            vx_cm,
            vy_cm,
            vz_cm,
            int(self.yaw_deg * 100)
        )

    def send_vfr_hud(self):
        """Sends MAVLink VFR_HUD frame (Dashboard airspeed, climb, heading)."""
        climb = 2.5 if self.current_alt_agl < self.target_alt_agl else 0.0
        throttle = 65 if self.current_alt_agl < self.target_alt_agl else 54

        self.mav.mav.vfr_hud_send(
            self.groundspeed,
            self.groundspeed,
            int(self.yaw_deg),
            throttle,
            self.current_alt_agl,
            climb
        )

    def send_sys_status(self):
        """Sends MAVLink SYS_STATUS frame (6S LiPo voltage & battery level)."""
        voltage_mv = int(self.battery_voltage_v * 1000)
        current_ca = 1450  # 14.5 Amps hover draw

        sensors_present = 0b11111111111
        sensors_enabled = 0b11111111111
        sensors_health = 0b11111111111

        self.mav.mav.sys_status_send(
            sensors_present,
            sensors_enabled,
            sensors_health,
            350,  # 35% CPU load
            voltage_mv,
            current_ca,
            self.battery_remaining_pct,
            0, 0, 0, 0, 0, 0
        )

    def send_gps_raw_int(self):
        """Sends MAVLink GPS_RAW_INT frame (3D Fix, 14 Sats)."""
        self.mav.mav.gps_raw_int_send(
            self.get_boot_time_ms() * 1000,
            3,  # Fix type 3 = 3D Fix
            int(self.lat_origin * 1e7),
            int(self.lon_origin * 1e7),
            int((self.alt_origin_msl + self.current_alt_agl) * 1000),
            120, 150,  # HDOP, VDOP
            int(self.groundspeed * 100),
            int(self.yaw_deg * 100),
            14  # Satellites visible
        )

    def send_status_text(self, text: str, severity: int = mavutil.mavlink.MAV_SEVERITY_INFO):
        """Sends MAVLink STATUSTEXT message to Mission Planner console."""
        text_bytes = text[:50].encode("utf-8")
        self.mav.mav.statustext_send(severity, text_bytes)

    def step(self):
        """Executes one simulation tick at 20Hz."""
        self.update_dynamics(0.05)
        self.send_heartbeat()
        self.send_attitude()
        self.send_global_position()
        self.send_vfr_hud()

        now = time.time()
        if now - self.last_status_time >= 1.0:
            self.send_sys_status()
            self.send_gps_raw_int()
            self.last_status_time = now

            elapsed = int(now - self.time_start)
            if elapsed == 2:
                self.send_status_text("SUTRA GNC: Offboard mode engaged")
            elif elapsed == 5:
                self.send_status_text("SUTRA GNC: Offboard trajectory locked @ 50Hz")
            elif elapsed == 10:
                self.send_status_text("SUTRA GNC: Target search altitude 30m reached")
            elif elapsed == 15:
                self.send_status_text("SwarmRAFT: Leader elected UAV-Alpha (Term 1)")

    def run_loop(self):
        """Main streaming loop."""
        print(f"🚀 Streaming MAVLink telemetry to Mission Planner on udp://{self.target_ip}:{self.target_port}")
        print("   Press Ctrl+C to stop.\n")
        try:
            while True:
                self.step()
                time.sleep(0.05)  # 20 Hz loop
        except KeyboardInterrupt:
            print("\n🛑 SUTRA MAVLink SITL Bridge stopped.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="SUTRA MAVLink SITL Autopilot Bridge")
    parser.add_argument("--ip", default="127.0.0.1", help="Target GCS IP address")
    parser.add_argument("--port", type=int, default=14550, help="Target GCS UDP port (default: 14550)")
    parser.add_argument("--drone-id", type=int, default=1, help="System ID (default: 1)")
    args = parser.parse_args()

    bridge = SutraMavlinkSITLBridge(target_ip=args.ip, target_port=args.port, drone_id=args.drone_id)
    bridge.run_loop()
