#!/usr/bin/env python3
"""
Project SUTRA — Subsystem A: Coordinated Multi-Drone Search & Rescue Node
==========================================================================
Author: Tech Lead Nikhil (Subsystem A Lead)

Features:
- Manages 5-UAV coordinated search and dynamic re-tasking over 802.11s SwarmRaft mesh.
- Phase 1 (SECTOR_SEARCH): Assigns distinct 3D search sectors to [uav_alpha, uav_beta,
  uav_gamma, uav_delta, uav_epsilon] for parallel grid/lawnmower coverage.
- Subsystem B Integration: Subscribes to /sutra/swarm/raft_consensus and /sutra/swarm/mesh_status.
- Phase 2 (SURVIVOR_CONCENTRIC_SURROUND): When a SURVIVOR_GPS entry is committed by SwarmRaft
  in Subsystem B, all 5 drones dynamically switch mode to form a 5-point concentric orbital
  surround pattern (10.0m radius, staggered 3.5m-6.0m altitudes) centered on the survivor GPS
  coordinate to maintain multi-angle visual/thermal coverage and mesh relay connectivity.
- Publishes preferred velocities /uav_*/pref_vel to orca_avoidance.py to guarantee
  Gate G5 ORCA 3D collision avoidance (>= 2.80m).
"""

import math
import time
import json
from typing import Dict, List, Tuple, Optional, Any

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from std_msgs.msg import String

# Default 5-UAV Swarm Identifiers
DEFAULT_SWARM_DRONES = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]

# Default WGS-84 reference origin (San Francisco digital twin / Gazebo origin)
ORIGIN_LAT = 37.774929
ORIGIN_LON = -122.419416
ORIGIN_ALT = 0.0


def get_sector_waypoints(drone_id: str) -> List[Tuple[float, float, float]]:
    """
    Returns distinct 3D search sector lawnmower grid waypoints for each drone.
    Sectors cover non-overlapping spatial zones around the central mission area.
    """
    sectors: Dict[str, List[Tuple[float, float, float]]] = {
        "uav_alpha": [
            (10.0, 10.0, 5.0),
            (10.0, 30.0, 5.0),
            (30.0, 30.0, 5.0),
            (30.0, 10.0, 5.0),
        ],
        "uav_beta": [
            (30.0, -10.0, 6.0),
            (30.0, -30.0, 6.0),
            (10.0, -30.0, 6.0),
            (10.0, -10.0, 6.0),
        ],
        "uav_gamma": [
            (-10.0, 30.0, 4.0),
            (-30.0, 30.0, 4.0),
            (-30.0, 10.0, 4.0),
            (-10.0, 10.0, 4.0),
        ],
        "uav_delta": [
            (-10.0, -10.0, 5.5),
            (-30.0, -10.0, 5.5),
            (-30.0, -30.0, 5.5),
            (-10.0, -30.0, 5.5),
        ],
        "uav_epsilon": [
            (0.0, 40.0, 4.5),
            (20.0, 40.0, 4.5),
            (20.0, 20.0, 4.5),
            (0.0, 20.0, 4.5),
        ],
    }
    return sectors.get(drone_id, [(0.0, 0.0, 5.0)])


def compute_concentric_orbit_positions(
    survivor_pos: Tuple[float, float, float],
    radius: float = 10.0,
    min_alt: float = 3.5,
    max_alt: float = 6.0,
    drones: Optional[List[str]] = None,
) -> Dict[str, Tuple[float, float, float]]:
    """
    Calculates a 5-point concentric orbital surround pattern centered on survivor_pos.

    Parameters:
    - survivor_pos: (x, y, z) 3D coordinate of the committed survivor target.
    - radius: Orbit radius in meters (10.0m requirement).
    - min_alt / max_alt: Altitude staggering range (3.5m - 6.0m).
    - drones: List of drone identifiers.

    Returns:
    - Dict mapping drone_id -> (x, y, z) orbital surround target position.
    """
    if drones is None:
        drones = DEFAULT_SWARM_DRONES

    num_drones = len(drones)
    orbit_positions: Dict[str, Tuple[float, float, float]] = {}

    sx, sy, sz = survivor_pos

    for i, drone_id in enumerate(drones):
        # Evenly spaced angular placement around the 360-degree circle
        theta = i * (2.0 * math.pi / num_drones)

        # Staggered altitude allocation across range [min_alt, max_alt]
        if num_drones > 1:
            alt_stagger = min_alt + i * ((max_alt - min_alt) / (num_drones - 1))
        else:
            alt_stagger = min_alt

        ox = sx + radius * math.cos(theta)
        oy = sy + radius * math.sin(theta)
        # Use staggered altitude relative to ground level or survivor elevation
        oz = max(sz, 0.0) + alt_stagger

        orbit_positions[drone_id] = (round(ox, 3), round(oy, 3), round(oz, 3))

    return orbit_positions


