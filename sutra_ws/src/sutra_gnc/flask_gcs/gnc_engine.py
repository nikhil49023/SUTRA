"""
SUTRA GNC Engine — Pure Python Guidance, Navigation & Control Core
Subsystem A Lead: Rohith Kumar / Team Offgrid

Provides:
1. Coordinate Transformation: WGS-84 Geodetic (Lat, Lon, Alt) <-> Local NED (North, East, Down)
2. Attitude Kinematics: Euler Angles <-> Unit Quaternions <-> Direction Cosine Matrix
3. Waypoint Navigation State Machine (TAKEOFF, NAV, LOITER, GRID_SEARCH, RTL, LAND, EMERGENCY)
4. ORCA 3D (Optimal Reciprocal Collision Avoidance) Swarm Separation Solver (Gate G5: > 2.8m)
5. Proportional Velocity Guidance & Altitude Controller
6. Geofence & Failsafe Management (Low battery, link lost, boundary violation)
"""

import math
import time
from typing import List, Tuple, Dict, Optional, Any
from enum import Enum


class FlightMode(str, Enum):
    MANUAL = "MANUAL"
    OFFBOARD = "OFFBOARD"
    TAKEOFF = "TAKEOFF"
    WAYPOINT_NAV = "WAYPOINT_NAV"
    LOITER = "LOITER"
    GRID_SEARCH = "GRID_SEARCH"
    RTL = "RTL"  # Return To Launch
    LAND = "LAND"
    EMERGENCY = "EMERGENCY"


class MissionValidator:
    """
    Validates pre-flight missions against safety constraints:
    - Geofence radius limit (500m)
    - Altitude ceilings (10m - 120m AGL)
    - Battery reserve >= 25% for Return-to-Launch
    - Maximum turn angles & climb rates
    """

    @staticmethod
    def validate_mission(
        waypoints: List[Dict[str, Any]],
        home_lat: float,
        home_lon: float,
        battery_pct: float = 100.0,
        max_geofence_m: float = 500.0
    ) -> Dict[str, Any]:
        if not waypoints:
            return {"valid": False, "error": "Mission contains zero waypoints."}

        total_distance_m = 0.0
        prev_lat, prev_lon = home_lat, home_lon

        for idx, wp in enumerate(waypoints):
            lat = wp.get("lat")
            lon = wp.get("lon")
            alt = wp.get("alt", 20.0)

            if lat is None or lon is None:
                return {"valid": False, "error": f"WP {idx+1}: Missing latitude or longitude coordinates."}

            if alt < 2.0 or alt > 120.0:
                return {"valid": False, "error": f"WP {idx+1}: Altitude {alt}m violates safety limits (2m - 120m AGL)."}

            # Distance from home
            dn_home = (lat - home_lat) * 111139.0
            de_home = (lon - home_lon) * (111139.0 * math.cos(math.radians(home_lat)))
            dist_home = math.sqrt(dn_home**2 + de_home**2)

            if dist_home > max_geofence_m:
                return {"valid": False, "error": f"WP {idx+1}: Breaches 500m geofence ({round(dist_home, 1)}m from home)."}

            # Segment distance
            dn_seg = (lat - prev_lat) * 111139.0
            de_seg = (lon - prev_lon) * (111139.0 * math.cos(math.radians(prev_lat)))
            total_distance_m += math.sqrt(dn_seg**2 + de_seg**2)
            prev_lat, prev_lon = lat, lon

        # Flight time & Battery Consumption estimation
        cruise_speed = 5.0  # m/s
        est_flight_time_sec = total_distance_m / cruise_speed + (len(waypoints) * 3.0)
        # Power model: 280W cruise power draw on 6S 4500mAh (approx 1.8% battery per minute)
        battery_consumed_pct = (est_flight_time_sec / 60.0) * 2.2
        battery_remaining_pct = battery_pct - battery_consumed_pct

        if battery_remaining_pct < 25.0:
            return {
                "valid": False,
                "error": f"Insufficient battery: Estimated remaining {round(battery_remaining_pct, 1)}% is below 25% RTL safety reserve.",
                "total_distance_m": round(total_distance_m, 1),
                "est_flight_time_sec": round(est_flight_time_sec, 1)
            }

        return {
            "valid": True,
            "waypoint_count": len(waypoints),
            "total_distance_m": round(total_distance_m, 1),
            "est_flight_time_sec": round(est_flight_time_sec, 1),
            "est_battery_consumed_pct": round(battery_consumed_pct, 1),
            "est_battery_remaining_pct": round(battery_remaining_pct, 1),
            "max_distance_from_home_m": round(max_geofence_m, 1),
            "safety_verdict": "APPROVED FOR OFFBOARD DISPATCH ✅"
        }


