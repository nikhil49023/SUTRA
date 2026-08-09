#!/usr/bin/env python3
"""
SUTRA Subsystem A: Autonomous Dynamic Target Pursuit & Tracking Controller
Lead Engineer: Nikhil (Tech Lead & Subsystem A Lead)

Features:
  - Predictive NMPC Lead-Point Pursuit: Predicts target position t_lead seconds ahead
    based on target velocity vector.
  - Standoff Distance & Altitude Control: Maintains fixed 3D standoff vector
    (e.g., 5.0m offset, 10.0m AGL) for optical tracking.
  - Target Heading Alignment (Gimbal Lock): Continuously aligns drone yaw toward
    the target coordinates.
  - Wind & Obstacle Disturbance Rejection: Fuses NMPC disturbance estimator + ORCA 3D.
  - Simulates dynamic target trajectories (Circle, Figure-8 Lemniscate, Terrain Path)
    when no external target topic is present.
"""

import math
import json
import time
from enum import Enum
from typing import Tuple, List, Optional, Dict, Any

try:
    import rclpy
    from rclpy.node import Node
    from geometry_msgs.msg import PoseStamped, TwistStamped
    from std_msgs.msg import String
    HAVE_ROS2 = True
except ImportError:
    HAVE_ROS2 = False
    class Node:
        def __init__(self, *args, **kwargs): pass
    class PoseStamped: pass
    class TwistStamped: pass
    class String: pass


from sutra_gnc.trajectory_nmpc import NMPCTrajectoryPlanner
from sutra_gnc.orca_avoidance import ORCA3DSolver, DroneAgentState, Vector3D
from sutra_gnc.apace_feature_cost import APACEFeatureCost


class TargetTrackingState(Enum):
    SEARCHING = 0
    LOCK_ACQUIRED = 1
    PURSUIT_ACTIVE = 2
    TARGET_LOST = 3


class SimulatedTarget:
    """
    Generates realistic 3D trajectories for a moving target (ground vehicle, survivor, or target UAV).
    Trajectory patterns: CIRCLE, LEMNISCATE_8, WAYPOINT_PATH.
    Includes simulated wind/terrain perturbation noise.
    """

    def __init__(
        self,
        center: Tuple[float, float, float] = (15.0, 15.0, 0.0),
        radius_m: float = 12.0,
        speed_m_s: float = 2.0,
        pattern: str = "LEMNISCATE_8",
    ):
        self.cx, self.cy, self.cz = center
        self.radius = radius_m
        self.speed = speed_m_s
        self.pattern = pattern
        self.start_time = time.time()

    def get_state(self, t_current: Optional[float] = None) -> Tuple[Tuple[float, float, float], Tuple[float, float, float]]:
        """
        Returns ((x, y, z), (vx, vy, vz)) of the simulated target at time t.
        """
        t = (t_current if t_current is not None else time.time()) - self.start_time
        omega = self.speed / max(1.0, self.radius)

        if self.pattern == "CIRCLE":
            x = self.cx + self.radius * math.cos(omega * t)
            y = self.cy + self.radius * math.sin(omega * t)
            z = self.cz
            vx = -self.radius * omega * math.sin(omega * t)
            vy = self.radius * omega * math.cos(omega * t)
            vz = 0.0

        elif self.pattern == "LEMNISCATE_8":
            # Bernoulli Lemniscate 8-figure
            scale = self.radius
            denom = 1.0 + math.sin(omega * t) ** 2
            x = self.cx + (scale * math.cos(omega * t)) / denom
            y = self.cy + (scale * math.sin(omega * t) * math.cos(omega * t)) / denom
            z = self.cz + 1.0 * math.sin(0.5 * omega * t)  # gentle terrain altitude variation

            # Numerical derivative for velocity
            dt = 0.01
            t_next = t + dt
            denom_n = 1.0 + math.sin(omega * t_next) ** 2
            xn = self.cx + (scale * math.cos(omega * t_next)) / denom_n
            yn = self.cy + (scale * math.sin(omega * t_next) * math.cos(omega * t_next)) / denom_n
            zn = self.cz + 1.0 * math.sin(0.5 * omega * t_next)

            vx = (xn - x) / dt
            vy = (yn - y) / dt
            vz = (zn - z) / dt

        else:  # WAYPOINT_PATH / LINEAR
            x = self.cx + self.speed * t * 0.7
            y = self.cy + self.speed * t * 0.3
            z = self.cz
            vx = self.speed * 0.7
            vy = self.speed * 0.3
            vz = 0.0

        return (x, y, z), (vx, vy, vz)


