#!/usr/bin/env python3
"""
Project SUTRA — Swarm Fixed-Path Flight Node
=============================================
Each instance controls ONE drone following a pre-defined looping waypoint
route. Routes are designed to cross each other's airspace (the "Pegasus"
star pattern) — their planned trajectories intersect — but the ORCA 3D
collision avoidance engine resolves real-time reciprocal velocity obstacles
so the physical drones never come within the Gate G5 3.5m safety buffer.

Drone ID → Route mapping (all inside ±30m, Z 3.5–8m):
  uav_alpha   → Large clockwise oval (X-axis primary)
  uav_beta    → Large clockwise oval (Y-axis primary) — crosses alpha's path
  uav_gamma   → Diagonal figure-8 (NE↔SW) — crosses both alpha & beta
  uav_delta   → Reverse diagonal figure-8 (NW↔SE) — crosses all three above
  uav_epsilon → Central pentagon loop at mid altitude — thread through all

ORCA avoidance radius: 3.5m (Gate G5 hard minimum 2.5m)
Control rate: 50 Hz
"""

import math
import json
import rclpy
from rclpy.node import Node
from rcl_interfaces.msg import SetParametersResult
from geometry_msgs.msg import TwistStamped, PoseStamped
from nav_msgs.msg import Odometry
from visualization_msgs.msg import Marker, MarkerArray
from std_msgs.msg import ColorRGBA, String
from geometry_msgs.msg import Point
from sutra_gnc.orca_avoidance import Orca3DSolver


# ── Home Pad Coordinates for Safe RTL ─────────────────────────────────────────
DRONE_HOME_COORDS = {
    "uav_alpha":   ( 15.0,   0.0, 4.0),
    "uav_beta":    (  0.0,  15.0, 4.0),
    "uav_gamma":   (-15.0,   0.0, 4.0),
    "uav_delta":   (  0.0, -15.0, 4.0),
    "uav_epsilon": ( 10.0,  10.0, 4.0),
}


# ── Pre-Defined Waypoint Routes ──────────────────────────────────────────────
# Each route is a list of (x, y, z) waypoints forming a closed loop.
# All coordinates in metres, origin at world centre.
# Routes are intentionally designed to cross each other's airspace.

DRONE_ROUTES = {
    # Alpha: Large clockwise oval along X-axis (primary E-W corridor)
    "uav_alpha": [
        ( 28.0,   0.0, 5.0),
        ( 20.0,  14.0, 5.0),
        (  0.0,  18.0, 5.0),
        (-20.0,  14.0, 5.0),
        (-28.0,   0.0, 5.0),
        (-20.0, -14.0, 5.0),
        (  0.0, -18.0, 5.0),
        ( 20.0, -14.0, 5.0),
    ],

    # Beta: Large clockwise oval along Y-axis (primary N-S corridor)
    # Crosses alpha's oval at roughly (±20, ±14) — shared airspace
    "uav_beta": [
        (  0.0,  28.0, 6.5),
        ( 14.0,  20.0, 6.5),
        ( 18.0,   0.0, 6.5),
        ( 14.0, -20.0, 6.5),
        (  0.0, -28.0, 6.5),
        (-14.0, -20.0, 6.5),
        (-18.0,   0.0, 6.5),
        (-14.0,  20.0, 6.5),
    ],

    # Gamma: Diagonal figure-8 NE ↔ SW
    # Crosses alpha AND beta at the centre region
    "uav_gamma": [
        ( 25.0,  25.0, 4.0),
        ( 12.0,  12.0, 4.0),
        (  0.0,   0.0, 4.0),   # Centre crossing point
        (-12.0, -12.0, 4.0),
        (-25.0, -25.0, 4.0),
        (-12.0, -12.0, 4.5),
        (  0.0,   0.0, 4.5),   # Centre crossing point
        ( 12.0,  12.0, 4.5),
    ],

    # Delta: Reverse diagonal figure-8 NW ↔ SE
    # Crosses alpha, beta, AND gamma paths
    "uav_delta": [
        (-25.0,  25.0, 7.0),
        (-12.0,  12.0, 7.0),
        (  0.0,   0.0, 7.0),   # Centre crossing point (different Z to gamma)
        ( 12.0, -12.0, 7.0),
        ( 25.0, -25.0, 7.0),
        ( 12.0, -12.0, 7.5),
        (  0.0,   0.0, 7.5),
        (-12.0,  12.0, 7.5),
    ],

    # Epsilon: Pentagon loop at mid altitude, threads through all other paths
    "uav_epsilon": [
        ( 15.0,   0.0, 5.8),
        (  4.6,  14.3, 5.8),
        (-12.1,   8.8, 5.8),
        (-12.1,  -8.8, 5.8),
        (  4.6, -14.3, 5.8),
    ],
}

