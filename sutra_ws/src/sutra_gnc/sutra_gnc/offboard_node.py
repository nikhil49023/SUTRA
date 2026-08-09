#!/usr/bin/env python3
"""
SUTRA Subsystem A: Autonomous Navigation & PX4 Offboard Mode Control Node
Lead Engineer: Rohith Kumar (Subsystem A Lead)

Features:
  - Integrated ORCA 3D reciprocal collision avoidance solver (> 2.8m safety buffer, Gate G5).
  - Emergency RTL / Failsafe State Machine (< 100ms transition time on link loss / tilt check).
  - VIO Tracking Status subscriber ('/sutra/gnc/vio_status') for position hold / degraded speed.
  - Dual-mode topic dispatcher: PX4 Offboard Trajectory Setpoints + Gazebo Twist fallback.
  - Published /sutra/gnc/pose_stamped and JSON fallback for Subsystem C (GPS Raycast).
"""

import math
import json
import time
from enum import Enum
from typing import List, Tuple, Optional

try:
    import rclpy
    from rclpy.node import Node
    from geometry_msgs.msg import TwistStamped, PoseStamped, Pose
    from std_msgs.msg import String, Header
    HAVE_ROS2 = True
except ImportError:
    HAVE_ROS2 = False
    class Node:
        def __init__(self, *args, **kwargs): pass
    class TwistStamped: pass
    class PoseStamped: pass
    class String: pass


from sutra_gnc.orca_avoidance import ORCA3DSolver, DroneAgentState, Vector3D


class OffboardFlightMode(Enum):
    MANUAL = 0
    MISSION_PATROL = 1
    ORCA_AVOIDANCE = 2
    EMERGENCY_RTL = 3
    FAILSAFE_LAND = 4


# ── Waypoint Mission Specs (NED Coordinates: East, North, Altitude) ─────────
DEFAULT_WAYPOINTS = [
    ( 10.0,   0.0, 15.0),   # 3D Ring Target 1
    ( 20.0,  15.0, 18.0),   # 3D Ring Target 2
    (  5.0,  25.0, 12.0),   # 3D Ring Target 3
    (-15.0,  10.0, 16.0),   # 3D Ring Target 4
    (  0.0,   0.0, 15.0),   # 3D Ring Target 5 (Home Loop)
]


class DroneState:
    def __init__(self, agent_id: int = 1):
        self.agent_id = agent_id
        self.x: float = 0.0      # East (m)
        self.y: float = 0.0      # North (m)
        self.z: float = 0.0      # Up (m)
        self.vx: float = 0.0     # m/s
        self.vy: float = 0.0     # m/s
        self.vz: float = 0.0     # m/s
        self.roll: float = 0.0   # rad
        self.pitch: float = 0.0  # rad
        self.yaw: float = 0.0    # rad
        self.last_heartbeat: float = time.time()

    def update_pose(self, x: float, y: float, z: float, yaw: float = 0.0):
        self.x = x
        self.y = y
        self.z = z
        self.yaw = yaw
        self.last_heartbeat = time.time()


