#!/usr/bin/env python3
"""
PROJECT SUTRA — SUTRA-FSD: Full Self-Flying Autonomous Swarm Autopilot Node
==========================================================================
Author: Tech Lead Nikhil (Subsystem A Lead)
Location: sutra_ws/src/sutra_gnc/sutra_gnc/sutra_fsd_autopilot_node.py

Autonomous Flight Controller modeled after Tesla Autopilot / FSD:
1. Spatio-Temporal 3D Metric Voxel Occupancy Map (SutraFsdOccupancyGrid)
2. Quintic Polynomial Trajectory Ribbon Optimization with Cost Volume (SutraFsdTrajectoryPlanner)
3. Control Barrier Function (CBF) Hard Mathematical Safety Shield
4. Neuro-Adaptive Wind/Aerodynamic Disturbance Feedforward Compensation (SutraNeuroFlightNet)
"""

import os
import math
import numpy as np
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import TwistStamped, PoseStamped
from nav_msgs.msg import Odometry
from sensor_msgs.msg import Imu, LaserScan
from visualization_msgs.msg import Marker, MarkerArray
from std_msgs.msg import ColorRGBA
from geometry_msgs.msg import Point

from sutra_gnc.sutra_fsd_occupancy import SutraFsdOccupancyGrid
from sutra_gnc.sutra_fsd_trajectory_planner import SutraFsdTrajectoryPlanner, Trajectory3D
from sutra_gnc.sutra_cbf_safety_shield import ControlBarrierSafetyShield