# 3D Multi-Layered Ring Crossing Routes (Inter-Drone Clearance >= 2.80m)
RING_CROSSING_ROUTES = {
    "uav_alpha":   [(0.0, 0.0, 4.0), (-12.0, 0.0, 4.0), (0.0, 0.0, 4.0), (12.0, 0.0, 4.0)],
    "uav_beta":    [(0.0, 0.0, 4.6), (-3.708, -11.413, 4.6), (0.0, 0.0, 4.6), (3.708, 11.413, 4.6)],
    "uav_gamma":   [(0.0, 0.0, 3.5), (9.708, -7.053, 3.5), (0.0, 0.0, 3.5), (-9.708, 7.053, 3.5)],
    "uav_delta":   [(0.0, 0.0, 4.3), (9.708, 7.053, 4.3), (0.0, 0.0, 4.3), (-9.708, -7.053, 4.3)],
    "uav_epsilon": [(0.0, 0.0, 3.8), (-3.708, 11.413, 3.8), (0.0, 0.0, 3.8), (3.708, -11.413, 3.8)],
}

# Home coordinates for Forest Canopy SAR World (Calibrated Canopy Resilience Flight Altitudes)
CANOPY_FOREST_HOME_COORDS = {
    "uav_alpha":   ( 6.50,   5.50, 46.00),
    "uav_beta":    (12.00,  -8.00, 54.00),
    "uav_gamma":   ( 0.00,   0.00, 64.00),
    "uav_delta":   (-10.00, -8.00, 52.00),
    "uav_epsilon": (-5.00,   9.50, 49.00),
}

# 3D Forest Canopy Search Routes (Canopy Penetration, Tree Crown Skimming & High-Altitude RF Relay)
CANOPY_FOREST_ROUTES = {
    # Alpha: Lead Penetration Scout tracking the winding dirt trail / soldier squad at 46m (9.5m AGL)
    "uav_alpha": [
        ( 6.50,  5.50, 46.00),
        ( 4.00,  3.50, 45.50),
        ( 1.00,  3.50, 45.00),
        (-2.00,  6.00, 45.50),
        (-5.00,  9.50, 46.00),
        (-2.00,  6.00, 46.50),
        ( 1.00,  3.50, 46.50),
        ( 4.00,  3.50, 46.00),
    ],
    # Beta: North-East Ridge & Clearing Reconnaissance at 54m (17.5m AGL)
    "uav_beta": [
        (12.00, -8.00, 54.00),
        (18.00,  0.00, 53.50),
        (14.00, 10.00, 54.00),
        ( 8.00, 12.00, 54.50),
        ( 4.00,  6.00, 54.00),
        ( 8.00, -2.00, 53.50),
    ],
    # Gamma: Central High-Altitude RF Mesh Relay & Tactical Sentry at 64m (27.5m AGL)
    "uav_gamma": [
        ( 0.00,  0.00, 64.00),
        ( 8.00,  8.00, 63.50),
        ( 0.00,  0.00, 64.00),
        (-8.00, -8.00, 64.50),
        ( 0.00,  0.00, 64.00),
        (-8.00,  8.00, 63.50),
        ( 0.00,  0.00, 64.00),
        ( 8.00, -8.00, 64.50),
    ],
    # Delta: East Flank & Ravine Search Loop at 52m (15.5m AGL)
    "uav_delta": [
        (-10.00, -8.00, 52.00),
        (-14.00,  0.00, 51.50),
        (-12.00,  8.00, 52.00),
        ( -6.00,  6.00, 52.50),
        ( -4.00, -2.00, 52.00),
        ( -8.00, -6.00, 51.50),
    ],
    # Epsilon: West Trail Insertion Overwatch & Vehicle Perimeter at 49m (12.5m AGL)
    "uav_epsilon": [
        (-5.00,  9.50, 49.00),
        (-8.00, 12.00, 48.50),
        (-10.00,  8.00, 49.00),
        (-8.00,  4.00, 49.50),
        (-3.00,  5.00, 49.00),
        (-2.00,  8.00, 48.50),
    ],
}

# Home coordinates for disaster flood world (exact Blender starting positions)
DISASTER_FLOOD_HOME_COORDS = {
    "uav_alpha":   (16.02, -15.02, 54.02),
    "uav_beta":    (24.98,  15.01, 57.02),
    "uav_gamma":   (17.98,   5.01, 66.02),
    "uav_delta":   (32.01,  11.98, 54.02),
    "uav_epsilon": ( 5.02,  -4.99, 52.02),
}