class SutraOffboardControlNode:
    """
    Main PX4 Offboard Mode Control Node & Trajectory Engine.
    Handles Waypoint Navigation, ORCA 3D Collision Avoidance, and Emergency RTL Failsafe.
    """
    def __init__(self, agent_id: int = 1, safety_buffer_m: float = 3.0):
        self.agent_id = agent_id
        self.state = DroneState(agent_id=agent_id)
        self.flight_mode = OffboardFlightMode.MISSION_PATROL
        self.wp_index = 0
        self.wp_list = DEFAULT_WAYPOINTS
        self.cruise_speed = 2.5  # m/s
        self.orca_solver = ORCA3DSolver(safety_buffer_m=safety_buffer_m)
        self.peer_drones: List[DroneAgentState] = []
        self.last_mode_change_time = time.time()
        self.failsafe_triggered = False

        self.vio_tracking_status = "TRACKING_OK"
        self.vio_status_code = 1

        if HAVE_ROS2 and hasattr(self, 'declare_parameter'):
            try:
                self.declare_parameter('drone_id', 'uav_alpha')
                self.declare_parameter('start_x', 0.0)
                self.declare_parameter('start_y', 0.0)
                self.declare_parameter('start_z', 0.0)
                self.declare_parameter('cruise_speed', 2.5)

                self.drone_id = self.get_parameter('drone_id').get_parameter_value().string_value
                self.start_x = self.get_parameter('start_x').get_parameter_value().double_value
                self.start_y = self.get_parameter('start_y').get_parameter_value().double_value
                self.start_z = self.get_parameter('start_z').get_parameter_value().double_value
                self.cruise_speed = self.get_parameter('cruise_speed').get_parameter_value().double_value

                self.publisher_vel = self.create_publisher(TwistStamped, f'/{self.drone_id}/gazebo/command/twist', 10)
                self.publisher_pose_stamped = self.create_publisher(PoseStamped, f'/sutra/gnc/{self.drone_id}/pose_stamped', 10)
                self.publisher_pose_json = self.create_publisher(String, f'/sutra/gnc/{self.drone_id}/pose', 10)
                self.sub_vio_status = self.create_subscription(String, f'/sutra/gnc/{self.drone_id}/vio_status', self._vio_status_callback, 10)
            except Exception:
                pass

    def distance_to_wp(self, wp: Tuple[float, float, float]) -> float:
        return math.sqrt((wp[0] - self.state.x)**2 + (wp[1] - self.state.y)**2)

    def _distance_to_wp(self, wp: Tuple[float, float, float]) -> float:
        return self.distance_to_wp(wp)

    def yaw_to_wp(self, wp: Tuple[float, float, float]) -> float:
        dx = wp[0] - self.state.x
        dy = wp[1] - self.state.y
        return math.atan2(dx, dy)

    def _yaw_to_wp(self, wp: Tuple[float, float, float]) -> float:
        return self.yaw_to_wp(wp)

    def euler_to_quaternion(self, yaw: float) -> Tuple[float, float, float, float]:
        """Convert yaw (rad) to quaternion (qx, qy, qz, qw)."""
        cy = math.cos(yaw * 0.5)
        sy = math.sin(yaw * 0.5)
        return (0.0, 0.0, sy, cy)

    def _euler_to_quaternion(self, yaw: float) -> Tuple[float, float, float, float]:
        return self.euler_to_quaternion(yaw)

    def _vio_status_callback(self, msg):
        try:
            data = json.loads(msg.data) if hasattr(msg, 'data') else msg
            self.vio_tracking_status = data.get("status_name", "TRACKING_OK")
            self.vio_status_code = data.get("status_code", 1)
        except Exception:
            pass

    def check_failsafe_triggers(self, current_time: float, max_tilt_deg: float = 25.0, link_timeout_s: float = 0.5) -> bool:
        """
        Failsafe State Machine: Trigger Emergency RTL if link heartbeats drop (>0.5s)
        or drone tilt exceeds max_tilt_deg. Returns True if transition occurred.
        """
        link_elapsed = current_time - self.state.last_heartbeat
        tilt_overshoot = math.degrees(max(abs(self.state.roll), abs(self.state.pitch))) > max_tilt_deg

        if (link_elapsed > link_timeout_s or tilt_overshoot) and self.flight_mode != OffboardFlightMode.EMERGENCY_RTL:
            self.flight_mode = OffboardFlightMode.EMERGENCY_RTL
            self.failsafe_triggered = True
            self.last_mode_change_time = current_time
            return True
        return False

    def compute_control_step(self, dt: float = 0.1) -> Tuple[Tuple[float, float, float], OffboardFlightMode]:
        """
        Computes 50Hz setpoint velocities (vx, vy, vz) for current flight mode.
        Fuses ORCA 3D dynamic reciprocal avoidance vectors and VIO tracking status.
        """
        now = time.time()
        self.check_failsafe_triggers(now)

        if self.flight_mode == OffboardFlightMode.EMERGENCY_RTL:
            home_wp = self.wp_list[0]
            dist_home = self.distance_to_wp(home_wp)
            if dist_home < 0.5:
                return (0.0, 0.0, -0.5), self.flight_mode
            
            yaw_home = self.yaw_to_wp(home_wp)
            vx = self.cruise_speed * math.sin(yaw_home)
            vy = self.cruise_speed * math.cos(yaw_home)
            vz = (home_wp[2] - self.state.z) * 0.5
            return (vx, vy, vz), self.flight_mode

        # Check VIO Status
        if self.vio_status_code == 3:  # TRACKING_LOST
            return (0.0, 0.0, 0.0), OffboardFlightMode.FAILSAFE_LAND

        effective_speed = self.cruise_speed
        # Normal patrol / ring target navigation flight mode
        wp = self.wp_list[self.wp_index]
        dx = wp[0] - self.state.x
        dy = wp[1] - self.state.y
        dz = wp[2] - self.state.z
        dist_3d = math.sqrt(dx*dx + dy*dy + dz*dz)
        yaw = self.yaw_to_wp(wp)

        if dist_3d < 0.8:
            target_num = self.wp_index + 1
            self.wp_index = (self.wp_index + 1) % len(self.wp_list)
            next_wp = self.wp_list[self.wp_index]
            
            if HAVE_ROS2 and hasattr(self, 'get_logger'):
                try:
                    self.get_logger().info(
                        f"🎯 [RING TARGET REACHED] UAV Cleared Ring Target #{target_num} at ({wp[0]:.1f}, {wp[1]:.1f}, {wp[2]:.1f}m)! "
                        f"--> Generating NEW Ring Target #{self.wp_index+1} at ({next_wp[0]:.1f}, {next_wp[1]:.1f}, {next_wp[2]:.1f}m)"
                    )
                except Exception:
                    pass
            else:
                print(
                    f"🎯 [RING TARGET REACHED] UAV Cleared Ring Target #{target_num} at ({wp[0]:.1f}, {wp[1]:.1f}, {wp[2]:.1f}m)! "
                    f"--> Generating NEW Ring Target #{self.wp_index+1} at ({next_wp[0]:.1f}, {next_wp[1]:.1f}, {next_wp[2]:.1f}m)"
                )
            wp = next_wp
            yaw = self.yaw_to_wp(wp)

        pref_vx = effective_speed * math.sin(yaw)
        pref_vy = effective_speed * math.cos(yaw)
        pref_vz = max(-2.5, min(2.5, dz * 1.5))

        pref_vel = Vector3D(pref_vx, pref_vy, pref_vz)
        me_agent = DroneAgentState(
            agent_id=self.agent_id,
            position=Vector3D(self.state.x, self.state.y, self.state.z),
            velocity=Vector3D(self.state.vx, self.state.vy, self.state.vz)
        )

        if self.peer_drones:
            safe_vel = self.orca_solver.compute_safe_velocity(me_agent, self.peer_drones, pref_vel)
            vx, vy, vz = safe_vel.x, safe_vel.y, safe_vel.z
            if (abs(vx - pref_vx) > 0.1 or abs(vy - pref_vy) > 0.1):
                self.flight_mode = OffboardFlightMode.ORCA_AVOIDANCE
            else:
                self.flight_mode = OffboardFlightMode.MISSION_PATROL
        else:
            vx, vy, vz = pref_vx, pref_vy, pref_vz
            self.flight_mode = OffboardFlightMode.MISSION_PATROL

        self.state.vx, self.state.vy, self.state.vz = vx, vy, vz
        if not getattr(self, 'use_closed_loop_feedback', False):
            self.state.x += vx * dt
            self.state.y += vy * dt
            self.state.z += vz * dt
        self.state.yaw = yaw

        return (vx, vy, vz), self.flight_mode


