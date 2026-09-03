"""
Smart Horizon GCS — Telemetry State Model
Subsystem: State Management
"""

import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class TelemetryState:
    """
    Type-safe immutable representation of real-time aircraft telemetry.
    """

    drone_id: str = "drone_alpha"
    timestamp: float = field(default_factory=time.time)
    latitude: float = 0.0
    longitude: float = 0.0
    altitude_msl: float = 0.0
    altitude_agl: float = 0.0
    ground_speed: float = 0.0
    air_speed: float = 0.0
    heading: float = 0.0
    pitch: float = 0.0
    roll: float = 0.0
    yaw: float = 0.0
    vertical_speed: float = 0.0
    battery_percent: float = 100.0
    battery_voltage: float = 25.2
    battery_current: float = 0.0
    temperature: float = 25.0
    satellites: int = 0
    hdop: float = 1.0
    gps_fix: int = 3
    rssi: float = -60.0
    latency_ms: float = 10.0
    flight_mode: str = "MANUAL"

    def is_valid(self) -> bool:
        """Returns True if the telemetry packet has valid non-zero geodetic fix."""
        return abs(self.latitude) > 0.0001 or abs(self.longitude) > 0.0001

    @property
    def gps_satellites(self) -> int:
        return self.satellites

    @property
    def rssi_percent(self) -> float:
        if self.rssi <= 0:
            return max(0.0, min(100.0, (self.rssi + 100.0) * 2.0))
        return self.rssi


telemetry_state = TelemetryState()