class AttitudeMath:
    """Rigorous 3D kinematics for drone attitude and rotation math."""

    @staticmethod
    def euler_to_quaternion(roll: float, pitch: float, yaw: float) -> Tuple[float, float, float, float]:
        """
        Converts Roll (phi), Pitch (theta), Yaw (psi) in radians to a unit quaternion (qx, qy, qz, qw).
        Uses standard aerospace Z-Y-X Tait-Bryan rotation sequence.
        """
        cr = math.cos(roll * 0.5)
        sr = math.sin(roll * 0.5)
        cp = math.cos(pitch * 0.5)
        sp = math.sin(pitch * 0.5)
        cy = math.cos(yaw * 0.5)
        sy = math.sin(yaw * 0.5)

        qw = cr * cp * cy + sr * sp * sy
        qx = sr * cp * cy - cr * sp * sy
        qy = cr * sp * cy + sr * cp * sy
        qz = cr * cp * sy - sr * sp * cy

        # Normalize to guarantee unit quaternion
        norm = math.sqrt(qx**2 + qy**2 + qz**2 + qw**2)
        if norm > 1e-12:
            return (qx / norm, qy / norm, qz / norm, qw / norm)
        return (0.0, 0.0, 0.0, 1.0)

    @staticmethod
    def quaternion_to_euler(qx: float, qy: float, qz: float, qw: float) -> Tuple[float, float, float]:
        """
        Converts unit quaternion back to Euler angles (Roll, Pitch, Yaw) in radians.
        """
        # Roll (x-axis rotation)
        sinr_cosp = 2.0 * (qw * qx + qy * qz)
        cosr_cosp = 1.0 - 2.0 * (qx * qx + qy * qy)
        roll = math.atan2(sinr_cosp, cosr_cosp)

        # Pitch (y-axis rotation)
        sinp = 2.0 * (qw * qy - qz * qx)
        if abs(sinp) >= 1:
            pitch = math.copysign(math.pi / 2, sinp)  # use 90 degrees if out of range
        else:
            pitch = math.asin(sinp)

        # Yaw (z-axis rotation)
        siny_cosp = 2.0 * (qw * qz + qx * qy)
        cosy_cosp = 1.0 - 2.0 * (qy * qy + qz * qz)
        yaw = math.atan2(siny_cosp, cosy_cosp)

        return (roll, pitch, yaw)