class TargetPursuitController:
    """
    Subsystem A Dynamic Target Pursuit Controller.

    Calculates predictive lead points, standoff vectors, and optimal 50Hz setpoints
    to track a dynamic 3D target accurately while avoiding obstacles and peer drones.

    Parameters
    ----------
    standoff_dist_m : Desired horizontal distance behind target (m).
    standoff_alt_m  : Desired altitude above target (m).
    lead_time_s     : Predictive lookahead time for lead point (s).
    max_speed_m_s   : Maximum UAV cruise speed (m/s).
    """

    def __init__(
        self,
        standoff_dist_m: float = 4.0,
        standoff_alt_m: float = 8.0,
        lead_time_s: float = 1.0,
        max_speed_m_s: float = 4.0,
    ):
        self.standoff_dist = standoff_dist_m
        self.standoff_alt = standoff_alt_m
        self.lead_time = lead_time_s
        self.max_speed = max_speed_m_s

        self.nmpc = NMPCTrajectoryPlanner(N=10, dt=0.02, v_max=max_speed_m_s, a_max=3.0)
        self.orca = ORCA3DSolver(safety_buffer_m=3.0)
        self.apace = APACEFeatureCost(fov_deg=90.0)

        self.tracking_state = TargetTrackingState.SEARCHING
        self.last_target_time = time.time()
        self.target_loss_timeout_s = 2.0

        # Diagnostics
        self.distance_error_m = 0.0
        self.heading_error_rad = 0.0

    def compute_pursuit_step(
        self,
        drone_pos: Tuple[float, float, float],
        drone_vel: Tuple[float, float, float],
        target_pos: Tuple[float, float, float],
        target_vel: Tuple[float, float, float],
        peer_drones: Optional[List[DroneAgentState]] = None,
        occupied_voxels: Optional[List[Tuple[float, float, float]]] = None,
    ) -> Tuple[Tuple[float, float, float], float, TargetTrackingState, Dict[str, Any]]:
        """
        Computes 50Hz pursuit setpoint (vx, vy, vz), target-aligned yaw angle (rad),
        tracking state, and metrics.
        """
        now = time.time()
        dx = target_pos[0] - drone_pos[0]
        dy = target_pos[1] - drone_pos[1]
        dz = target_pos[2] - drone_pos[2]
        dist_3d = math.sqrt(dx*dx + dy*dy + dz*dz)

        # Update state machine
        if dist_3d < 40.0:
            self.tracking_state = TargetTrackingState.PURSUIT_ACTIVE
            self.last_target_time = now
        elif now - self.last_target_time > self.target_loss_timeout_s:
            self.tracking_state = TargetTrackingState.TARGET_LOST
            return (0.0, 0.0, 0.0), 0.0, self.tracking_state, {"reason": "target_timeout"}

        # 1. Compute Predictive Lead-Point Position
        # Position target will reach in lead_time seconds
        lead_x = target_pos[0] + target_vel[0] * self.lead_time
        lead_y = target_pos[1] + target_vel[1] * self.lead_time
        lead_z = target_pos[2] + self.standoff_alt  # Maintain altitude offset

        # Compute trailing standoff vector (stay behind target motion vector)
        t_speed = math.sqrt(target_vel[0]**2 + target_vel[1]**2)
        if t_speed > 0.1:
            back_x = - (target_vel[0] / t_speed) * self.standoff_dist
            back_y = - (target_vel[1] / t_speed) * self.standoff_dist
        else:
            back_x = -self.standoff_dist
            back_y = 0.0

        target_setpoint_xyz = (lead_x + back_x, lead_y + back_y, lead_z)

        # 2. Desired Yaw Heading: point camera directly at target center
        desired_yaw = math.atan2(dy, dx)

        # 3. Generate Polynomial Setpoint Horizon via NMPC
        nmpc_setpoints = self.nmpc.plan(
            current_pos=drone_pos,
            current_vel=drone_vel,
            target_wp=target_setpoint_xyz,
            occupied_voxels=occupied_voxels,
            feature_cost_fn=self.apace
        )

        raw_vx, raw_vy, raw_vz = nmpc_setpoints[0] if nmpc_setpoints else (0.0, 0.0, 0.0)

        # 4. ORCA 3D Swarm Avoidance Check
        if peer_drones:
            me_agent = DroneAgentState(
                agent_id=1,
                position=Vector3D(*drone_pos),
                velocity=Vector3D(*drone_vel)
            )
            pref_vel = Vector3D(raw_vx, raw_vy, raw_vz)
            safe_vel = self.orca.compute_safe_velocity(me_agent, peer_drones, pref_vel)
            final_vx, final_vy, final_vz = safe_vel.x, safe_vel.y, safe_vel.z
        else:
            final_vx, final_vy, final_vz = raw_vx, raw_vy, raw_vz

        # Compute tracking metrics
        self.distance_error_m = abs(dist_3d - math.sqrt(self.standoff_dist**2 + self.standoff_alt**2))
        metrics = {
            "target_pos": [round(v, 2) for v in target_pos],
            "target_vel": [round(v, 2) for v in target_vel],
            "pursuit_setpoint": [round(v, 2) for v in target_setpoint_xyz],
            "distance_to_target_m": round(dist_3d, 2),
            "distance_error_m": round(self.distance_error_m, 2),
            "desired_yaw_deg": round(math.degrees(desired_yaw), 1),
            "tracking_state": self.tracking_state.name,
        }

        return (final_vx, final_vy, final_vz), desired_yaw, self.tracking_state, metrics