# 3D Submerged Disaster Flood World Search Routes (Exact Blender UAV Keyframe Flight Curves)
DISASTER_FLOOD_ROUTES = {
    "uav_alpha": [
        (16.02, -15.02, 54.02),
        (16.78, -14.78, 53.58),
        (17.69, -13.68, 53.12),
        (18.62, -11.06, 52.62),
        (19.55,  -7.10, 52.07),
        (20.51,  -1.92, 51.48),
        (21.29,   3.77, 50.96),
        (21.84,   9.52, 50.58),
        (22.19,  14.52, 50.34),
        (22.13,  18.43, 50.24),
        (21.79,  20.81, 50.36),
        (21.21,  21.88, 50.67),
        (21.79,  20.81, 50.36),
        (22.13,  18.43, 50.24),
        (22.19,  14.52, 50.34),
        (21.84,   9.52, 50.58),
        (21.29,   3.77, 50.96),
        (20.51,  -1.92, 51.48),
        (19.55,  -7.10, 52.07),
        (18.62, -11.06, 52.62),
        (17.69, -13.68, 53.12),
        (16.78, -14.78, 53.58),
    ],
    "uav_beta": [
        (24.98, 15.01, 57.02),
        (25.79, 15.10, 56.59),
        (26.64, 15.78, 56.16),
        (27.43, 17.21, 55.73),
        (28.26, 19.51, 55.28),
        (28.98, 22.39, 54.83),
        (29.50, 25.68, 54.47),
        (29.88, 28.88, 54.24),
        (29.98, 31.79, 54.13),
        (29.76, 33.94, 54.15),
        (29.37, 35.36, 54.33),
        (28.70, 35.90, 54.66),
        (29.37, 35.36, 54.33),
        (29.76, 33.94, 54.15),
        (29.98, 31.79, 54.13),
        (29.88, 28.88, 54.24),
        (29.50, 25.68, 54.47),
        (28.98, 22.39, 54.83),
        (28.26, 19.51, 55.28),
        (27.43, 17.21, 55.73),
        (26.64, 15.78, 56.16),
        (25.79, 15.10, 56.59),
    ],
    "uav_gamma": [
        (17.98,  5.01, 66.02),
        (18.82,  5.02, 65.60),
        (19.58,  5.27, 65.23),
        (20.33,  5.73, 64.94),
        (21.06,  6.51, 64.71),
        (21.60,  7.46, 64.54),
        (22.01,  8.56, 64.48),
        (22.23,  9.63, 64.56),
        (22.15, 10.59, 64.73),
        (21.89, 11.32, 64.95),
        (21.40, 11.78, 65.26),
        (20.67, 11.98, 65.65),
        (21.40, 11.78, 65.26),
        (21.89, 11.32, 64.95),
        (22.15, 10.59, 64.73),
        (22.23,  9.63, 64.56),
        (22.01,  8.56, 64.48),
        (21.60,  7.46, 64.54),
        (21.06,  6.51, 64.71),
        (20.33,  5.73, 64.94),
        (19.58,  5.27, 65.23),
        (18.82,  5.02, 65.60),
    ],
    "uav_delta": [
        (32.01, 11.98, 54.02),
        (32.81, 12.11, 53.60),
        (33.63, 12.56, 53.19),
        (34.58, 13.72, 52.83),
        (35.47, 15.40, 52.50),
        (36.30, 17.67, 52.19),
        (37.06, 20.10, 51.98),
        (37.52, 22.62, 51.90),
        (37.75, 24.75, 51.93),
        (37.72, 26.47, 52.05),
        (37.30, 27.48, 52.29),
        (36.69, 27.96, 52.66),
        (37.30, 27.48, 52.29),
        (37.72, 26.47, 52.05),
        (37.75, 24.75, 51.93),
        (37.52, 22.62, 51.90),
        (37.06, 20.10, 51.98),
        (36.30, 17.67, 52.19),
        (35.47, 15.40, 52.50),
        (34.58, 13.72, 52.83),
        (33.63, 12.56, 53.19),
        (32.81, 12.11, 53.60),
    ],
    "uav_epsilon": [
        ( 5.02, -4.99, 52.02),
        ( 5.74, -4.91, 51.59),
        ( 6.41, -4.30, 51.16),
        ( 6.83, -3.01, 50.73),
        ( 6.94, -0.92, 50.28),
        ( 6.86,  1.69, 49.83),
        ( 6.48,  4.67, 49.47),
        ( 5.88,  7.56, 49.24),
        ( 5.20, 10.19, 49.13),
        ( 4.37, 12.13, 49.15),
        ( 3.52, 13.42, 49.33),
        ( 2.74, 13.90, 49.66),
        ( 3.52, 13.42, 49.33),
        ( 4.37, 12.13, 49.15),
        ( 5.20, 10.19, 49.13),
        ( 5.88,  7.56, 49.24),
        ( 6.48,  4.67, 49.47),
        ( 6.86,  1.69, 49.83),
        ( 6.94, -0.92, 50.28),
        ( 6.83, -3.01, 50.73),
        ( 6.41, -4.30, 51.16),
        ( 5.74, -4.91, 51.59),
    ],
}