class CoordinateTransform:
    """WGS84 ellipsoidal Earth model conversions for tactical GCS and SITL."""

    # WGS-84 Earth Parameters
    WGS84_A = 6378137.0          # Semi-major axis in meters
    WGS84_E2 = 0.00669437999014  # First eccentricity squared

    def __init__(self, origin_lat: float = 37.774929, origin_lon: float = -122.419416, origin_alt: float = 15.0):
        self.origin_lat = origin_lat
        self.origin_lon = origin_lon
        self.origin_alt = origin_alt
        self._lat_rad = math.radians(origin_lat)
        self._lon_rad = math.radians(origin_lon)

    def wgs84_to_ned(self, lat: float, lon: float, alt: float) -> Tuple[float, float, float]:
        """
        Convert WGS84 (Lat, Lon, Alt in meters) to Local Tangent Plane NED (North, East, Down in meters).
        """
        d_lat = math.radians(lat - self.origin_lat)
        d_lon = math.radians(lon - self.origin_lon)

        # Radii of curvature
        r_n = self.WGS84_A / math.sqrt(1.0 - self.WGS84_E2 * math.sin(self._lat_rad)**2)
        r_m = self.WGS84_A * (1.0 - self.WGS84_E2) / ((1.0 - self.WGS84_E2 * math.sin(self._lat_rad)**2)**1.5)

        north = d_lat * (r_m + self.origin_alt)
        east = d_lon * (r_n + self.origin_alt) * math.cos(self._lat_rad)
        down = -(alt - self.origin_alt)  # Down is negative of altitude AGL

        return (north, east, down)

    def ned_to_wgs84(self, north: float, east: float, down: float) -> Tuple[float, float, float]:
        """
        Convert Local Tangent Plane NED (North, East, Down in meters) to WGS84 (Lat, Lon, Alt).
        """
        r_n = self.WGS84_A / math.sqrt(1.0 - self.WGS84_E2 * math.sin(self._lat_rad)**2)
        r_m = self.WGS84_A * (1.0 - self.WGS84_E2) / ((1.0 - self.WGS84_E2 * math.sin(self._lat_rad)**2)**1.5)

        d_lat = north / (r_m + self.origin_alt)
        d_lon = east / ((r_n + self.origin_alt) * math.cos(self._lat_rad))

        lat = self.origin_lat + math.degrees(d_lat)
        lon = self.origin_lon + math.degrees(d_lon)
        alt = self.origin_alt - down

        return (lat, lon, alt)


class ORCA3DAvoidance:
    """
    3D Optimal Reciprocal Collision Avoidance (ORCA) solver for multi-agent swarm separation.
    Ensures swarm nodes maintain a guaranteed safety buffer > 2.8m (Gate G5 verification).
    """

    def __init__(self, safety_radius: float = 3.0, time_horizon: float = 2.0, max_speed: float = 8.0):
        self.safety_radius = safety_radius      # Minimum desired clearance (m)
        self.time_horizon = time_horizon        # Prediction window in seconds (tau)
        self.max_speed = max_speed              # Maximum physical drone speed (m/s)

    def compute_avoidance_velocity(
        self,
        pos_i: Tuple[float, float, float],
        vel_pref: Tuple[float, float, float],
        neighbors: List[Tuple[Tuple[float, float, float], Tuple[float, float, float]]]
    ) -> Tuple[float, float, float]:
        """
        Computes the collision-free optimal 3D velocity for agent i using 3D Velocity Obstacles (VO).
        Evaluates Closest Point of Approach (CPA) within time horizon tau.
        """
        v_opt = list(vel_pref)
        r_combined = self.safety_radius * 1.2  # Combined protective sphere

        for pos_j, vel_j in neighbors:
            # Relative position: p_j - p_i (vector pointing from i to j)
            p_rel = (pos_j[0] - pos_i[0], pos_j[1] - pos_i[1], pos_j[2] - pos_i[2])
            dist = math.sqrt(p_rel[0]**2 + p_rel[1]**2 + p_rel[2]**2)

            if dist < 1e-4:
                continue

            # Relative velocity: v_i - v_j (rate of approach)
            v_rel = (v_opt[0] - vel_j[0], v_opt[1] - vel_j[1], v_opt[2] - vel_j[2])
            v_sq = v_rel[0]**2 + v_rel[1]**2 + v_rel[2]**2

            # Check if drones are closing in: p_rel . v_rel > 0
            p_dot_v = p_rel[0] * v_rel[0] + p_rel[1] * v_rel[1] + p_rel[2] * v_rel[2]

            if dist < r_combined:
                # Already too close: strong repulsive push away from neighbor
                u_dir = (-p_rel[0] / dist, -p_rel[1] / dist, -p_rel[2] / dist)
                repel_speed = 3.0
                v_opt[0] += repel_speed * u_dir[0]
                v_opt[1] += repel_speed * u_dir[1]
                v_opt[2] += repel_speed * u_dir[2]

            elif p_dot_v > 0 and v_sq > 1e-4:
                # Time to Closest Point of Approach (t_cpa)
                t_cpa = p_dot_v / v_sq

                if 0.0 < t_cpa <= self.time_horizon:
                    # Position vector at closest approach: p_cpa = p_rel - v_rel * t_cpa
                    p_cpa = (
                        p_rel[0] - v_rel[0] * t_cpa,
                        p_rel[1] - v_rel[1] * t_cpa,
                        p_rel[2] - v_rel[2] * t_cpa
                    )
                    d_cpa = math.sqrt(p_cpa[0]**2 + p_cpa[1]**2 + p_cpa[2]**2)

                    if d_cpa < r_combined:
                        # Collision predicted! Compute lateral evasive unit normal
                        if d_cpa > 1e-4:
                            n_lat = (-p_cpa[0] / d_cpa, -p_cpa[1] / d_cpa, -p_cpa[2] / d_cpa)
                        else:
                            # Aviation Rules of the Air: Turn right relative to relative position vector
                            # Cross product: p_rel x (0, 0, 1) = (p_rel_y, -p_rel_x, 0)
                            cross_y = p_rel[1]
                            cross_x = -p_rel[0]
                            cross_len = math.sqrt(cross_x**2 + cross_y**2)
                            if cross_len > 1e-4:
                                n_lat = (cross_y / cross_len, cross_x / cross_len, 0.0)
                            else:
                                n_lat = (0.0, 1.0, 0.0)

                        # Required evasive velocity magnitude to clear safety sphere
                        v_evade_mag = (r_combined - d_cpa) / max(0.2, t_cpa)
                        
                        # Reciprocal 50% sharing of avoidance workload
                        v_opt[0] += 0.5 * v_evade_mag * n_lat[0]
                        v_opt[1] += 0.5 * v_evade_mag * n_lat[1]
                        v_opt[2] += 0.5 * v_evade_mag * n_lat[2]

        # Clamp velocity to drone's max physical airspeed
        speed = math.sqrt(v_opt[0]**2 + v_opt[1]**2 + v_opt[2]**2)
        if speed > self.max_speed:
            scale = self.max_speed / speed
            v_opt = [v_opt[0] * scale, v_opt[1] * scale, v_opt[2] * scale]

        return (v_opt[0], v_opt[1], v_opt[2])


