"""
SUTRA GCS — Drone State & 6-DOF Kinematics Model
"""

import time
import math
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


class DroneModel:
    """Represents a single tactical UAV in the SUTRA swarm."""

    def __init__(self, drone_id: str, callsign: str, home_lat: float, home_lon: float, home_alt: float = 45.0):
        self.drone_id = drone_id
        self.callsign = callsign
        self.home_lat = home_lat
        self.home_lon = home_lon
        self.home_alt = home_alt

        # Telemetry State
        self.armed = False
        self.mode = "MANUAL"
        self.lat = home_lat
        self.lon = home_lon
        self.alt_msl = home_alt
        self.alt_agl = 0.0
        self.roll_deg = 0.0
        self.pitch_deg = 0.0
        self.yaw_deg = 0.0
        self.ground_speed = 0.0
        self.air_speed = 0.0
        self.climb_rate = 0.0
        self.battery_pct = 100.0
        self.battery_voltage = 25.2
        self.battery_current = 0.0
        self.motor_rpms = [0, 0, 0, 0]
        self.satellites = 18

    def to_dict(self) -> Dict[str, Any]:
        return {
            "drone_id": self.drone_id,
            "callsign": self.callsign,
            "armed": self.armed,
            "mode": self.mode,
            "lat": self.lat,
            "lon": self.lon,
            "alt_msl": round(self.alt_msl, 2),
            "alt_agl": round(self.alt_agl, 2),
            "roll": round(self.roll_deg, 1),
            "pitch": round(self.pitch_deg, 1),
            "yaw": round(self.yaw_deg, 1),
            "heading": int(self.yaw_deg % 360),
            "ground_speed": round(self.ground_speed, 1),
            "air_speed": round(self.air_speed, 1),
            "climb_rate": round(self.climb_rate, 2),
            "battery_pct": round(self.battery_pct, 1),
            "battery_voltage": round(self.battery_voltage, 2),
            "battery_current": round(self.battery_current, 1),
            "motor_rpms": self.motor_rpms,
            "satellites": self.satellites
        }