class SutraFsdAutopilotNode(Node):
    """
    Tesla FSD-Style Autonomous Swarm Drone Controller.
    """

    def __init__(self):
        super().__init__("sutra_fsd_autopilot_node")

        # ── Parameters ────────────────────────────────────────────────────────
        self.declare_parameter("drone_id", "uav_alpha")
        self.declare_parameter("cruise_speed", 3.2)
        self.declare_parameter("time_horizon", 3.0)
        self.declare_parameter("safety_radius", 2.80)  # Gate G5
        self.declare_parameter("use_sim_time", True)

        self.drone_id = self.get_parameter("drone_id").value
        self.cruise_speed = float(self.get_parameter("cruise_speed").value)
        self.horizon = float(self.get_parameter("time_horizon").value)
        self.safety_radius = float(self.get_parameter("safety_radius").value)

        # ── FSD Core Engines ──────────────────────────────────────────────────
        self.occupancy_map = SutraFsdOccupancyGrid(grid_dim_xy=32, grid_dim_z=16, resolution=1.0)
        self.planner = SutraFsdTrajectoryPlanner(time_horizon=self.horizon, max_speed=self.cruise_speed)
        self.cbf_shield = ControlBarrierSafetyShield(safety_radius=self.safety_radius)

        # State
        self.pos = (0.0, 0.0, 0.0)
        self.vel = (0.0, 0.0, 0.0)
        self.acc = (0.0, 0.0, 0.0)
        self.dist_force = (0.0, 0.0, 0.0)  # Aerodynamic disturbance feedforward from SutraNeuroFlight
        self.has_pose = False
        self.is_airborne = False
        self.active_trajectory: Trajectory3D = None
        self.traj_start_time = self.get_clock().now()

        # Multi-Layered 3D Echelon Swarm Routes (Gate G5 compliant - altitudes 3.6m to 4.4m)
        default_swarm_routes = {
            "uav_alpha": [(-12.0, 0.0, 3.6), (12.0, 0.0, 3.6), (-12.0, 0.0, 3.6)],   # West -> East
            "uav_beta":  [(12.0, 0.0, 3.8), (-12.0, 0.0, 3.8), (12.0, 0.0, 3.8)],    # East -> West
            "uav_gamma": [(0.0, 12.0, 4.0), (0.0, -12.0, 4.0), (0.0, 12.0, 4.0)],   # North -> South
            "uav_delta": [(0.0, -12.0, 4.2), (0.0, 12.0, 4.2), (0.0, -12.0, 4.2)],  # South -> North
            "uav_epsilon": [(0.0, 0.0, 4.4), (6.0, 6.0, 4.4), (0.0, 8.0, 4.4), (-6.0, 6.0, 4.4), (-8.0, 0.0, 4.4), (0.0, -8.0, 4.4), (6.0, -6.0, 4.4)], # Center Orbit
        }
        self.waypoints = default_swarm_routes.get(self.drone_id, [(0.0, 0.0, 4.0), (10.0, 0.0, 4.0), (-10.0, 0.0, 4.0)])
        self.wp_idx = 0

        # Peer swarm states: id -> ((x,y,z), (vx,vy,vz))
        self.peer_states = {}

        # ── Publishers ────────────────────────────────────────────────────────
        self.pub_twist = self.create_publisher(TwistStamped, f"/{self.drone_id}/gazebo/command/twist", 10)
        self.pub_ribbon_markers = self.create_publisher(MarkerArray, f"/sutra/fsd/{self.drone_id}/trajectory_ribbon", 10)
        self.pub_pose = self.create_publisher(PoseStamped, f"/sutra/gnc/{self.drone_id}/pose_stamped", 10)

        # ── Subscriptions ─────────────────────────────────────────────────────
        self.create_subscription(Odometry, f"/model/{self.drone_id}/odometry", self._on_odom, 10)
        self.create_subscription(LaserScan, f"/{self.drone_id}/rangefinder/distance", self._on_laser, 10)

        # Subscriptions for Cross-Subsystem Neural & Swarm Interfacing
        self.create_subscription(
            TwistStamped, f"/{self.drone_id}/neuro_flight/feedforward_twist", self._on_neuro_feedforward, 10
        )
        self.create_subscription(
            PoseStamped, f"/sutra/gnc/{self.drone_id}/retask_target", self._on_retask_target, 10
        )

        # Subscribe to all peer drones for 3D Occupancy & CBF Safety
        for peer_id in ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]:
            if peer_id != self.drone_id:
                self.create_subscription(
                    Odometry,
                    f"/model/{peer_id}/odometry",
                    lambda msg, pid=peer_id: self._on_peer_odom(msg, pid),
                    10,
                )

        # 50Hz Autopilot Loop
        self.timer = self.create_timer(0.02, self._autopilot_loop_50hz)
        self.get_logger().info(f"🚗✈️ [{self.drone_id}] SUTRA-FSD Autopilot ACTIVE — 3D Echelon & NeuroFlight Feedforward Enabled")

    def _on_neuro_feedforward(self, msg: TwistStamped):
        """Captures 3D aerodynamic disturbance force from SutraNeuroFlightNet."""
        self.dist_force = (msg.twist.linear.x, msg.twist.linear.y, msg.twist.linear.z)

    def _on_retask_target(self, msg: PoseStamped):
        """Dynamically retasks waypoint queue upon SwarmRAFT consensus target lock."""
        p = msg.pose.position
        target_z = self.waypoints[0][2] if len(self.waypoints) > 0 else 4.0
        self.waypoints = [(p.x, p.y, target_z)]
        self.wp_idx = 0
        self.get_logger().info(f"🎯 [{self.drone_id}] SUTRA-FSD Retasked to ({p.x:.2f}, {p.y:.2f}, {target_z:.2f})")


    def _on_odom(self, msg: Odometry):
        p = msg.pose.pose.position
        v = msg.twist.twist.linear
        self.pos = (p.x, p.y, p.z)
        self.vel = (v.x, v.y, v.z)
        self.has_pose = True

        ps = PoseStamped()
        ps.header.stamp = self.get_clock().now().to_msg()
        ps.header.frame_id = "world"
        ps.pose = msg.pose.pose
        self.pub_pose.publish(ps)

    def _on_peer_odom(self, msg: Odometry, peer_id: str):
        p = msg.pose.pose.position
        v = msg.twist.twist.linear
        peer_pos = (p.x, p.y, p.z)
        peer_vel = (v.x, v.y, v.z)
        self.peer_states[peer_id] = (peer_pos, peer_vel)

        # Inject peer safety bubble into 3D Occupancy Grid
        if self.has_pose:
            self.occupancy_map.insert_peer_drone_safety_bubble(peer_pos, peer_vel, self.pos, self.safety_radius)

    def _on_laser(self, msg: LaserScan):
        # Insert rangefinder ground obstacles into occupancy map
        if self.has_pose and len(msg.ranges) > 0:
            r = msg.ranges[0]
            if not math.isnan(r) and not math.isinf(r):
                obst_pt = np.array([[self.pos[0], self.pos[1], max(0.0, self.pos[2] - r)]], dtype=np.float32)
                self.occupancy_map.insert_point_cloud(obst_pt, self.pos)

    def _autopilot_loop_50hz(self):
        if not self.has_pose:
            return

        # Phase 1: Vertical Takeoff Clamping
        target_z = self.waypoints[self.wp_idx][2]
        if not self.is_airborne:
            dz = target_z - self.pos[2]
            if abs(dz) > 0.35:
                self._send_twist(0.0, 0.0, min(1.2, max(-1.2, dz * 1.5)))
                return
            else:
                self.is_airborne = True
                self.get_logger().info(f"🚀 [{self.drone_id}] Airborne — Engaging FSD Trajectory Optimization")

        # Phase 2: Waypoint Progress Check
        goal_pt = self.waypoints[self.wp_idx]
        dist_to_goal = math.dist(self.pos, goal_pt)
        if dist_to_goal < 2.0:
            self.wp_idx = (self.wp_idx + 1) % len(self.waypoints)
            goal_pt = self.waypoints[self.wp_idx]

        # Phase 3: Tesla-Style Quintic Spline Cost-Volume Optimization
        best_traj = self.planner.plan(
            current_pos=self.pos,
            current_vel=self.vel,
            current_acc=self.acc,
            goal_pos=goal_pt,
            occupancy_grid=self.occupancy_map,
        )
        self.active_trajectory = best_traj

        # Evaluate desired state at t = 0.1s lookahead
        _, desired_vel, desired_acc = best_traj.get_state_at(t=0.10)

        # Phase 4: Control Barrier Function (CBF) Hard Mathematical Shield
        neighbors = list(self.peer_states.values())
        safe_ax, safe_ay, safe_az = self.cbf_shield.filter_acceleration(
            own_pos=self.pos,
            own_vel=self.vel,
            desired_acc=desired_acc,
            neighbors=neighbors,
        )
        self.acc = (safe_ax, safe_ay, safe_az)

        # Integrate safe acceleration + SutraNeuroFlight aerodynamic disturbance cancellation
        # If wind/downwash pushes (+fx), feedforward applies proactive (-fx) counter-acceleration
        ff_ax = - 0.35 * self.dist_force[0]
        ff_ay = - 0.35 * self.dist_force[1]
        ff_az = - 0.35 * self.dist_force[2]

        total_ax = safe_ax + ff_ax
        total_ay = safe_ay + ff_ay
        total_az = safe_az + ff_az

        cmd_vx = self.vel[0] + total_ax * 0.02
        cmd_vy = self.vel[1] + total_ay * 0.02
        cmd_vz = self.vel[2] + total_az * 0.02


        # Clamp speed to cruise speed
        speed = math.sqrt(cmd_vx**2 + cmd_vy**2 + cmd_vz**2)
        if speed > self.cruise_speed:
            scale = self.cruise_speed / speed
            cmd_vx *= scale
            cmd_vy *= scale
            cmd_vz *= scale

        self._send_twist(cmd_vx, cmd_vy, cmd_vz)

    def _send_twist(self, vx: float, vy: float, vz: float):
        msg = TwistStamped()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = "world"
        msg.twist.linear.x = float(vx)
        msg.twist.linear.y = float(vy)
        msg.twist.linear.z = float(vz)
        self.pub_twist.publish(msg)


def main(args=None):
    rclpy.init(args=args)
    node = SutraFsdAutopilotNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