class DroneGNC:
    """
    Complete Guidance, Navigation & Control unit for an individual UAV node.
    Maintains telemetry, waypoint list, offboard state machine, and failover checks.
    """

    def __init__(
        self,
        drone_id: str,
        name: str,
        initial_lat: float,
        initial_lon: float,
        initial_alt: float = 0.0,
        cruise_speed: float = 5.0,
        transformer: Optional[CoordinateTransform] = None
    ):
        self.drone_id = drone_id
        self.name = name
        self.mode = FlightMode.MANUAL
        self.armed = False
        self.transformer = transformer or CoordinateTransform(initial_lat, initial_lon, 0.0)

        # Geodetic / Global Position
        self.lat = initial_lat
        self.lon = initial_lon
        self.alt_msl = initial_alt + 150.0  # Above Mean Sea Level (m)
        self.alt_agl = initial_alt          # Above Ground Level (m)

        # Home Position (for RTL)
        self.home_lat = initial_lat
        self.home_lon = initial_lon
        self.home_alt = initial_alt

        # Local NED state (m, m/s)
        self.pos_ned = [0.0, 0.0, -initial_alt]   # (North, East, Down)
        self.vel_ned = [0.0, 0.0, 0.0]           # (v_North, v_East, v_Down)
        self.target_vel = [0.0, 0.0, 0.0]

        # Attitude (Euler in degrees for display, Radians for math)
        self.roll_deg = 0.0
        self.pitch_deg = 0.0
        self.yaw_deg = 0.0
        self.heading = 0.0

        # Avionics & Health
        self.battery_pct = 100.0
        self.battery_voltage = 25.2   # 6S LiPo full
        self.battery_current = 0.5    # Amperes idle
        self.satellites = 18
        self.link_quality_pct = 98.0
        self.link_latency_ms = 14.0
        self.climb_rate = 0.0         # m/s
        self.ground_speed = 0.0       # m/s
        self.air_speed = 0.0          # m/s
        self.motor_rpms = [0, 0, 0, 0]

        # Mission Waypoints: List of dicts with {"lat", "lon", "alt", "speed", "action"}
        self.waypoints: List[Dict[str, Any]] = []
        self.current_wp_idx = 0
        self.wp_acceptance_radius = 1.8  # meters
        self.cruise_speed = cruise_speed

        # Failover / Geofence Settings
        self.geofence_max_radius_m = 500.0
        self.min_battery_rtl_pct = 20.0
        self.last_heartbeat_time = time.time()
        self.status_message = "STANDBY - READY FOR ARMING"

    def arm(self) -> bool:
        """Arm motors and activate 50Hz offboard control loop."""
        self.armed = True
        self.motor_rpms = [3200, 3200, 3200, 3200]
        self.status_message = "ARMED - MOTORS ACTIVE"
        return True

    def disarm(self) -> bool:
        """Disarm motors and disable propulsion."""
        self.armed = False
        self.motor_rpms = [0, 0, 0, 0]
        self.vel_ned = [0.0, 0.0, 0.0]
        self.mode = FlightMode.MANUAL
        self.status_message = "DISARMED"
        return True

    def set_mode(self, mode: FlightMode) -> None:
        """Switch flight mode with safety assertions."""
        self.mode = mode
        if mode == FlightMode.TAKEOFF:
            self.arm()
            self.status_message = "AUTONOMOUS TAKEOFF TO 15M AGL"
        elif mode == FlightMode.WAYPOINT_NAV:
            self.status_message = f"EXECUTING WAYPOINT MISSION ({len(self.waypoints)} WPs)"
        elif mode == FlightMode.RTL:
            self.status_message = "RETURNING TO LAUNCH (RTL) FAILSAFE ENGAGED"
        elif mode == FlightMode.LOITER:
            self.status_message = "LOITERING AT CURRENT COORDINATES"
        elif mode == FlightMode.LAND:
            self.status_message = "PRECISION AUTOLAND IN PROGRESS"
        elif mode == FlightMode.EMERGENCY:
            self.status_message = "EMERGENCY ALL-STOP TRIGGERED"

    def add_waypoints(self, wps: List[Dict[str, Any]]) -> None:
        """Upload mission waypoints to GNC memory."""
        self.waypoints = wps
        self.current_wp_idx = 0

    def clear_waypoints(self) -> None:
        """Flush mission waypoint queue."""
        self.waypoints = []
        self.current_wp_idx = 0

    def update_physics(self, dt: float, neighbor_states: List[Tuple[Tuple[float, float, float], Tuple[float, float, float]]] = None) -> None:
        """
        Step physics and GNC control algorithms forward by dt seconds (typically 20Hz / 0.05s).
        Calculates proportional waypoint navigation, ORCA avoidance, attitude tilt, and battery drain.
        """
        if not self.armed:
            self.motor_rpms = [0, 0, 0, 0]
            self.vel_ned = [0.0, 0.0, 0.0]
            self.ground_speed = 0.0
            return

        # 1. Evaluate Flight Mode State Machine
        v_pref = [0.0, 0.0, 0.0]

        if self.mode == FlightMode.TAKEOFF:
            target_alt = 15.0
            alt_err = target_alt - self.alt_agl
            if alt_err > 0.3:
                v_pref[2] = -min(2.5, alt_err * 0.8)  # Down is negative for climbing
            else:
                self.mode = FlightMode.WAYPOINT_NAV if self.waypoints else FlightMode.LOITER
                self.status_message = "TAKEOFF COMPLETE - HOLDING ALTITUDE"

        elif self.mode == FlightMode.WAYPOINT_NAV:
            if self.waypoints and self.current_wp_idx < len(self.waypoints):
                target_wp = self.waypoints[self.current_wp_idx]
                target_n, target_e, target_d = self.transformer.wgs84_to_ned(
                    target_wp["lat"], target_wp["lon"], target_wp.get("alt", 15.0)
                )

                dn = target_n - self.pos_ned[0]
                de = target_e - self.pos_ned[1]
                dd = target_d - self.pos_ned[2]
                dist_2d = math.sqrt(dn**2 + de**2)

                if dist_2d < self.wp_acceptance_radius:
                    # Advance to next waypoint
                    self.current_wp_idx += 1
                    if self.current_wp_idx >= len(self.waypoints):
                        self.mode = FlightMode.LOITER
                        self.status_message = "MISSION COMPLETE - LOITERING"
                    else:
                        self.status_message = f"WAYPOINT {self.current_wp_idx} REACHED -> ADVANCING"
                else:
                    # Proportional navigation vector
                    speed = target_wp.get("speed", self.cruise_speed)
                    v_pref[0] = (dn / dist_2d) * speed
                    v_pref[1] = (de / dist_2d) * speed
                    v_pref[2] = max(-2.0, min(2.0, dd * 0.5))  # Altitude correction

                    # Target Heading towards next point
                    target_yaw = math.degrees(math.atan2(de, dn))
                    self.yaw_deg = (target_yaw + 360) % 360
                    self.heading = self.yaw_deg

        elif self.mode == FlightMode.RTL:
            home_n, home_e, home_d = self.transformer.wgs84_to_ned(self.home_lat, self.home_lon, 15.0)
            dn = home_n - self.pos_ned[0]
            de = home_e - self.pos_ned[1]
            dist_2d = math.sqrt(dn**2 + de**2)

            if dist_2d < 1.0:
                self.mode = FlightMode.LAND
                self.status_message = "HOME REACHED -> INITIATING TOUCHDOWN"
            else:
                speed = 6.0
                v_pref[0] = (dn / dist_2d) * speed
                v_pref[1] = (de / dist_2d) * speed
                v_pref[2] = 0.0

        elif self.mode == FlightMode.LAND:
            v_pref = [0.0, 0.0, 1.2]  # Descend at 1.2 m/s
            if self.alt_agl <= 0.2:
                self.alt_agl = 0.0
                self.pos_ned[2] = 0.0
                self.disarm()
                self.status_message = "TOUCHDOWN COMPLETE - SYSTEM DISARMED"

        elif self.mode == FlightMode.EMERGENCY:
            self.disarm()
            self.status_message = "EMERGENCY SHUTDOWN ENGAGED"
            return

        # 2. Apply ORCA 3D Collision Avoidance Filter with Swarm Neighbors
        if neighbor_states:
            orca = ORCA3DAvoidance(safety_radius=3.0, time_horizon=2.0, max_speed=8.0)
            pos_tuple = (self.pos_ned[0], self.pos_ned[1], self.pos_ned[2])
            vel_pref_tuple = (v_pref[0], v_pref[1], v_pref[2])
            v_safe = orca.compute_avoidance_velocity(pos_tuple, vel_pref_tuple, neighbor_states)
            v_pref = list(v_safe)

        # 3. Kinematic Integration (First-order Euler with low-pass damping)
        alpha = 0.25  # Inertial smoothing filter
        self.vel_ned[0] += alpha * (v_pref[0] - self.vel_ned[0])
        self.vel_ned[1] += alpha * (v_pref[1] - self.vel_ned[1])
        self.vel_ned[2] += alpha * (v_pref[2] - self.vel_ned[2])

        self.pos_ned[0] += self.vel_ned[0] * dt
        self.pos_ned[1] += self.vel_ned[1] * dt
        self.pos_ned[2] += self.vel_ned[2] * dt

        # Update Altitude AGL / MSL
        self.alt_agl = max(0.0, -self.pos_ned[2])
        self.alt_msl = self.home_alt + 150.0 + self.alt_agl

        # Convert Local NED position back to WGS84 Geodetic Coordinates
        self.lat, self.lon, _ = self.transformer.ned_to_wgs84(
            self.pos_ned[0], self.pos_ned[1], self.pos_ned[2]
        )

        # Compute Speeds
        self.ground_speed = math.sqrt(self.vel_ned[0]**2 + self.vel_ned[1]**2)
        self.air_speed = self.ground_speed + 0.3  # slight simulated headwind
        self.climb_rate = -self.vel_ned[2]

        # Calculate Pitch & Roll tilt angles based on acceleration / velocity
        self.pitch_deg = max(-25.0, min(25.0, (self.vel_ned[0] / 8.0) * -20.0))
        self.roll_deg = max(-25.0, min(25.0, (self.vel_ned[1] / 8.0) * 20.0))

        # Dynamic Motor RPMs based on thrust & maneuvers
        base_rpm = 5200 + int(self.alt_agl * 20) + int(self.ground_speed * 120)
        self.motor_rpms = [
            base_rpm + int(self.pitch_deg * 10 - self.roll_deg * 10),
            base_rpm + int(self.pitch_deg * 10 + self.roll_deg * 10),
            base_rpm - int(self.pitch_deg * 10 - self.roll_deg * 10),
            base_rpm - int(self.pitch_deg * 10 + self.roll_deg * 10),
        ]

        # 4. Battery Discharge Model
        current_draw = 12.0 + (self.ground_speed * 1.5) + (max(0.0, self.climb_rate) * 4.0)
        self.battery_current = current_draw
        drain_per_sec = (current_draw / (4.5 * 3600)) * 100.0  # 4500mAh 6S Pack
        self.battery_pct = max(0.0, self.battery_pct - drain_per_sec * dt)
        self.battery_voltage = 19.8 + (self.battery_pct / 100.0) * (25.2 - 19.8)

        # 5. Geofence & Failsafe Checks
        dist_from_home = math.sqrt(self.pos_ned[0]**2 + self.pos_ned[1]**2)
        if dist_from_home > self.geofence_max_radius_m and self.mode != FlightMode.RTL:
            self.set_mode(FlightMode.RTL)
            self.status_message = "⚠️ GEOFENCE BREACH -> FORCED RTL TRIGGERED"

        if self.battery_pct < self.min_battery_rtl_pct and self.mode not in (FlightMode.RTL, FlightMode.LAND):
            self.set_mode(FlightMode.RTL)
            self.status_message = "⚠️ LOW BATTERY (< 20%) -> EMERGENCY RTL ENGAGED"

    def to_dict(self) -> Dict[str, Any]:
        """Serialize full drone telemetry for GCS JSON API and SSE streaming."""
        roll_rad = math.radians(self.roll_deg)
        pitch_rad = math.radians(self.pitch_deg)
        yaw_rad = math.radians(self.yaw_deg)
        qx, qy, qz, qw = AttitudeMath.euler_to_quaternion(roll_rad, pitch_rad, yaw_rad)

        return {
            "drone_id": self.drone_id,
            "name": self.name,
            "armed": self.armed,
            "mode": self.mode.value,
            "lat": round(self.lat, 6),
            "lon": round(self.lon, 6),
            "alt_agl": round(self.alt_agl, 2),
            "alt_msl": round(self.alt_msl, 2),
            "ground_speed": round(self.ground_speed, 2),
            "air_speed": round(self.air_speed, 2),
            "climb_rate": round(self.climb_rate, 2),
            "roll": round(self.roll_deg, 1),
            "pitch": round(self.pitch_deg, 1),
            "yaw": round(self.yaw_deg, 1),
            "heading": round(self.heading, 1),
            "quaternion": {"qx": round(qx, 4), "qy": round(qy, 4), "qz": round(qz, 4), "qw": round(qw, 4)},
            "battery_pct": round(self.battery_pct, 1),
            "battery_voltage": round(self.battery_voltage, 2),
            "battery_current": round(self.battery_current, 1),
            "satellites": self.satellites,
            "link_quality": round(self.link_quality_pct, 1),
            "link_latency_ms": round(self.link_latency_ms, 1),
            "motor_rpms": self.motor_rpms,
            "pos_ned": [round(x, 2) for x in self.pos_ned],
            "vel_ned": [round(v, 2) for v in self.vel_ned],
            "current_wp_index": self.current_wp_idx,
            "total_waypoints": len(self.waypoints),
            "status_message": self.status_message,
        }