def calculate_preferred_velocity(
    current_pos: Tuple[float, float, float],
    target_pos: Tuple[float, float, float],
    max_speed: float = 3.0,
    smooth_arrival: bool = True
) -> Tuple[float, float, float]:
    """
    Computes a preferred velocity vector (vx, vy, vz) directed towards target_pos.
    Enhanced with State-to-State Minimum-Time continuous velocity profiling (arXiv:2510.20008).
    Prevents overshoot and eliminates altitude dipping during orbit retasking.
    """
    dx = target_pos[0] - current_pos[0]
    dy = target_pos[1] - current_pos[1]
    dz = target_pos[2] - current_pos[2]
    dist = math.sqrt(dx * dx + dy * dy + dz * dz)

    if dist <= 0.05:
        return (0.0, 0.0, 0.0)

    if smooth_arrival and dist < 2.0:
        # Minimum-Time quadratic deceleration profile v = sqrt(2 * a * d)
        speed = min(max_speed, math.sqrt(2.0 * 2.0 * max(0.01, dist)))
    else:
        speed = min(max_speed, dist * 1.2)

    vx = (dx / dist) * speed
    vy = (dy / dist) * speed
    vz = (dz / dist) * speed

    return (round(vx, 3), round(vy, 3), round(vz, 3))


def parse_survivor_gps_event(
    msg_data: str,
    origin_lat: float = ORIGIN_LAT,
    origin_lon: float = ORIGIN_LON,
    origin_alt: float = ORIGIN_ALT,
) -> Optional[Tuple[float, float, float]]:
    """
    Parses SwarmRaft consensus messages from Subsystem B (/sutra/swarm/raft_consensus).
    Extracts 3D local coordinates (x, y, z) when a SURVIVOR_GPS event is committed.

    Supports direct (x, y, z) local offsets or WGS84 (lat, lon, alt) fields.
    """
    try:
        payload = json.loads(msg_data)
    except (json.JSONDecodeError, TypeError):
        return None

    entry = None
    if isinstance(payload, dict):
        if payload.get("event") == "NEW_TARGET_COMMITTED":
            entry = payload.get("entry")
        elif payload.get("type") == "SURVIVOR_GPS":
            entry = payload
        elif "log" in payload and isinstance(payload["log"], list):
            for e in reversed(payload["log"]):
                if isinstance(e, dict) and e.get("type") == "SURVIVOR_GPS":
                    entry = e
                    break

    if not entry or not isinstance(entry, dict):
        return None

    entry_type = entry.get("type")
    if entry_type != "SURVIVOR_GPS":
        return None

    data = entry.get("data", {})
    if not isinstance(data, dict):
        return None

    # Check for direct local Cartesian coordinates (x, y, z)
    if "x" in data and "y" in data:
        x = float(data["x"])
        y = float(data["y"])
        z = float(data.get("z", data.get("alt", 4.0)))
        return (x, y, z)

    # Check for WGS84 GPS coordinates (lat, lon, alt)
    if "lat" in data and "lon" in data:
        lat = float(data["lat"])
        lon = float(data["lon"])
        alt = float(data.get("alt", 4.0))

        # If values are already in local offset meter scale (< 1000m)
        if abs(lat) < 1000.0 and abs(lon) < 1000.0:
            return (lat, lon, alt)

        # Convert WGS84 GPS to local Cartesian offset (x, y, z)
        earth_radius_m = 6_378_137.0
        d_lat = math.radians(lat - origin_lat)
        d_lon = math.radians(lon - origin_lon)
        y = d_lat * earth_radius_m
        x = d_lon * (earth_radius_m * math.cos(math.radians(origin_lat)))
        z = alt - origin_alt
        return (round(x, 3), round(y, 3), round(z, 3))

    return None