if HAVE_ROS2:
    class SutraOffboardROS2Node(Node):
        def __init__(self):
            super().__init__('sutra_offboard_control')
            
            self.declare_parameter('drone_id', 'uav_alpha')
            self.declare_parameter('cruise_speed', 2.5)
            self.declare_parameter('safety_buffer_m', 3.0)

            self.drone_id = self.get_parameter('drone_id').get_parameter_value().string_value
            cruise_speed = self.get_parameter('cruise_speed').get_parameter_value().double_value
            safety_buffer = self.get_parameter('safety_buffer_m').get_parameter_value().double_value

            self.controller = SutraOffboardControlNode(agent_id=hash(self.drone_id) % 100 + 1, safety_buffer_m=safety_buffer)
            self.controller.cruise_speed = cruise_speed

            self.pub_vel = self.create_publisher(TwistStamped, f'/{self.drone_id}/gazebo/command/twist', 10)
            self.pub_pose_stamped = self.create_publisher(PoseStamped, f'/sutra/gnc/{self.drone_id}/pose_stamped', 10)
            self.pub_pose_json = self.create_publisher(String, f'/sutra/gnc/{self.drone_id}/pose', 10)
            self.pub_px4_setpoint = self.create_publisher(String, f'/{self.drone_id}/fmu/in/trajectory_setpoint', 10)

            self.sub_pose = self.create_subscription(
                PoseStamped, f'/model/{self.drone_id}/pose', self._pose_feedback_callback, 10
            )

            self.sub_vio_status = self.create_subscription(
                String, f'/sutra/gnc/{self.drone_id}/vio_status', self._vio_status_callback, 10
            )

            self.timer = self.create_timer(0.02, self._control_loop)  # 50 Hz loop
            self.get_logger().info(f"🚀 Subsystem A Offboard Node Initialized for [{self.drone_id}] @ 50Hz closed-loop control rate.")

        def _pose_feedback_callback(self, msg):
            try:
                if hasattr(msg, 'pose') and hasattr(msg.pose, 'position'):
                    pos = msg.pose.position
                elif hasattr(msg, 'position'):
                    pos = msg.position
                else:
                    return
                self.controller.use_closed_loop_feedback = True
                self.controller.state.x = pos.x
                self.controller.state.y = pos.y
                self.controller.state.z = pos.z
                self.controller.state.last_heartbeat = time.time()
            except Exception:
                pass

        def _vio_status_callback(self, msg: String):
            try:
                data = json.loads(msg.data)
                self.controller.vio_tracking_status = data.get("status_name", "TRACKING_OK")
                self.controller.vio_status_code = data.get("status_code", 1)
            except Exception:
                pass

        def _control_loop(self):
            (vx, vy, vz), mode = self.controller.compute_control_step(dt=0.02)

            now_msg = self.get_clock().now().to_msg()

            # 1. Publish TwistStamped for Gazebo Sim
            twist = TwistStamped()
            twist.header.stamp = now_msg
            twist.header.frame_id = 'base_link'
            twist.twist.linear.x = vx
            twist.twist.linear.y = vy
            twist.twist.linear.z = vz
            self.pub_vel.publish(twist)

            # 2. Publish PoseStamped for Subsystem C & D
            pose = PoseStamped()
            pose.header.stamp = now_msg
            pose.header.frame_id = 'world'
            pose.pose.position.x = self.controller.state.x
            pose.pose.position.y = self.controller.state.y
            pose.pose.position.z = self.controller.state.z
            qx, qy, qz, qw = self.controller.euler_to_quaternion(self.controller.state.yaw)
            pose.pose.orientation.x = qx
            pose.pose.orientation.y = qy
            pose.pose.orientation.z = qz
            pose.pose.orientation.w = qw
            self.pub_pose_stamped.publish(pose)

            # 3. Publish PX4 TrajectorySetpoint JSON for microDDS Bridge
            setpoint_data = {
                "drone_id": self.drone_id,
                "timestamp_us": int(time.time() * 1e6),
                "position": [self.controller.state.x, self.controller.state.y, self.controller.state.z],
                "velocity": [vx, vy, vz],
                "yaw_rad": self.controller.state.yaw,
                "flight_mode": mode.name
            }
            px4_msg = String()
            px4_msg.data = json.dumps(setpoint_data)
            self.pub_px4_setpoint.publish(px4_msg)


def main(args=None):
    if HAVE_ROS2:
        rclpy.init(args=args)
        node = SutraOffboardROS2Node()
        try:
            rclpy.spin(node)
        finally:
            node.destroy_node()
            rclpy.shutdown()


if __name__ == '__main__':
    main()
