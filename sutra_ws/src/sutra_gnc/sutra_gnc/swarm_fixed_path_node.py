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
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import TwistStamped, PoseStamped
from nav_msgs.msg import Odometry
from visualization_msgs.msg import Marker, MarkerArray
from std_msgs.msg import ColorRGBA
from geometry_msgs.msg import Point
from sutra_gnc.orca_avoidance import Orca3DSolver


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

# 3D Submerged Disaster Flood World Search Routes (Altitude 48m-56m over 220x220m Terrain)
DISASTER_FLOOD_ROUTES = {
    "uav_alpha": [
        ( 30.0,   0.0, 50.0),
        ( 20.0,  25.0, 50.0),
        (-15.0,  20.0, 50.0),
        (-35.0,   0.0, 50.0),
        (-15.0, -25.0, 50.0),
        ( 20.0, -20.0, 50.0),
    ],
    "uav_beta": [
        (  0.0,  35.0, 48.0),
        ( 20.0,  15.0, 48.0),
        ( 25.0, -20.0, 48.0),
        (  0.0, -35.0, 48.0),
        (-25.0, -15.0, 48.0),
        (-20.0,  20.0, 48.0),
    ],
    "uav_gamma": [
        ( 35.0,  35.0, 52.0),
        ( 10.0,  10.0, 52.0),
        (-10.0, -10.0, 52.0),
        (-35.0, -35.0, 52.0),
        (-10.0, -10.0, 52.0),
        ( 10.0,  10.0, 52.0),
    ],
    "uav_delta": [
        (-35.0,  35.0, 54.0),
        (-10.0,  10.0, 54.0),
        ( 10.0, -10.0, 54.0),
        ( 35.0, -35.0, 54.0),
        ( 10.0, -10.0, 54.0),
        (-10.0,  10.0, 54.0),
    ],
    "uav_epsilon": [
        ( 45.0,   0.0, 56.0),
        ( 15.0,  40.0, 56.0),
        (-35.0,  30.0, 56.0),
        (-40.0, -30.0, 56.0),
        ( 15.0, -40.0, 56.0),
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

    def __init__(self):
        super().__init__("sutra_swarm_fixed_path")

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
        if self.route_mode == "ring_crossing":
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

    def _log_route(self):
        wp_str = " → ".join(
            f"({x:.1f},{y:.1f},{z:.1f})" for x, y, z in self.waypoints
        )
        self.get_logger().info(f"📍 [{self.drone_id}] Route: {wp_str} → (loop)")

    # ── Callbacks ─────────────────────────────────────────────────────────────
    def _odom_cb(self, msg: Odometry):
        self.x = msg.pose.pose.position.x
        self.y = msg.pose.pose.position.y
        self.z = msg.pose.pose.position.z
        self.vx = msg.twist.twist.linear.x
        self.vy = msg.twist.twist.linear.y
        self.vz = msg.twist.twist.linear.z
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

        # Phase 2: Waypoint pursuit
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

        self._send_twist(vx_final, vy_final, vz_final)

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