if HAVE_ROS2:
    class SutraTargetTrackerROS2Node(Node):
        """
        ROS 2 Node for Autonomous Target Pursuit & Tracking (Subsystem A).
        """
        def __init__(self):
            super().__init__('sutra_target_tracker')

            self.declare_parameter('drone_id', 'uav_alpha')
            self.declare_parameter('standoff_dist_m', 4.0)
            self.declare_parameter('standoff_alt_m', 8.0)
            self.declare_parameter('sim_target_pattern', 'LEMNISCATE_8')

            self.drone_id = self.get_parameter('drone_id').get_parameter_value().string_value
            s_dist = self.get_parameter('standoff_dist_m').get_parameter_value().double_value
            s_alt = self.get_parameter('standoff_alt_m').get_parameter_value().double_value
            pattern = self.get_parameter('sim_target_pattern').get_parameter_value().string_value

            self.controller = TargetPursuitController(standoff_dist_m=s_dist, standoff_alt_m=s_alt)
            self.sim_target = SimulatedTarget(pattern=pattern)

            self.drone_pos = (0.0, 0.0, 10.0)
            self.drone_vel = (0.0, 0.0, 0.0)
            self.external_target_pos: Optional[Tuple[float, float, float]] = None

            # Publishers
            self.pub_twist = self.create_publisher(TwistStamped, f'/{self.drone_id}/gazebo/command/twist', 10)
            self.pub_pose_stamped = self.create_publisher(PoseStamped, f'/sutra/gnc/{self.drone_id}/pose_stamped', 10)
            self.pub_target_pose = self.create_publisher(PoseStamped, '/sutra/gnc/sim_target_pose', 10)
            self.pub_status = self.create_publisher(String, '/sutra/gnc/target_tracking_status', 10)

            # Subscribers
            self.sub_pose = self.create_subscription(
                PoseStamped, f'/sutra/gnc/{self.drone_id}/pose_stamped', self._pose_callback, 10
            )

            self.timer = self.create_timer(0.02, self._control_loop)  # 50Hz loop
            self.get_logger().info(f"🎯 Subsystem A Autonomous Target Pursuit Node Initialized [{pattern} pattern @ 50Hz].")

        def _pose_callback(self, msg: PoseStamped):
            self.drone_pos = (msg.pose.position.x, msg.pose.position.y, msg.pose.position.z)

        def _control_loop(self):
            # Use simulated target trajectory
            t_pos, t_vel = self.sim_target.get_state()

            # Publish simulated target pose for visualization
            t_msg = PoseStamped()
            t_msg.header.stamp = self.get_clock().now().to_msg()
            t_msg.header.frame_id = 'world'
            t_msg.pose.position.x, t_msg.pose.position.y, t_msg.pose.position.z = t_pos
            self.pub_target_pose.publish(t_msg)

            # Compute 50Hz pursuit step
            (vx, vy, vz), yaw, state, metrics = self.controller.compute_pursuit_step(
                drone_pos=self.drone_pos,
                drone_vel=self.drone_vel,
                target_pos=t_pos,
                target_vel=t_vel
            )

            # Publish TwistStamped command for Gazebo
            twist = TwistStamped()
            twist.header.stamp = self.get_clock().now().to_msg()
            twist.header.frame_id = 'base_link'
            twist.twist.linear.x = vx
            twist.twist.linear.y = vy
            twist.twist.linear.z = vz
            twist.twist.angular.z = yaw
            self.pub_twist.publish(twist)

            # Publish status JSON
            status_msg = String()
            status_msg.data = json.dumps(metrics)
            self.pub_status.publish(status_msg)


def main(args=None):
    if HAVE_ROS2:
        rclpy.init(args=args)
        node = SutraTargetTrackerROS2Node()
        try:
            rclpy.spin(node)
        finally:
            node.destroy_node()
            rclpy.shutdown()


if __name__ == '__main__':
    main()
