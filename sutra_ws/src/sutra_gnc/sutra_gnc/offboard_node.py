#!/usr/bin/env python3
"""
SUTRA Subsystem A: Autonomous Navigation & PX4 Offboard Mode Control Node
Lead Engineer: Rohith Kumar

Integration update by Vedanth (Subsystem C):
  - Added /sutra/gnc/pose_stamped publisher (PoseStamped)
  - Added /sutra/gnc/pose publisher (JSON String fallback)
  - These are consumed by Subsystem C (detector_node.py) for GPS raycast
  - Added basic waypoint mission planner (3-point patrol)
"""

import math
import json

try:
    import rclpy
    from rclpy.node import Node
    from geometry_msgs.msg import TwistStamped, PoseStamped
    from std_msgs.msg import String
    HAS_RCLPY = True
except ImportError:
    HAS_RCLPY = False
    class Node:
        def __init__(self, *args, **kwargs): pass
    class TwistStamped: pass
    class PoseStamped: pass
    class String: pass



# ── Simple waypoint mission ───────────────────────────────────────────────────
WAYPOINTS = [
    # (x_ned_m, y_ned_m, z_alt_m)  — local NED from SITL origin
    (  0.0,   0.0, 15.0),   # takeoff / home
    ( 20.0,   0.0, 20.0),   # north search leg
    ( 20.0,  20.0, 20.0),   # east search leg
    (  0.0,  20.0, 20.0),   # south search leg
    (  0.0,   0.0, 15.0),   # return to home
]

# ── Drone pose (simulated, updated by timer) ──────────────────────────────────
class DroneState:
    def __init__(self):
        self.x   = 0.0   # East  (m NED)
        self.y   = 0.0   # North (m NED)
        self.z   = 0.0   # Up    (m)
        self.yaw = 0.0   # radians