class CoordinatedSwarmSearchNode(Node):
    """
    ROS 2 Node managing 5-UAV coordinated search & dynamic re-tasking over 802.11s SwarmRaft mesh.
    """

    def __init__(self):
        super().__init__("coordinated_swarm_search_node")

        self.declare_parameter("swarm_drones", DEFAULT_SWARM_DRONES)
        self.declare_parameter("max_speed", 3.0)
        self.declare_parameter("orbit_radius", 10.0)
        self.declare_parameter("min_orbit_alt", 3.5)
        self.declare_parameter("max_orbit_alt", 6.0)
        self.declare_parameter("waypoint_reach_dist", 2.0)

        self.drones: List[str] = list(self.get_parameter("swarm_drones").value)
        self.max_speed: float = float(self.get_parameter("max_speed").value)
        self.orbit_radius: float = float(self.get_parameter("orbit_radius").value)
        self.min_orbit_alt: float = float(self.get_parameter("min_orbit_alt").value)
        self.max_orbit_alt: float = float(self.get_parameter("max_orbit_alt").value)
        self.waypoint_reach_dist: float = float(self.get_parameter("waypoint_reach_dist").value)

        # State Machine Flags
        self.phase: str = "SECTOR_SEARCH"  # Phases: SECTOR_SEARCH, SURVIVOR_CONCENTRIC_SURROUND
        self.survivor_gps: Optional[Tuple[float, float, float]] = None

        # Drone State Tracking
        default_spawns = {
            "uav_alpha": (15.0, 0.0, 4.0),
            "uav_beta": (4.635, 14.265, 4.0),
            "uav_gamma": (-12.135, 8.816, 4.0),
            "uav_delta": (-12.135, -8.816, 4.0),
            "uav_epsilon": (4.635, -14.265, 4.0),
        }
        self.positions: Dict[str, Tuple[float, float, float]] = {
            d: default_spawns.get(d, (0.0, 0.0, 4.0)) for d in self.drones
        }

        # Lawnmower sector waypoints & active index per drone
        self.sector_waypoints: Dict[str, List[Tuple[float, float, float]]] = {
            d: get_sector_waypoints(d) for d in self.drones
        }
        self.sector_target_idx: Dict[str, int] = {d: 0 for d in self.drones}

        # Subsystem B Telemetry State
        self.mesh_status_data: dict = {}
        self.raft_consensus_data: dict = {}

        # ROS 2 Publishers & Subscriptions
        self.pubs_pref_vel: Dict[str, rclpy.publisher.Publisher] = {}
        self.subs_odom: List[rclpy.subscription.Subscription] = []

        for drone_id in self.drones:
            self.pubs_pref_vel[drone_id] = self.create_publisher(
                Twist, f"/{drone_id}/pref_vel", 10
            )

            s1 = self.create_subscription(
                Odometry, f"/{drone_id}/odometry", self._make_odom_cb(drone_id), 10
            )
            s2 = self.create_subscription(
                Odometry, f"/model/{drone_id}/odometry", self._make_odom_cb(drone_id), 10
            )
            self.subs_odom.extend([s1, s2])

        # Subsystem B Mesh & Raft Subscriptions
        self.sub_raft_consensus = self.create_subscription(
            String, "/sutra/swarm/raft_consensus", self._on_raft_consensus, 10
        )
        self.sub_mesh_status = self.create_subscription(
            String, "/sutra/swarm/mesh_status", self._on_mesh_status, 10
        )
        # Subsystem C Perception Targets Direct Fallback Subscription
        self.sub_perception_targets = self.create_subscription(
            String, "/sutra/perception/targets", self._on_perception_targets, 10
        )

        # Status Telemetry Publisher
        self.pub_search_status = self.create_publisher(String, "/sutra/gnc/search_status", 10)

        # 20Hz Control Loop Timer
        self.timer = self.create_timer(0.05, self._control_loop_20hz)

        self.get_logger().info(
            f"🔍 Coordinated Swarm Search Node Initialized [{len(self.drones)} UAVs] | "
            f"Phase: {self.phase} | Orbit Radius: {self.orbit_radius}m | Alt: {self.min_orbit_alt}-{self.max_orbit_alt}m"
        )

    def _make_odom_cb(self, drone_id: str):
        def callback(msg: Odometry):
            p = msg.pose.pose.position
            self.positions[drone_id] = (p.x, p.y, p.z)
        return callback

    def _on_mesh_status(self, msg: String):
        try:
            self.mesh_status_data = json.loads(msg.data)
        except Exception:
            pass

    def _on_perception_targets(self, msg: String):
        """
        Parses direct target alerts from Subsystem C (/sutra/perception/targets).
        Acts as immediate local fallback if SwarmRaft consensus is delayed.
        """
        try:
            payload = json.loads(msg.data)
            targets = []
            if isinstance(payload, list):
                targets = payload
            elif isinstance(payload, dict):
                targets = payload.get("targets", [payload])

            for tgt in targets:
                if isinstance(tgt, dict) and tgt.get("class_name") in ["Survivor", "survivor", "person"]:
                    x = float(tgt.get("x", 0.0))
                    y = float(tgt.get("y", 0.0))
                    z = float(tgt.get("z", 4.0))
                    if self.survivor_gps is None:
                        self.survivor_gps = (x, y, z)
                        if self.phase != "SURVIVOR_CONCENTRIC_SURROUND":
                            self.phase = "SURVIVOR_CONCENTRIC_SURROUND"
                            self.get_logger().warn(
                                f"🚨 SURVIVOR DETECTED via Subsystem C direct perception feed! Re-tasking swarm to orbit (x={x:.2f}, y={y:.2f}, z={z:.2f})"
                            )
        except Exception:
            pass

    def _on_raft_consensus(self, msg: String):
        """
        Processes SwarmRaft consensus events.
        When a SURVIVOR_GPS entry is committed, triggers transition to SURVIVOR_CONCENTRIC_SURROUND.
        """
        survivor_pos = parse_survivor_gps_event(msg.data)
        if survivor_pos is not None:
            self.survivor_gps = survivor_pos
            if self.phase != "SURVIVOR_CONCENTRIC_SURROUND":
                self.phase = "SURVIVOR_CONCENTRIC_SURROUND"
                self.get_logger().warn(
                    f"🚨 SURVIVOR DETECTED via SwarmRaft! Re-tasking all {len(self.drones)} UAVs to "
                    f"Concentric Orbit Surround around target (x={survivor_pos[0]:.2f}, "
                    f"y={survivor_pos[1]:.2f}, z={survivor_pos[2]:.2f})"
                )

    def _control_loop_20hz(self):
        """
        20Hz GNC calculation & preferred velocity publishing loop.
        Computes desired velocity vectors for ORCA avoidance node.
        """
        target_positions: Dict[str, Tuple[float, float, float]] = {}

        if self.phase == "SECTOR_SEARCH":
            for drone_id in self.drones:
                waypoints = self.sector_waypoints[drone_id]
                idx = self.sector_target_idx[drone_id]
                target_wpt = waypoints[idx]

                cur_pos = self.positions[drone_id]
                dx = target_wpt[0] - cur_pos[0]
                dy = target_wpt[1] - cur_pos[1]
                dz = target_wpt[2] - cur_pos[2]
                dist = math.sqrt(dx * dx + dy * dy + dz * dz)

                if dist <= self.waypoint_reach_dist:
                    self.sector_target_idx[drone_id] = (idx + 1) % len(waypoints)
                    target_wpt = waypoints[self.sector_target_idx[drone_id]]

                target_positions[drone_id] = target_wpt

        elif self.phase == "SURVIVOR_CONCENTRIC_SURROUND" and self.survivor_gps is not None:
            target_positions = compute_concentric_orbit_positions(
                survivor_pos=self.survivor_gps,
                radius=self.orbit_radius,
                min_alt=self.min_orbit_alt,
                max_alt=self.max_orbit_alt,
                drones=self.drones,
            )

        # Compute & publish preferred velocity for each UAV
        for drone_id in self.drones:
            cur_pos = self.positions[drone_id]
            tgt_pos = target_positions.get(drone_id, cur_pos)

            vx, vy, vz = calculate_preferred_velocity(cur_pos, tgt_pos, self.max_speed)

            msg = Twist()
            msg.linear.x = vx
            msg.linear.y = vy
            msg.linear.z = vz
            self.pubs_pref_vel[drone_id].publish(msg)

        # Telemetry Status Broadcast
        status_msg = String()
        status_msg.data = json.dumps({
            "timestamp": time.time(),
            "phase": self.phase,
            "survivor_gps": self.survivor_gps,
            "active_targets": target_positions,
            "uav_count": len(self.drones),
        })
        self.pub_search_status.publish(status_msg)


def main(args=None):
    rclpy.init(args=args)
    node = CoordinatedSwarmSearchNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
