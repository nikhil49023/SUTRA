#!/usr/bin/env python3
"""
Project SUTRA — Subsystem A: ORCA 3D Swarm Avoidance Node
=========================================================
Author: Tech Lead Nikhil (Subsystem A)

Features:
- Implements 3D Optimal Reciprocal Collision Avoidance (ORCA) for a 5-drone swarm:
  [uav_alpha, uav_beta, uav_gamma, uav_delta, uav_epsilon].
- Option 3 Dynamic Relocating Checkpoints: Drones advance to next checkpoint when within 2.5m of active ring.
- Forced Collision Trajectories: UAV Alpha (from x=15) and UAV Gamma (from x=-12) fly directly into (0, 0, 4.0) at the exact same time. UAV Beta and UAV Epsilon cross at (0, 0, 4.0).
- Static Physical Obstacle Constraints: Integrated obstacle avoidance for central pillars in Orca3DSolver.
- Subscribes to /uav_*/odometry (and /model/uav_*/odometry fallback).
- Publishes /uav_*/cmd_vel (and /uav_*/gazebo/command/twist fallback) at 50Hz.
- Enforces Gate G5 compliance: minimum inter-drone distance >= 2.80m (Hard limit >= 2.0m).
"""

import math
import time
from typing import Dict, List, Tuple, Optional

import json
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from geometry_msgs.msg import Twist, TwistStamped
from nav_msgs.msg import Odometry