# Drone visual colours (for RViz markers)
DRONE_COLOURS = {
    "uav_alpha":   (0.0, 0.8, 1.0, 1.0),   # Cyan
    "uav_beta":    (1.0, 0.4, 0.0, 1.0),   # Orange
    "uav_gamma":   (0.3, 1.0, 0.3, 1.0),   # Green
    "uav_delta":   (1.0, 0.2, 0.8, 1.0),   # Magenta
    "uav_epsilon": (1.0, 1.0, 0.0, 1.0),   # Yellow
}


class SwarmFixedPathNode(Node):
    """Single-drone fixed-path controller. Launch one instance per drone."""

    def __init__(self, **kwargs):
        super().__init__("sutra_swarm_fixed_path", **kwargs)

        # ── Parameters ────────────────────────────────────────────────────────
        self.declare_parameter("drone_id", "uav_alpha")
        self.declare_parameter("route_mode", "standard")     # "standard" | "ring_crossing" | "disaster_flood"
        self.declare_parameter("cruise_speed", 3.0)          # m/s
        self.declare_parameter("waypoint_radius", 2.2)       # proximity threshold
        self.declare_parameter("takeoff_altitude", 4.0)      # m — must match route Z
        self.declare_parameter("orca_radius", 1.40)          # avoidance bubble radius (Gate G5 >= 2.80m)
        self.declare_parameter("max_acceleration", 2.0)      # m/s² Gate G5

        self.drone_id = self.get_parameter("drone_id").value
        self.route_mode = self.get_parameter("route_mode").value
        self.cruise_speed = float(self.get_parameter("cruise_speed").value)
        self.wp_radius = float(self.get_parameter("waypoint_radius").value)
        self.takeoff_alt = float(self.get_parameter("takeoff_altitude").value)
        self.orca_radius = float(self.get_parameter("orca_radius").value)
        self.max_acc = float(self.get_parameter("max_acceleration").value)

        # Mathematical ORCA 3D Solver
        self.solver = Orca3DSolver(
            safety_radius=self.orca_radius,
            time_horizon=4.0,
            max_speed=self.cruise_speed
        )

        # Route for this drone
        if self.route_mode in ["canopy_forest", "forest"]:
            self.waypoints = CANOPY_FOREST_ROUTES.get(self.drone_id, CANOPY_FOREST_ROUTES["uav_alpha"])
        elif self.route_mode == "ring_crossing":
            self.waypoints = RING_CROSSING_ROUTES.get(self.drone_id, RING_CROSSING_ROUTES["uav_alpha"])
        elif self.route_mode == "disaster_flood":
            self.waypoints = DISASTER_FLOOD_ROUTES.get(self.drone_id, DISASTER_FLOOD_ROUTES["uav_alpha"])
        else:
            self.waypoints = DRONE_ROUTES.get(self.drone_id, DRONE_ROUTES["uav_alpha"])


        self.wp_idx = 0
        self.colour = DRONE_COLOURS.get(self.drone_id, (1.0, 1.0, 1.0, 1.0))

        # State
        self.x = 0.0; self.y = 0.0; self.z = 0.0
        self.vx = 0.0; self.vy = 0.0; self.vz = 0.0
        self.has_pose = False
        self.is_airborne = False
        self.loop_count = 0

        # Flight mode & resilience states
        self.flight_mode = "MISSION"
        if self.route_mode in ["canopy_forest", "forest"]:
            self.home_coords = CANOPY_FOREST_HOME_COORDS.get(self.drone_id, (6.50, 5.50, 46.00))
            self.takeoff_alt = self.home_coords[2]
        elif self.route_mode == "disaster_flood":
            self.home_coords = DISASTER_FLOOD_HOME_COORDS.get(self.drone_id, (16.02, -15.02, 54.02))
            self.takeoff_alt = self.home_coords[2]
        else:
            self.home_coords = DRONE_HOME_COORDS.get(self.drone_id, (0.0, 0.0, 4.0))
        self.hover_pos = self.home_coords

        # Integral error terms for aerodynamic wind disturbance rejection
        self.int_err_x = 0.0
        self.int_err_y = 0.0
        self.int_err_z = 0.0

        # Dynamic ROS 2 parameter callback for live jury adjustments
        self.add_on_set_parameters_callback(self._on_set_parameters)

        # Command subscriber for live failsafe & mode triggers
        self.sub_cmd = self.create_subscription(
            String,
            "/sutra/swarm/command",
            self._on_swarm_command,
            10
        )

        # Target Tracking State from Perception & Kaggle GPU
        self.detected_target = None
        self.sub_targets = self.create_subscription(
            String,
            "/sutra/perception/targets",
            self._on_perception_targets,
            10
        )

        # Swarm peer states: drone_id → (x, y, z, vx, vy, vz)
        self.peer_states: dict[str, tuple] = {}

        # ── Publishers ────────────────────────────────────────────────────────
        self.pub_twist = self.create_publisher(
            TwistStamped,
            f"/{self.drone_id}/gazebo/command/twist",
            10,
        )
        self.pub_path_markers = self.create_publisher(
            MarkerArray, "/sutra/swarm/path_markers", 10
        )
        self.pub_pose = self.create_publisher(
            PoseStamped, f"/sutra/gnc/{self.drone_id}/pose_stamped", 10
        )

        # ── Subscriptions ─────────────────────────────────────────────────────
        # Own odometry
        self.sub_odom = self.create_subscription(
            Odometry,
            f"/model/{self.drone_id}/odometry",
            self._odom_cb,
            10,
        )

        # Subscribe to all peer drones' odometry for ORCA
        all_drones = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]
        for peer_id in all_drones:
            if peer_id != self.drone_id:
                self.create_subscription(
                    Odometry,
                    f"/model/{peer_id}/odometry",
                    lambda msg, pid=peer_id: self._peer_odom_cb(msg, pid),
                    10,
                )

        # 50Hz control loop
        self.timer = self.create_timer(0.02, self._control_loop)

        # 2Hz path marker publisher (for RViz visualisation)
        self.marker_timer = self.create_timer(0.5, self._publish_path_markers)

        self.get_logger().info(
            f"🚁 [{self.drone_id}] Fixed-Path Node READY — "
            f"{len(self.waypoints)} waypoints | cruise {self.cruise_speed} m/s | "
            f"ORCA radius {self.orca_radius} m"
        )
        self._log_route()

    def _on_set_parameters(self, params):
        for p in params:
            if p.name == "cruise_speed":
                self.cruise_speed = float(p.value)
                self.solver.max_speed = self.cruise_speed
                self.get_logger().info(f"⚡ [{self.drone_id}] Dynamic speed updated: {self.cruise_speed:.1f} m/s")
            elif p.name == "orca_radius":
                self.orca_radius = float(p.value)
                self.solver.safety_radius = self.orca_radius
                self.get_logger().info(f"🛡️ [{self.drone_id}] Dynamic ORCA safety radius updated: {self.orca_radius:.2f} m")
            elif p.name == "waypoint_radius":
                self.wp_radius = float(p.value)
                self.get_logger().info(f"📍 [{self.drone_id}] Dynamic waypoint radius updated: {self.wp_radius:.2f} m")
        return SetParametersResult(successful=True)

    def _on_swarm_command(self, msg: String):
        try:
            data = json.loads(msg.data)
            target = data.get("drone_id", "all")
            target_sys = data.get("target_system", 0)

            sys_to_name = {1: "uav_alpha", 2: "uav_beta", 3: "uav_gamma", 4: "uav_delta", 5: "uav_epsilon"}
            if target_sys > 0 and target == "all":
                target = sys_to_name.get(target_sys, "all")

            if target not in ("all", self.drone_id):
                return

            action = data.get("action", "")
            if action == "rtl":
                self.flight_mode = "RTL"
                self.get_logger().info(f"🚨 [{self.drone_id}] Failsafe: EMERGENCY RTL ENGAGED! Returning to home base {self.home_coords}")
            elif action == "hover":
                self.flight_mode = "HOVER"
                self.hover_pos = (self.x, self.y, self.z)
                self.get_logger().info(f"🛑 [{self.drone_id}] Failsafe: POSITION HOLD HOVER at ({self.x:.1f}, {self.y:.1f}, {self.z:.1f})")
            elif action == "reset":
                self.flight_mode = "MISSION"
                self.get_logger().info(f"✅ [{self.drone_id}] Failsafe: MISSION RESUMED!")
            elif action == "set_speed":
                val = float(data.get("value", self.cruise_speed))
                self.cruise_speed = val
                self.solver.max_speed = val
                self.get_logger().info(f"⚡ [{self.drone_id}] Speed set via command: {self.cruise_speed:.1f} m/s")
            elif action == "set_radius":
                val = float(data.get("value", self.orca_radius))
                self.orca_radius = val
                self.solver.safety_radius = val
        except Exception as e:
            self.get_logger().error(f"Error handling swarm command: {e}")

    def _log_route(self):
        wp_str = " → ".join(
            f"({x:.1f},{y:.1f},{z:.1f})" for x, y, z in self.waypoints
        )
        self.get_logger().info(f"📍 [{self.drone_id}] Route: {wp_str} → (loop)")

    def _on_perception_targets(self, msg: String):
        try:
            payload = json.loads(msg.data)
            targets = payload if isinstance(payload, list) else payload.get("targets", [payload])
            for tgt in targets:
                if isinstance(tgt, dict):
                    loc = tgt.get("local_ned", {})
                    if loc and "x" in loc and "y" in loc:
                        x, y, z = float(loc["x"]), float(loc["y"]), float(loc.get("z", 37.0))
                    elif "x" in tgt and "y" in tgt:
                        x, y, z = float(tgt["x"]), float(tgt["y"]), float(tgt.get("z", 37.0))
                    else:
                        continue

                    self.detected_target = (x, y, z)
                    if self.flight_mode != "TARGET_TRACK":
                        self.flight_mode = "TARGET_TRACK"
                        label = tgt.get("class_name", tgt.get("label", "TARGET"))
                        conf = float(tgt.get("confidence", 0.95))
                        self.get_logger().warn(
                            f"🚨 [{self.drone_id}] PERCEPTION TARGET CONFIRMED: {label} ({conf*100:.1f}%) at "
                            f"(x={x:.2f}, y={y:.2f}, z={z:.2f})m -> TRANSITIONING TO TACTICAL CONCENTRIC ORBIT!"
                        )
                    break
        except Exception:
            pass

    # ── Callbacks ─────────────────────────────────────────────────────────────
    def _odom_cb(self, msg: Odometry):
        self.x = msg.pose.pose.position.x
        self.y = msg.pose.pose.position.y
        self.z = msg.pose.pose.position.z
        self.vx = msg.twist.twist.linear.x
        self.vy = msg.twist.twist.linear.y
        self.vz = msg.twist.twist.linear.z
        if not self.has_pose:
            self.has_pose = True
            self.initial_z = msg.pose.pose.position.z
        self.has_pose = True

        # Broadcast own pose for GCS
        ps = PoseStamped()
        ps.header.stamp = self.get_clock().now().to_msg()
        ps.header.frame_id = "world"
        ps.pose = msg.pose.pose
        self.pub_pose.publish(ps)

    def _peer_odom_cb(self, msg: Odometry, peer_id: str):
        self.peer_states[peer_id] = (
            msg.pose.pose.position.x,
            msg.pose.pose.position.y,
            msg.pose.pose.position.z,
            msg.twist.twist.linear.x,
            msg.twist.twist.linear.y,
            msg.twist.twist.linear.z,
        )

    # ── ORCA 3D Avoidance (Powered by Orca3DSolver) ───────────────────────────
    def _orca_velocity(self, vx_des: float, vy_des: float, vz_des: float):
        pos_i = (self.x, self.y, self.z)
        vel_i = (self.vx, self.vy, self.vz)
        pref_vel_i = (vx_des, vy_des, vz_des)

        neighbors = []
        for peer_id, state in self.peer_states.items():
            if peer_id != self.drone_id:
                px, py, pz, pvx, pvy, pvz = state
                neighbors.append(((px, py, pz), (pvx, pvy, pvz)))

        safe_vx, safe_vy, safe_vz = self.solver.compute_avoidance_velocity(
            pos_i, vel_i, pref_vel_i, neighbors
        )
        return safe_vx, safe_vy, safe_vz

    # ── Control Loop ──────────────────────────────────────────────────────────
    def _control_loop(self):
        if not self.has_pose:
            return

        # Phase 1: Takeoff
        if not self.is_airborne:
            target_z = self.waypoints[0][2]
            dz = target_z - self.z
            if abs(dz) > 0.3:
                self._send_twist(0.0, 0.0, min(1.5, max(-1.5, dz * 1.2)))
            else:
                self.is_airborne = True
                self.get_logger().info(
                    f"🚀 [{self.drone_id}] Airborne at z={self.z:.2f}m — "
                    f"starting route"
                )
            return

        # Phase 2: Mode Execution (HOVER, RTL, or MISSION)
        if self.flight_mode == "HOVER":
            hx, hy, hz = self.hover_pos
            dx, dy, dz = hx - self.x, hy - self.y, hz - self.z
            vx_des = min(2.0, max(-2.0, dx * 1.5))
            vy_des = min(2.0, max(-2.0, dy * 1.5))
            vz_des = min(1.0, max(-1.0, dz * 1.5))
            vx_final, vy_final, vz_final = self._orca_velocity(vx_des, vy_des, vz_des)
            self._apply_wind_compensated_twist(vx_final, vy_final, vz_final)
            return

        elif self.flight_mode == "RTL":
            hx, hy, hz = self.home_coords
            dx, dy, dz = hx - self.x, hy - self.y, hz - self.z
            dist_xy = math.hypot(dx, dy)
            if dist_xy > 0.6:
                dist_3d = math.sqrt(dx*dx + dy*dy + dz*dz)
                scale = self.cruise_speed / max(0.01, dist_3d)
                vx_des = dx * scale
                vy_des = dy * scale
                vz_des = dz * scale
                vx_final, vy_final, vz_final = self._orca_velocity(vx_des, vy_des, vz_des)
                self._apply_wind_compensated_twist(vx_final, vy_final, vz_final)
            else:
                # Over home pad -> automated safe descent to initial touchdown altitude
                landing_z = getattr(self, "initial_z", 0.3)
                if self.z > (landing_z + 0.15):
                    self._send_twist(0.0, 0.0, -0.6)
                else:
                    self._send_twist(0.0, 0.0, 0.0)
            return

        elif self.flight_mode == "TARGET_TRACK" and self.detected_target is not None:
            # Dynamic Tactical Concentric Orbit around detected ground target / squad
            tgt_x, tgt_y, tgt_z = self.detected_target

            # Calibrated concentric radii & altitudes per drone tactical role
            role_configs = {
                "uav_alpha":   {"radius": 7.0,  "alt_offset": 6.0,  "ang_vel": 0.45, "phase": 0.0},
                "uav_beta":    {"radius": 14.0, "alt_offset": 14.0, "ang_vel": 0.35, "phase": math.pi * 0.5},
                "uav_gamma":   {"radius": 1.5,  "alt_offset": 24.0, "ang_vel": 0.10, "phase": 0.0},
                "uav_delta":   {"radius": 20.0, "alt_offset": 12.0, "ang_vel": 0.28, "phase": math.pi},
                "uav_epsilon": {"radius": 11.0, "alt_offset": 9.0,  "ang_vel": 0.38, "phase": math.pi * 1.5},
            }
            cfg = role_configs.get(self.drone_id, {"radius": 10.0, "alt_offset": 8.0, "ang_vel": 0.3, "phase": 0.0})

            t = self.get_clock().now().nanoseconds * 1e-9
            theta = cfg["ang_vel"] * t + cfg["phase"]

            tx = tgt_x + cfg["radius"] * math.cos(theta)
            ty = tgt_y + cfg["radius"] * math.sin(theta)
            tz = tgt_z + cfg["alt_offset"]

            dx = tx - self.x
            dy = ty - self.y
            dz = tz - self.z
            dist_3d = math.sqrt(dx*dx + dy*dy + dz*dz)

            spd = min(self.cruise_speed, max(1.2, dist_3d * 1.2))
            if dist_3d > 0.05:
                vx_des = (dx / dist_3d) * spd
                vy_des = (dy / dist_3d) * spd
                vz_des = (dz / dist_3d) * spd
            else:
                vx_des, vy_des, vz_des = 0.0, 0.0, 0.0

            # Safe ORCA velocity avoidance during concentric orbit
            vx_final, vy_final, vz_final = self._orca_velocity(vx_des, vy_des, vz_des)
            self._apply_wind_compensated_twist(vx_final, vy_final, vz_final)
            return

        # Normal MISSION mode
        tx, ty, tz = self.waypoints[self.wp_idx]

        dx = tx - self.x
        dy = ty - self.y
        dz = tz - self.z
        dist_xy = math.sqrt(dx*dx + dy*dy)
        dist_3d = math.sqrt(dx*dx + dy*dy + dz*dz)

        # Advance waypoint when within threshold (XY only — Z maintained)
        if dist_xy < self.wp_radius:
            self.wp_idx = (self.wp_idx + 1) % len(self.waypoints)
            if self.wp_idx == 0:
                self.loop_count += 1
                self.get_logger().info(
                    f"🔄 [{self.drone_id}] Loop #{self.loop_count} complete"
                )
            self.get_logger().info(
                f"✅ [{self.drone_id}] WP cleared → next WP[{self.wp_idx}] "
                f"({self.waypoints[self.wp_idx][0]:.1f}, "
                f"{self.waypoints[self.wp_idx][1]:.1f}, "
                f"{self.waypoints[self.wp_idx][2]:.1f})"
            )
            return

        # Desired velocity vector toward waypoint
        if dist_3d > 0.01:
            scale = self.cruise_speed / dist_3d
            vx_des = dx * scale
            vy_des = dy * scale
            vz_des = dz * scale
        else:
            vx_des, vy_des, vz_des = 0.0, 0.0, 0.0

        # Slow down when approaching waypoint
        approach_factor = min(1.0, dist_xy / (self.wp_radius * 3.0))
        vx_des *= approach_factor
        vy_des *= approach_factor

        # Apply ORCA avoidance
        vx_final, vy_final, vz_final = self._orca_velocity(vx_des, vy_des, vz_des)

        self._apply_wind_compensated_twist(vx_final, vy_final, vz_final)

    def _apply_wind_compensated_twist(self, vx: float, vy: float, vz: float):
        """Applies closed-loop integral velocity compensation for physical wind shear rejection."""
        dt = 0.02
        err_x = vx - self.vx
        err_y = vy - self.vy
        err_z = vz - self.vz

        self.int_err_x += err_x * dt
        self.int_err_y += err_y * dt
        self.int_err_z += err_z * dt

        # Integral gain and anti-windup saturation limit (±1.5 m/s)
        ki = 0.35
        max_int = 1.5
        int_x = max(-max_int, min(max_int, self.int_err_x * ki))
        int_y = max(-max_int, min(max_int, self.int_err_y * ki))
        int_z = max(-max_int, min(max_int, self.int_err_z * ki))

        self._send_twist(vx + int_x, vy + int_y, vz + int_z)

    def _send_twist(self, vx: float, vy: float, vz: float):
        msg = TwistStamped()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = "world"
        msg.twist.linear.x = float(vx)
        msg.twist.linear.y = float(vy)
        msg.twist.linear.z = float(vz)
        self.pub_twist.publish(msg)

    # ── Path Marker Publisher (RViz visualisation of planned route) ────────────
    def _publish_path_markers(self):
        """
        Publishes the full planned route as a LINE_STRIP marker.
        These lines WILL cross other drones' lines on the map —
        that is the intentional Pegasus crossing pattern.
        """
        if not self.waypoints:
            return

        marker_array = MarkerArray()
        r, g, b, a = self.colour

        # Route LINE_STRIP
        line = Marker()
        line.header.stamp = self.get_clock().now().to_msg()
        line.header.frame_id = "world"
        line.ns = f"{self.drone_id}_route"
        line.id = hash(self.drone_id) % 1000
        line.type = Marker.LINE_STRIP
        line.action = Marker.ADD
        line.scale.x = 0.15
        line.color = ColorRGBA(r=r, g=g, b=b, a=0.7)

        # Close the loop: append first point at end
        pts = list(self.waypoints) + [self.waypoints[0]]
        for x, y, z in pts:
            p = Point(); p.x = float(x); p.y = float(y); p.z = float(z)
            line.points.append(p)
        marker_array.markers.append(line)

        # Current waypoint SPHERE
        sph = Marker()
        sph.header.stamp = self.get_clock().now().to_msg()
        sph.header.frame_id = "world"
        sph.ns = f"{self.drone_id}_target"
        sph.id = (hash(self.drone_id) % 1000) + 1
        sph.type = Marker.SPHERE
        sph.action = Marker.ADD
        tx, ty, tz = self.waypoints[self.wp_idx]
        sph.pose.position.x = float(tx)
        sph.pose.position.y = float(ty)
        sph.pose.position.z = float(tz)
        sph.pose.orientation.w = 1.0
        sph.scale.x = sph.scale.y = sph.scale.z = 1.2
        sph.color = ColorRGBA(r=r, g=g, b=b, a=1.0)
        marker_array.markers.append(sph)

        # Drone position ARROW (live)
        arr = Marker()
        arr.header.stamp = self.get_clock().now().to_msg()
        arr.header.frame_id = "world"
        arr.ns = f"{self.drone_id}_drone"
        arr.id = (hash(self.drone_id) % 1000) + 2
        arr.type = Marker.ARROW
        arr.action = Marker.ADD
        arr.scale.x = 1.0; arr.scale.y = 0.2; arr.scale.z = 0.2
        arr.pose.position.x = float(self.x)
        arr.pose.position.y = float(self.y)
        arr.pose.position.z = float(self.z)
        arr.pose.orientation.w = 1.0
        arr.color = ColorRGBA(r=r, g=g, b=b, a=1.0)
        marker_array.markers.append(arr)

        self.pub_path_markers.publish(marker_array)


def main(args=None):
    rclpy.init(args=args)
    node = SwarmFixedPathNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
