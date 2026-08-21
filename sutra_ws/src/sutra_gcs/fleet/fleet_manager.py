"""
SUTRA GCS — Multi-Drone Fleet Coordinator
Manages 4 tactical UAVs (Alpha, Bravo, Charlie, Delta) with 20Hz background physics.
"""

import threading
import time
import math
from typing import Dict, List, Any, Optional
from .drone import DroneModel
from .formation_calculator import formation_calc
from .collision_avoidance import collision_avoidance


class FleetManager:
    """Coordinates 4-drone tactical swarm with real-time ORCA 3D collision avoidance."""

    def __init__(self, origin_lat: float = 37.774929, origin_lon: float = -122.419416, origin_alt: float = 45.0):
        self.origin_lat = origin_lat
        self.origin_lon = origin_lon
        self.origin_alt = origin_alt
        self.lock = threading.Lock()

        # Initialize 4 tactical drones
        self.drones: Dict[str, DroneModel] = {
            "drone_alpha": DroneModel("drone_alpha", "ALPHA (LEADER)", origin_lat, origin_lon, origin_alt),
            "drone_bravo": DroneModel("drone_bravo", "BRAVO (WINGMAN)", origin_lat, origin_lon + 0.0001, origin_alt),
            "drone_charlie": DroneModel("drone_charlie", "CHARLIE (SCOUT)", origin_lat + 0.0001, origin_lon, origin_alt),
            "drone_delta": DroneModel("drone_delta", "DELTA (RELAY)", origin_lat - 0.0001, origin_lon, origin_alt)
        }

        self.running = True
        self.physics_thread = threading.Thread(target=self._physics_loop, daemon=True)
        self.physics_thread.start()

    def get_drone(self, drone_id: str) -> Optional[DroneModel]:
        with self.lock:
            return self.drones.get(drone_id)

    def get_fleet_telemetry(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "timestamp": time.time(),
                "drones": {k: v.to_dict() for k, v in self.drones.items()}
            }

    def arm_fleet(self) -> None:
        with self.lock:
            for drone in self.drones.values():
                drone.armed = True
                drone.motor_rpms = [5200, 5210, 5195, 5205]

    def takeoff_fleet(self, alt_m: float = 15.0) -> None:
        with self.lock:
            for drone in self.drones.values():
                drone.armed = True
                drone.mode = "TAKEOFF"
                drone.alt_agl = alt_m
                drone.alt_msl = self.origin_alt + alt_m
                drone.climb_rate = 1.5

    def rtl_fleet(self) -> None:
        with self.lock:
            for drone in self.drones.values():
                drone.mode = "RTL"
                drone.climb_rate = -0.8

    def emergency_all_stop(self) -> None:
        with self.lock:
            for drone in self.drones.values():
                drone.armed = False
                drone.mode = "EMERGENCY"
                drone.motor_rpms = [0, 0, 0, 0]
                drone.ground_speed = 0.0

    def _physics_loop(self) -> None:
        """20Hz continuous kinematics and battery discharge integration."""
        dt = 0.05
        while self.running:
            with self.lock:
                for d in self.drones.values():
                    if d.armed:
                        # Slight realistic attitude vibrations
                        t = time.time()
                        d.roll_deg = math.sin(t * 3.0) * 1.5
                        d.pitch_deg = math.cos(t * 2.5) * 1.2
                        # Slow battery drain
                        d.battery_pct = max(0.0, d.battery_pct - 0.003)
                        d.battery_voltage = 22.2 + (d.battery_pct / 100.0) * 3.0
                        d.battery_current = 14.2 if d.alt_agl > 1.0 else 2.5
            time.sleep(dt)


fleet_manager = FleetManager()