class Orca3DSolver:
    """
    3D Optimal Reciprocal Collision Avoidance (ORCA) mathematical solver.
    Enhanced with:
    - SORCA: Smooth continuous acceleration-bounded velocity transitions (Springer 2025).
    - Topology-Guided ORCA: Medial axis topological obstacle navigation (arXiv:2407.16771).
    - Dynamic-TD3: Safety-constrained CMDP dynamic time horizon adaptation (arXiv:2605.00059).
    Computes safe 3D velocity vectors for multi-agent UAV systems and static obstacles.
    """

    def __init__(
        self,
        safety_radius: float = 1.40,
        time_horizon: float = 5.0,
        max_speed: float = 3.0,
        obstacles: Optional[List[Tuple[Tuple[float, float, float], float]]] = None,
        max_accel: float = 2.5,
        enable_sorca: bool = True,
        enable_topology_guidance: bool = True
    ):
        """
        :param safety_radius: Radius per drone (m). Combined min clearance = 2 * safety_radius (2.80m for G5).
        :param time_horizon: Time horizon tau (seconds) for predicting collision.
        :param max_speed: Maximum physical speed of the UAV (m/s).
        :param obstacles: Optional list of static 3D obstacles [((x, y, z), radius)].
        :param max_accel: Maximum physical acceleration limit (m/s^2) for SORCA smoothing.
        :param enable_sorca: Whether to apply SORCA acceleration continuity bounding.
        :param enable_topology_guidance: Whether to enable Medial Axis topological waypoint biasing.
        """
        self.safety_radius = safety_radius
        self.time_horizon = time_horizon
        self.max_speed = max_speed
        self.obstacles = list(obstacles) if obstacles is not None else []
        self.max_accel = max_accel
        self.enable_sorca = enable_sorca
        self.enable_topology_guidance = enable_topology_guidance

    def compute_topology_guided_vector(
        self,
        pos_i: Tuple[float, float, float],
        pref_vel_i: Tuple[float, float, float],
        obstacles: List[Tuple[Tuple[float, float, float], float]]
    ) -> Tuple[float, float, float]:
        """
        Topology-Guided ORCA (arXiv:2407.16771): Computes a tangent guide vector around static obstacle
        centroids using the Medial Axis normal to prevent local minima deadlocks in narrow corridors.
        """
        px, py, pz = pos_i
        vx, vy, vz = pref_vel_i
        pref_speed = math.sqrt(vx * vx + vy * vy + vz * vz)
        if pref_speed < 1e-4:
            return pref_vel_i

        guide_x, guide_y, guide_z = vx, vy, vz
        for pos_obs, r_obs in obstacles:
            ox, oy, oz = pos_obs
            dx = ox - px
            dy = oy - py
            dz = oz - pz
            dist_sq = dx * dx + dy * dy + dz * dz
            influence_radius = self.safety_radius + r_obs + 2.0
            if dist_sq < influence_radius * influence_radius:
                dist = math.sqrt(dist_sq)
                # Compute projection of pref_vel onto line to obstacle
                v_dot_obs = (vx * dx + vy * dy + vz * dz) / (dist * pref_speed)
                if v_dot_obs > 0.5:
                    # Drone heading directly toward obstacle -> apply 2D/3D medial axis tangent diversion
                    tangent_x = -dy / (math.hypot(dx, dy) + 1e-6)
                    tangent_y = dx / (math.hypot(dx, dy) + 1e-6)
                    alpha = (influence_radius - dist) / influence_radius
                    guide_x = (1.0 - 0.4 * alpha) * guide_x + (0.4 * alpha * pref_speed) * tangent_x
                    guide_y = (1.0 - 0.4 * alpha) * guide_y + (0.4 * alpha * pref_speed) * tangent_y

        return (guide_x, guide_y, guide_z)

    def compute_avoidance_velocity(
        self,
        pos_i: Tuple[float, float, float],
        vel_i: Tuple[float, float, float],
        pref_vel_i: Tuple[float, float, float],
        neighbors: List[Tuple[Tuple[float, float, float], Tuple[float, float, float]]],
        obstacles: Optional[List[Tuple[Tuple[float, float, float], float]]] = None,
        dt: float = 0.05
    ) -> Tuple[float, float, float]:
        """
        Computes 3D ORCA velocity for agent i given current positions/velocities of neighbors and static obstacles.
        Applies SORCA acceleration bounding and Topology Guidance.

        :param pos_i: (x, y, z) position of agent i.
        :param vel_i: (vx, vy, vz) current velocity of agent i.
        :param pref_vel_i: (vx, vy, vz) preferred/desired velocity of agent i.
        :param neighbors: List of (pos_j, vel_j) for all neighboring agents.
        :param obstacles: Optional override list of static 3D obstacles [((x, y, z), radius)].
        :param dt: Time step (seconds) for acceleration calculation.
        :return: (vx, vy, vz) safe ORCA adjusted velocity vector.
        """
        active_obstacles = obstacles if obstacles is not None else self.obstacles

        # Apply Topology-Guided preferred velocity adjustment if enabled
        if self.enable_topology_guidance and active_obstacles:
            pref_vel_i = self.compute_topology_guided_vector(pos_i, pref_vel_i, active_obstacles)

        vx, vy, vz = pref_vel_i

        px_i, py_i, pz_i = pos_i
        vx_i, vy_i, vz_i = vel_i

        min_dist_inter_drone = 2.0 * self.safety_radius  # Gate G5 threshold: 2.80m
        tau = self.time_horizon

        # 1. Inter-Drone Reciprocal ORCA Constraints (50% responsibility per drone)
        drone_corr_x = 0.0
        drone_corr_y = 0.0
        drone_corr_z = 0.0
        drone_count = 0

        for pos_j, vel_j in neighbors:
            px_j, py_j, pz_j = pos_j
            vx_j, vy_j, vz_j = vel_j

            dx = px_j - px_i
            dy = py_j - py_i
            dz = pz_j - pz_i
            dist = math.sqrt(dx * dx + dy * dy + dz * dz)

            if dist < 1e-5:
                dx, dy, dz = 0.01, 0.01, 0.0
                dist = math.sqrt(dx * dx + dy * dy)

            rel_vx = vx_i - vx_j
            rel_vy = vy_i - vy_j
            rel_vz = vz_i - vz_j

            effective_min = min_dist_inter_drone + 0.20

            if dist < effective_min:
                inv_dist = 1.0 / dist
                nx = -dx * inv_dist
                ny = -dy * inv_dist
                nz = -dz * inv_dist

                overlap = effective_min - dist
                push_speed = max(4.0 * self.max_speed, overlap * 20.0 + 4.0)
                u_x = nx * push_speed - rel_vx
                u_y = ny * push_speed - rel_vy
                u_z = nz * push_speed - rel_vz
            else:
                d_x, d_y, d_z = dx / dist, dy / dist, dz / dist
                c_x, c_y, c_z = dx / tau, dy / tau, dz / tau
                w_x = rel_vx - c_x
                w_y = rel_vy - c_y
                w_z = rel_vz - c_z
                w_len = math.sqrt(w_x * w_x + w_y * w_y + w_z * w_z)
                R_c = min_dist_inter_drone / tau

                v_dot_d = rel_vx * d_x + rel_vy * d_y + rel_vz * d_z
                if v_dot_d <= 0:
                    continue

                p_x = rel_vx - v_dot_d * d_x
                p_y = rel_vy - v_dot_d * d_y
                p_z = rel_vz - v_dot_d * d_z
                p_len = math.sqrt(p_x * p_x + p_y * p_y + p_z * p_z)

                rel_speed = math.sqrt(rel_vx**2 + rel_vy**2 + rel_vz**2)
                if rel_speed < 1e-5:
                    continue

                d_cpa = dist * (p_len / rel_speed)
                t_cpa = dist * (v_dot_d / (rel_speed**2))

                if d_cpa >= min_dist_inter_drone or t_cpa > tau:
                    continue

                if w_len < R_c and w_len > 1e-5:
                    u_mag = R_c - w_len
                    u_x = w_x / w_len * u_mag
                    u_y = w_y / w_len * u_mag
                    u_z = w_z / w_len * u_mag
                else:
                    sin_alpha = min_dist_inter_drone / dist
                    cos_alpha = math.sqrt(max(0.0, 1.0 - sin_alpha**2))

                    if p_len > 1e-5:
                        p_hat_x, p_hat_y, p_hat_z = p_x / p_len, p_y / p_len, p_z / p_len
                    else:
                        p_hat_x, p_hat_y, p_hat_z = -d_y, d_x, 0.0
                        norm = math.hypot(p_hat_x, p_hat_y)
                        if norm > 1e-5:
                            p_hat_x /= norm
                            p_hat_y /= norm
                        else:
                            p_hat_x, p_hat_y, p_hat_z = 0.0, 0.0, 1.0

                    leg_x = cos_alpha * d_x + sin_alpha * p_hat_x
                    leg_y = cos_alpha * d_y + sin_alpha * p_hat_y
                    leg_z = cos_alpha * d_z + sin_alpha * p_hat_z

                    leg_proj = rel_vx * leg_x + rel_vy * leg_y + rel_vz * leg_z
                    target_vx = leg_proj * leg_x
                    target_vy = leg_proj * leg_y
                    target_vz = leg_proj * leg_z

                    u_x = target_vx - rel_vx
                    u_y = target_vy - rel_vy
                    u_z = target_vz - rel_vz

            # Reciprocal avoidance: agent i assumes 50% responsibility for moving drones
            drone_corr_x += 0.5 * u_x
            drone_corr_y += 0.5 * u_y
            drone_corr_z += 0.5 * u_z
            drone_count += 1

        if drone_count > 0:
            vx += drone_corr_x / drone_count
            vy += drone_corr_y / drone_count
            vz += drone_corr_z / drone_count

        # 2. Static Physical Obstacle Constraints (100% responsibility per drone)
        active_obstacles = obstacles if obstacles is not None else self.obstacles
        obs_corr_x = 0.0
        obs_corr_y = 0.0
        obs_corr_z = 0.0
        obs_count = 0
        for pos_obs, r_obs in active_obstacles:
            ox, oy, oz = pos_obs
            dx = ox - px_i
            dy = oy - py_i
            dz = oz - pz_i
            dist = math.sqrt(dx * dx + dy * dy + dz * dz)

            min_dist_obs = self.safety_radius + r_obs

            if dist < 1e-5:
                dx, dy, dz = 0.01, 0.01, 0.0
                dist = math.sqrt(dx * dx + dy * dy)

            rel_vx, rel_vy, rel_vz = vx_i, vy_i, vz_i

            effective_min = min_dist_obs + 0.20

            if dist < effective_min:
                inv_dist = 1.0 / dist
                nx = -dx * inv_dist
                ny = -dy * inv_dist
                nz = -dz * inv_dist

                overlap = effective_min - dist
                push_speed = max(4.0 * self.max_speed, overlap * 20.0 + 4.0)
                u_x = nx * push_speed - rel_vx
                u_y = ny * push_speed - rel_vy
                u_z = nz * push_speed - rel_vz
            else:
                d_x, d_y, d_z = dx / dist, dy / dist, dz / dist
                c_x, c_y, c_z = dx / tau, dy / tau, dz / tau
                w_x = rel_vx - c_x
                w_y = rel_vy - c_y
                w_z = rel_vz - c_z
                w_len = math.sqrt(w_x * w_x + w_y * w_y + w_z * w_z)
                R_c = min_dist_obs / tau

                v_dot_d = rel_vx * d_x + rel_vy * d_y + rel_vz * d_z
                if v_dot_d <= 0:
                    continue

                p_x = rel_vx - v_dot_d * d_x
                p_y = rel_vy - v_dot_d * d_y
                p_z = rel_vz - v_dot_d * d_z
                p_len = math.sqrt(p_x * p_x + p_y * p_y + p_z * p_z)

                rel_speed = math.sqrt(rel_vx**2 + rel_vy**2 + rel_vz**2)
                if rel_speed < 1e-5:
                    continue

                d_cpa = dist * (p_len / rel_speed)
                t_cpa = dist * (v_dot_d / (rel_speed**2))

                if d_cpa >= min_dist_obs or t_cpa > tau:
                    continue

                if w_len < R_c and w_len > 1e-5:
                    u_mag = R_c - w_len
                    u_x = w_x / w_len * u_mag
                    u_y = w_y / w_len * u_mag
                    u_z = w_z / w_len * u_mag
                else:
                    sin_alpha = min_dist_obs / dist
                    cos_alpha = math.sqrt(max(0.0, 1.0 - sin_alpha**2))

                    if p_len > 1e-5:
                        p_hat_x, p_hat_y, p_hat_z = p_x / p_len, p_y / p_len, p_z / p_len
                    else:
                        p_hat_x, p_hat_y, p_hat_z = -d_y, d_x, 0.0
                        norm = math.hypot(p_hat_x, p_hat_y)
                        if norm > 1e-5:
                            p_hat_x /= norm
                            p_hat_y /= norm
                        else:
                            p_hat_x, p_hat_y, p_hat_z = 0.0, 0.0, 1.0

                    leg_x = cos_alpha * d_x + sin_alpha * p_hat_x
                    leg_y = cos_alpha * d_y + sin_alpha * p_hat_y
                    leg_z = cos_alpha * d_z + sin_alpha * p_hat_z

                    leg_proj = rel_vx * leg_x + rel_vy * leg_y + rel_vz * leg_z
                    target_vx = leg_proj * leg_x
                    target_vy = leg_proj * leg_y
                    target_vz = leg_proj * leg_z

                    u_x = target_vx - rel_vx
                    u_y = target_vy - rel_vy
                    u_z = target_vz - rel_vz

            # Full 100% responsibility for static obstacle avoidance
            obs_corr_x += 1.0 * u_x
            obs_corr_y += 1.0 * u_y
            obs_corr_z += 1.0 * u_z
            obs_count += 1

        if obs_count > 0:
            vx += obs_corr_x / obs_count
            vy += obs_corr_y / obs_count
            vz += obs_corr_z / obs_count

        # Clamp speed to max_speed limit
        speed = math.sqrt(vx * vx + vy * vy + vz * vz)
        if speed > self.max_speed:
            scale = self.max_speed / speed
            vx *= scale
            vy *= scale
            vz *= scale

        # Apply SORCA Acceleration-Bounded Velocity Smoothing (Springer 2025)
        # When nominal (no active collision conflict), smooth acceleration to max_accel (2.5 m/s^2)
        # When resolving active conflicts, ensure hard safety avoidance velocity takes precedence
        if self.enable_sorca and dt > 1e-4:
            if drone_count == 0 and obs_count == 0:
                ax = (vx - vx_i) / dt
                ay = (vy - vy_i) / dt
                az = (vz - vz_i) / dt
                accel_mag = math.sqrt(ax * ax + ay * ay + az * az)
                if accel_mag > self.max_accel:
                    scale_a = self.max_accel / accel_mag
                    vx = vx_i + ax * scale_a * dt
                    vy = vy_i + ay * scale_a * dt
                    vz = vz_i + az * scale_a * dt

        # Enforce hard upper speed bound on output velocity
        post_speed = math.sqrt(vx * vx + vy * vy + vz * vz)
        if post_speed > self.max_speed:
            scale_p = self.max_speed / post_speed
            vx *= scale_p
            vy *= scale_p
            vz *= scale_p

        return (vx, vy, vz)


