"""
SUTRA Fleet Manager — Multi-Drone Swarm Coordinator & Simulation Loop
Subsystem A & D: Tactical Fleet Telemetry & Swarm Formation Generator
"""

import math
import time
import threading
from typing import Dict, List, Any, Optional
from gnc_engine import DroneGNC, FlightMode, CoordinateTransform, ORCA3DAvoidance


class FleetManager:
    """
    Coordinates the multi-UAV tactical swarm, steps real-time physics at 20 Hz,
    dispatches swarm formations, and synchronizes fleet telemetry.
    """

    def __init__(self, origin_lat: float = 37.774929, origin_lon: float = -122.419416):
        self.origin_lat = origin_lat
        self.origin_lon = origin_lon
        self.transformer = CoordinateTransform(origin_lat, origin_lon, 0.0)

        # 4 Tactical Drones in the Swarm
        self.drones: Dict[str, DroneGNC] = {}
        self._init_default_swarm()

        self.selected_drone_id = "drone_alpha"
        self.is_running = True
        self.lock = threading.Lock()

        # Start 20 Hz simulation background thread
        self.sim_thread = threading.Thread(target=self._simulation_worker, daemon=True)
        self.sim_thread.start()

    def _init_default_swarm(self) -> None:
        """Initialize Alpha, Bravo, Charlie, Delta at tactical standoff staging positions."""
        fleet_configs = [
            ("drone_alpha", "SUTRA Alpha (Recon Lead)", 0.0, 0.0, 0.0),
            ("drone_bravo", "SUTRA Bravo (SAR Flanker Left)", -10.0, -10.0, 0.0),
            ("drone_charlie", "SUTRA Charlie (SAR Flanker Right)", -10.0, 10.0, 0.0),
            ("drone_delta", "SUTRA Delta (High-Alt Relay)", -20.0, 0.0, 0.0),
        ]

        for drone_id, name, north_m, east_m, down_m in fleet_configs:
            lat, lon, _ = self.transformer.ned_to_wgs84(north_m, east_m, down_m)
            drone = DroneGNC(
                drone_id=drone_id,
                name=name,
                initial_lat=lat,
                initial_lon=lon,
                initial_alt=0.0,
                cruise_speed=5.0,
                transformer=self.transformer
            )
            drone.pos_ned = [north_m, east_m, down_m]
            self.drones[drone_id] = drone

    def _simulation_worker(self) -> None:
        """20 Hz high-fidelity real-time physics & GNC step loop."""
        dt = 0.05  # 50ms per tick (20 Hz)
        while self.is_running:
            start_t = time.time()
            with self.lock:
                # Gather all agent positions for ORCA 3D avoidance
                all_states = {
                    d_id: (
                        (d.pos_ned[0], d.pos_ned[1], d.pos_ned[2]),
                        (d.vel_ned[0], d.vel_ned[1], d.vel_ned[2])
                    )
                    for d_id, d in self.drones.items() if d.armed
                }

                # Update physics for each UAV
                for d_id, drone in self.drones.items():
                    # Extract neighbors excluding self
                    neighbors = [
                        state for other_id, state in all_states.items()
                        if other_id != d_id
                    ]
                    drone.update_physics(dt, neighbors)

            elapsed = time.time() - start_t
            sleep_time = max(0.001, dt - elapsed)
            time.sleep(sleep_time)

    def get_drone(self, drone_id: str) -> Optional[DroneGNC]:
        return self.drones.get(drone_id)

    def get_selected_drone(self) -> DroneGNC:
        return self.drones.get(self.selected_drone_id, list(self.drones.values())[0])

    def set_selected_drone(self, drone_id: str) -> bool:
        if drone_id in self.drones:
            self.selected_drone_id = drone_id
            return True
        return False

    def arm_all(self) -> None:
        with self.lock:
            for drone in self.drones.values():
                drone.arm()

    def disarm_all(self) -> None:
        with self.lock:
            for drone in self.drones.values():
                drone.disarm()

    def takeoff_all(self, altitude: float = 15.0) -> None:
        with self.lock:
            for drone in self.drones.values():
                drone.set_mode(FlightMode.TAKEOFF)

    def rtl_all(self) -> None:
        with self.lock:
            for drone in self.drones.values():
                drone.set_mode(FlightMode.RTL)

    def emergency_stop_all(self) -> None:
        with self.lock:
            for drone in self.drones.values():
                drone.set_mode(FlightMode.EMERGENCY)

    def apply_swarm_formation(self, formation_type: str, center_lat: float, center_lon: float, altitude: float = 20.0) -> None:
        """
        Generate coordinated multi-drone waypoint patterns:
        - 'V_FORMATION': Tactical wedge
        - 'GRID_SEARCH': Lawnmower search & rescue coverage
        - 'PERIMETER_BOX': Encirclement boundary
        - 'LINE_SWEEP': Parallel synchronized sweep
        """
        with self.lock:
            c_north, c_east, _ = self.transformer.wgs84_to_ned(center_lat, center_lon, altitude)

            if formation_type.upper() == "V_FORMATION":
                offsets = {
                    "drone_alpha": (0.0, 0.0),       # Leader apex
                    "drone_bravo": (-15.0, -15.0),   # Left wing
                    "drone_charlie": (-15.0, 15.0),  # Right wing
                    "drone_delta": (-30.0, 0.0),     # Rear trail
                }
                for d_id, (dn, de) in offsets.items():
                    if d_id in self.drones:
                        lat, lon, _ = self.transformer.ned_to_wgs84(c_north + dn, c_east + de, -altitude)
                        self.drones[d_id].add_waypoints([
                            {"lat": lat, "lon": lon, "alt": altitude, "speed": 5.0}
                        ])
                        self.drones[d_id].set_mode(FlightMode.WAYPOINT_NAV)

            elif formation_type.upper() == "GRID_SEARCH":
                # Divide area into 4 parallel search corridors
                spacing = 20.0
                for idx, (d_id, drone) in enumerate(self.drones.items()):
                    lane_offset_e = (idx - 1.5) * spacing
                    wps = []
                    for leg in [(0, 0), (60, 0), (60, 15), (0, 15), (0, 30), (60, 30)]:
                        wp_n = c_north + leg[0]
                        wp_e = c_east + lane_offset_e + leg[1]
                        lat, lon, _ = self.transformer.ned_to_wgs84(wp_n, wp_e, -altitude)
                        wps.append({"lat": lat, "lon": lon, "alt": altitude, "speed": 4.5})
                    drone.add_waypoints(wps)
                    drone.set_mode(FlightMode.WAYPOINT_NAV)

            elif formation_type.upper() == "PERIMETER_BOX":
                # Box corners
                radius = 35.0
                corners = [
                    (radius, radius),
                    (radius, -radius),
                    (-radius, -radius),
                    (-radius, radius)
                ]
                for idx, (d_id, drone) in enumerate(self.drones.items()):
                    # Stagger start corner
                    reordered = corners[idx:] + corners[:idx] + [corners[idx]]
                    wps = []
                    for cn, ce in reordered:
                        lat, lon, _ = self.transformer.ned_to_wgs84(c_north + cn, c_east + ce, -altitude)
                        wps.append({"lat": lat, "lon": lon, "alt": altitude, "speed": 5.0})
                    drone.add_waypoints(wps)
                    drone.set_mode(FlightMode.WAYPOINT_NAV)

    def get_fleet_telemetry(self) -> Dict[str, Any]:
        """Aggregate telemetry for all drones in the swarm."""
        with self.lock:
            return {
                "timestamp": round(time.time(), 3),
                "selected_drone_id": self.selected_drone_id,
                "fleet_count": len(self.drones),
                "drones": {d_id: drone.to_dict() for d_id, drone in self.drones.items()}
            }