class SutraOffboardControlNode(Node):
    def __init__(self):
        super().__init__('sutra_offboard_control')

        # ── Parameters ────────────────────────────────────────────────────────
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

        # ── Velocity command publisher (Gazebo twist) ─────────────────────────
        self.publisher_vel = self.create_publisher(
            TwistStamped, f'/{self.drone_id}/gazebo/command/twist', 10
        )

        # ── Pose publisher for Subsystem C (GPS Raycast) ──────────────────────
        self.publisher_pose_stamped = self.create_publisher(
            PoseStamped, f'/sutra/gnc/{self.drone_id}/pose_stamped', 10
        )
        self.publisher_pose_json = self.create_publisher(
            String, f'/sutra/gnc/{self.drone_id}/pose', 10
        )

        # ── Subscriber for VIO Tracking Status Failsafe ──────────────────────
        self.vio_tracking_status = "TRACKING_OK"
        self.vio_status_code = 1
        self.sub_vio_status = self.create_subscription(
            String,
            f'/sutra/gnc/{self.drone_id}/vio_status',
            self._vio_status_callback,
            10
        )

        # ── State ─────────────────────────────────────────────────────────────
        self.state        = DroneState()
        self.state.x      = self.start_x
        self.state.y      = self.start_y
        self.state.z      = self.start_z
        self.wp_index     = 0
        self.wp_list      = [
            (wp[0] + self.start_x, wp[1] + self.start_y, wp[2] + self.start_z)
            for wp in WAYPOINTS
        ]

        # ── Timers ────────────────────────────────────────────────────────────
        self.timer = self.create_timer(0.1, self.control_loop)

        self.get_logger().info(
            f'🚁 SUTRA Swarm Drone Node [{self.drone_id}] Initialized at '
            f'({self.start_x:.1f}, {self.start_y:.1f}, {self.start_z:.1f})m.'
        )

    def _vio_status_callback(self, msg: String):
        try:
            data = json.loads(msg.data)
            self.vio_tracking_status = data.get("status_name", "TRACKING_OK")
            self.vio_status_code = data.get("status_code", 1)
        except Exception:
            pass

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _distance_to_wp(self, wp):
        return math.sqrt(
            (wp[0] - self.state.x)**2 +
            (wp[1] - self.state.y)**2
        )

    def _yaw_to_wp(self, wp):
        dx = wp[0] - self.state.x
        dy = wp[1] - self.state.y
        return math.atan2(dx, dy)   # NED yaw

    def _euler_to_quaternion(self, yaw):
        """Convert yaw angle to quaternion (roll=0, pitch=0)."""
        cy = math.cos(yaw * 0.5)
        sy = math.sin(yaw * 0.5)
        return (0.0, 0.0, sy, cy)   # (qx, qy, qz, qw)

    # ── Main control loop ─────────────────────────────────────────────────────

    def control_loop(self):
        """10 Hz: navigate to next waypoint + publish pose for Subsystem C."""

        # Check VIO Tracking Status Failsafe
        if self.vio_status_code == 3:  # TRACKING_LOST
            self.get_logger().warn('🚨 VIO TRACKING LOST! Activating Position Hold Failsafe.')
            vx, vy, vz = 0.0, 0.0, 0.0
            yaw = self.state.yaw
        elif self.vio_status_code == 2:  # TRACKING_DEGRADED
            self.get_logger().warn('⚠️ VIO TRACKING DEGRADED! Slowing down to 0.5 m/s.')
            wp = self.wp_list[self.wp_index]
            dist = self._distance_to_wp(wp)
            yaw = self._yaw_to_wp(wp)
            slow_speed = 0.5
            vx = slow_speed * math.sin(yaw)
            vy = slow_speed * math.cos(yaw)
            vz = (wp[2] - self.state.z) * 0.2
        else:
            wp = self.wp_list[self.wp_index]

            # ── Simple proportional navigation ────────────────────────────────────
            dist = self._distance_to_wp(wp)
            yaw  = self._yaw_to_wp(wp)

            if dist < 1.5:
                # Reached waypoint — advance to next
                self.wp_index = (self.wp_index + 1) % len(self.wp_list)
                self.get_logger().info(
                    f'✅ Waypoint {self.wp_index} reached → next: {self.wp_list[self.wp_index]}'
                )
                vx, vy, vz = 0.0, 0.0, 0.0
            else:
                # Fly toward waypoint at cruise speed
                vx = self.cruise_speed * math.sin(yaw)
                vy = self.cruise_speed * math.cos(yaw)
                vz = (wp[2] - self.state.z) * 0.5  # altitude proportional

        # Update simulated position (dead reckoning for SITL)
        dt = 0.1
        self.state.x   += vx * dt
        self.state.y   += vy * dt
        self.state.z   += vz * dt
        self.state.yaw  = yaw

        # ── Publish velocity command to Gazebo ────────────────────────────────
        vel_msg = TwistStamped()
        vel_msg.header.stamp    = self.get_clock().now().to_msg()
        vel_msg.header.frame_id = 'base_link'
        vel_msg.twist.linear.x  = vx
        vel_msg.twist.linear.y  = vy
        vel_msg.twist.linear.z  = vz
        vel_msg.twist.angular.z = 0.0
        self.publisher_vel.publish(vel_msg)

        # ── Publish PoseStamped for Subsystem C ───────────────────────────────
        pose_msg = PoseStamped()
        pose_msg.header.stamp    = self.get_clock().now().to_msg()
        pose_msg.header.frame_id = 'world'

        # NED position (x=East, y=North, z=Up)
        pose_msg.pose.position.x = self.state.x
        pose_msg.pose.position.y = self.state.y
        pose_msg.pose.position.z = self.state.z

        # Yaw as quaternion
        qx, qy, qz, qw = self._euler_to_quaternion(self.state.yaw)
        pose_msg.pose.orientation.x = qx
        pose_msg.pose.orientation.y = qy
        pose_msg.pose.orientation.z = qz
        pose_msg.pose.orientation.w = qw

        self.publisher_pose_stamped.publish(pose_msg)

        # ── Publish JSON fallback for Subsystem C sim mode ───────────────────
        # WGS84 origin: San Francisco SITL
        ORIGIN_LAT = 37.774929
        ORIGIN_LON = -122.419416
        ORIGIN_ALT = 15.0
        R = 6_378_137.0
        lat = ORIGIN_LAT + math.degrees(self.state.y / R)
        lon = ORIGIN_LON + math.degrees(
            self.state.x / (R * math.cos(math.radians(ORIGIN_LAT)))
        )
        alt = ORIGIN_ALT + self.state.z

        json_msg      = String()
        json_msg.data = json.dumps({
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "alt": round(alt, 2),
            "yaw": round(self.state.yaw, 4),
        })
        self.publisher_pose_json.publish(json_msg)


def main(args=None):
    rclpy.init(args=args)
    node = SutraOffboardControlNode()
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