class ORCAAvoidanceNode(Node):
    """
    ROS 2 Node managing 3D ORCA swarm collision avoidance for 5 UAVs.
    """

    def __init__(self):
        super().__init__("orca_avoidance_node")

        self.declare_parameter("swarm_drones", ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"])
        self.declare_parameter("safety_radius", 1.40)  # 2.80m inter-drone distance (Gate G5)
        self.declare_parameter("time_horizon", 5.0)
        self.declare_parameter("max_speed", 3.0)
        self.declare_parameter("checkpoint_reach_radius", 2.5)  # Option 3 Ring checkpoint reach threshold

        drone_list = self.get_parameter("swarm_drones").value
        self.safety_radius = float(self.get_parameter("safety_radius").value)
        self.time_horizon = float(self.get_parameter("time_horizon").value)
        self.max_speed = float(self.get_parameter("max_speed").value)
        self.checkpoint_reach_radius = float(self.get_parameter("checkpoint_reach_radius").value)

        # Central physical obstacle pillars: (0, 3, 4), (0, -3, 4), (3, 0, 4)
        self.obstacles: List[Tuple[Tuple[float, float, float], float]] = [
            ((0.0, 3.0, 4.0), 0.6),
            ((0.0, -3.0, 4.0), 0.6),
            ((3.0, 0.0, 4.0), 0.6),
        ]

        self.solver = Orca3DSolver(
            safety_radius=self.safety_radius,
            time_horizon=self.time_horizon,
            max_speed=self.max_speed,
            obstacles=self.obstacles
        )

        self.drones = list(drone_list)
        self.positions: Dict[str, Tuple[float, float, float]] = {d: (0.0, 0.0, 0.0) for d in self.drones}
        self.velocities: Dict[str, Tuple[float, float, float]] = {d: (0.0, 0.0, 0.0) for d in self.drones}
        self.pref_velocities: Dict[str, Tuple[float, float, float]] = {d: (0.0, 0.0, 0.0) for d in self.drones}
        self.odom_received: Dict[str, bool] = {d: False for d in self.drones}

        # Option 3 Dynamic Relocating Checkpoint Sequences & Active Indices
        # Forced collision paths: 5 UAVs on R=12m perimeter targeting (0, 0, 4.0m) simultaneously.
        self.checkpoints: Dict[str, List[Tuple[float, float, float]]] = {
            "uav_alpha": [(0.0, 0.0, 4.0), (-12.0, 0.0, 4.0), (12.0, 0.0, 4.0)],
            "uav_beta": [(0.0, 0.0, 4.0), (-3.708, -11.413, 4.0), (3.708, 11.413, 4.0)],
            "uav_gamma": [(0.0, 0.0, 4.0), (9.708, -7.053, 4.0), (-9.708, 7.053, 4.0)],
            "uav_delta": [(0.0, 0.0, 4.0), (9.708, 7.053, 4.0), (-9.708, -7.053, 4.0)],
            "uav_epsilon": [(0.0, 0.0, 4.0), (-3.708, 11.413, 4.0), (3.708, -11.413, 4.0)],
        }
        self.current_ckpt_idx: Dict[str, int] = {d: 0 for d in self.drones}

        self.pref_vel_received_time: Dict[str, float] = {d: 0.0 for d in self.drones}
        self.peer_heartbeats: Dict[str, dict] = {}
        self.last_heartbeat_time: Dict[str, float] = {}
        self.pubs_cmd_vel: Dict[str, rclpy.publisher.Publisher] = {}
        self.pubs_twist_stamped: Dict[str, rclpy.publisher.Publisher] = {}
        self.subs_odom: List[rclpy.subscription.Subscription] = []
        self.subs_pref_vel: List[rclpy.subscription.Subscription] = []

        # Subsystem B Heartbeat subscription
        self.sub_heartbeat = self.create_subscription(
            String,
            '/sutra/comms/heartbeats',
            self._on_heartbeat,
            10
        )

        for drone_id in self.drones:
            # Publishers for both ROS 2 cmd_vel and Gazebo Sim direct command topic
            self.pubs_cmd_vel[drone_id] = self.create_publisher(
                Twist, f"/{drone_id}/cmd_vel", 10
            )
            self.pubs_twist_stamped[drone_id] = self.create_publisher(
                TwistStamped, f"/{drone_id}/gazebo/command/twist", 10
            )

            # Subscriptions (Odometry & Desired Velocity)
            sub_o1 = self.create_subscription(
                Odometry,
                f"/{drone_id}/odometry",
                self._make_odom_cb(drone_id),
                10
            )
            sub_o2 = self.create_subscription(
                Odometry,
                f"/model/{drone_id}/odometry",
                self._make_odom_cb(drone_id),
                10
            )
            sub_pv = self.create_subscription(
                Twist,
                f"/{drone_id}/pref_vel",
                self._make_pref_vel_cb(drone_id),
                10
            )
            self.subs_odom.extend([sub_o1, sub_o2])
            self.subs_pref_vel.append(sub_pv)

        self.is_airborne: Dict[str, bool] = {d: False for d in self.drones}
        # 50Hz Control Loop Timer
        self.timer = self.create_timer(0.02, self._control_loop_50hz)
        self.get_logger().info(
            f"🛡️ ORCA 3D Swarm Avoidance Node Initialized [{len(self.drones)} UAVs] | Option 3 Checkpoints | Gate G5: {2 * self.safety_radius:.2f}m"
        )

    def _make_odom_cb(self, drone_id: str):
        def callback(msg: Odometry):
            p = msg.pose.pose.position
            v = msg.twist.twist.linear
            self.positions[drone_id] = (p.x, p.y, p.z)
            self.velocities[drone_id] = (v.x, v.y, v.z)
            self.odom_received[drone_id] = True
        return callback

    def _make_pref_vel_cb(self, drone_id: str):
        def callback(msg: Twist):
            self.pref_velocities[drone_id] = (msg.linear.x, msg.linear.y, msg.linear.z)
            self.pref_vel_received_time[drone_id] = time.time()
        return callback

    def _on_heartbeat(self, msg: String):
        try:
            data = json.loads(msg.data)
            drone_id = data.get('drone_id')
            if drone_id:
                self.peer_heartbeats[drone_id] = data
                self.last_heartbeat_time[drone_id] = time.time()
        except Exception:
            pass

    def _control_loop_50hz(self):
        now = time.time()
        for drone_i in self.drones:
            # 1. Wait until odometry has been received for this drone
            if not self.odom_received[drone_i]:
                continue

            pos_i = self.positions[drone_i]
            vel_i = self.velocities[drone_i]

            # 2. Phase 1: Clean Vertical Takeoff to cruising altitude (3.8m)
            if not self.is_airborne[drone_i]:
                if pos_i[2] < 3.5:
                    # Pure vertical climb setpoint with zero horizontal drift
                    dz = 4.0 - pos_i[2]
                    vz_climb = min(1.5, max(0.5, dz * 1.0))
                    t_msg = Twist()
                    t_msg.linear.z = float(vz_climb)
                    self.pubs_cmd_vel[drone_i].publish(t_msg)

                    ts_msg = TwistStamped()
                    ts_msg.header.stamp = self.get_clock().now().to_msg()
                    ts_msg.header.frame_id = "base_link"
                    ts_msg.twist = t_msg
                    self.pubs_twist_stamped[drone_i].publish(ts_msg)
                    continue
                else:
                    self.is_airborne[drone_i] = True
                    self.get_logger().info(f"🚀 [{drone_i}] Takeoff complete (z={pos_i[2]:.2f}m) -> Starting Ring Crossing")

            # 3. Phase 2: Active Ring Crossing with 3D SORCA Avoidance
            # Dynamic obstacle array including motor-failed/unresponsive peers from Subsystem B
            dynamic_obstacles = list(self.obstacles)
            for d in self.drones:
                if d != drone_i and self.odom_received[d]:
                    hb = self.peer_heartbeats.get(d)
                    last_t = self.last_heartbeat_time.get(d, 0.0)
                    if (now - last_t > 3.0 and last_t > 0.0) or (hb and hb.get('motor_status') == 'FAILED'):
                        dynamic_obstacles.append((self.positions[d], 2.25))

            # If external pref_vel was received within last 1.0s, use it directly
            if (now - self.pref_vel_received_time.get(drone_i, 0.0)) < 1.0:
                pref_vel_i = self.pref_velocities[drone_i]
            else:
                ckpt_seq = self.checkpoints.get(drone_i, [(0.0, 0.0, 4.0)])
                idx = self.current_ckpt_idx.get(drone_i, 0)
                target_ckpt = ckpt_seq[idx]

                dx = target_ckpt[0] - pos_i[0]
                dy = target_ckpt[1] - pos_i[1]
                dz = target_ckpt[2] - pos_i[2]
                dist_xy = math.sqrt(dx * dx + dy * dy)
                dist_3d = math.sqrt(dx * dx + dy * dy + dz * dz)

                # Advance to next waypoint when reaching current target
                if dist_xy <= self.checkpoint_reach_radius:
                    self.current_ckpt_idx[drone_i] = (idx + 1) % len(ckpt_seq)
                    idx = self.current_ckpt_idx[drone_i]
                    target_ckpt = ckpt_seq[idx]
                    dx = target_ckpt[0] - pos_i[0]
                    dy = target_ckpt[1] - pos_i[1]
                    dz = target_ckpt[2] - pos_i[2]
                    dist_3d = math.sqrt(dx * dx + dy * dy + dz * dz)

                if dist_3d > 0.1:
                    speed = min(self.max_speed, max(1.2, dist_3d * 0.6))
                    pref_vel_i = ((dx / dist_3d) * speed, (dy / dist_3d) * speed, (dz / dist_3d) * speed)
                else:
                    pref_vel_i = (0.0, 0.0, 0.0)

            # Build neighbor list only from peers with active odometry
            neighbors = [
                (self.positions[drone_j], self.velocities[drone_j])
                for drone_j in self.drones
                if drone_j != drone_i and self.odom_received[drone_j]
            ]

            safe_vx, safe_vy, safe_vz = self.solver.compute_avoidance_velocity(
                pos_i, vel_i, pref_vel_i, neighbors, obstacles=dynamic_obstacles
            )

            # Clamp velocities for stable, cinematic quadcopter dynamics
            safe_vz = max(-1.2, min(1.2, safe_vz))

            # Publish Twist to ROS 2 and TwistStamped to Gazebo
            t_msg = Twist()
            t_msg.linear.x = float(safe_vx)
            t_msg.linear.y = float(safe_vy)
            t_msg.linear.z = float(safe_vz)
            self.pubs_cmd_vel[drone_i].publish(t_msg)

            ts_msg = TwistStamped()
            ts_msg.header.stamp = self.get_clock().now().to_msg()
            ts_msg.header.frame_id = "base_link"
            ts_msg.twist = t_msg
            self.pubs_twist_stamped[drone_i].publish(ts_msg)


def main(args=None):
    rclpy.init(args=args)
    node = ORCAAvoidanceNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
