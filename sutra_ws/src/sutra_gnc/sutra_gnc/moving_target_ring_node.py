#!/usr/bin/env python3
"""
Project SUTRA — Dynamic Infinite Checkpoint Ring Generator Node
================================================================
Generates dynamic 3D checkpoint rings in space.
When uav_alpha passes through a checkpoint ring (distance < threshold),
a new random 3D vector coordinate is generated, and the ring is relocated
in Gazebo Sim 8. This loop repeats infinitely for continuous autonomous flight.
"""

import math
import random
import time
from typing import Tuple

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseStamped, Pose, Point, Quaternion
from nav_msgs.msg import Odometry
from std_msgs.msg import String
from visualization_msgs.msg import Marker, MarkerArray


class DynamicCheckpointRingNode(Node):
    def __init__(self):
        super().__init__("sutra_moving_target_ring")

        # ── Parameters ────────────────────────────────────────────────────────
        self.declare_parameter("checkpoint_radius", 2.5)
        self.declare_parameter("drone_id", "uav_alpha")
        self.declare_parameter("min_distance_between_rings", 8.0)
        # Arena bounds — override per-launch to match world perimeter walls
        self.declare_parameter("arena_x_min", 4.0)
        self.declare_parameter("arena_x_max", 22.0)
        self.declare_parameter("arena_y_min", -12.0)
        self.declare_parameter("arena_y_max", 12.0)
        self.declare_parameter("arena_z_min", 3.5)
        self.declare_parameter("arena_z_max", 7.5)

        self.threshold = float(self.get_parameter("checkpoint_radius").value)
        self.drone_id = self.get_parameter("drone_id").value
        self.min_dist = float(self.get_parameter("min_distance_between_rings").value)
        self.arena_x_min = float(self.get_parameter("arena_x_min").value)
        self.arena_x_max = float(self.get_parameter("arena_x_max").value)
        self.arena_y_min = float(self.get_parameter("arena_y_min").value)
        self.arena_y_max = float(self.get_parameter("arena_y_max").value)
        self.arena_z_min = float(self.get_parameter("arena_z_min").value)
        self.arena_z_max = float(self.get_parameter("arena_z_max").value)

        # Initial Checkpoint Position
        self.curr_ring_x = 8.0
        self.curr_ring_y = 0.0
        self.curr_ring_z = 4.0

        # Drone State
        self.drone_x = 0.0
        self.drone_y = 0.0
        self.drone_z = 0.0
        self.has_drone_pose = False

        # Stats
        self.checkpoints_cleared = 0
        self.last_cleared_time = 0.0

        # ── Publishers ────────────────────────────────────────────────────────
        self.pub_ring_pose = self.create_publisher(
            PoseStamped, "/sutra/target_ring/pose", 10
        )
        self.pub_gz_ring_pose = self.create_publisher(
            Pose, "/model/ring_target/pose", 10
        )
        self.pub_status = self.create_publisher(
            String, "/sutra/checkpoints/status", 10
        )
        self.pub_markers = self.create_publisher(
            MarkerArray, "/sutra/checkpoints/markers", 10
        )


        # ── Subscriptions ─────────────────────────────────────────────────────
        self.sub_odom = self.create_subscription(
            Odometry, f"/model/{self.drone_id}/odometry", self._odom_callback, 10
        )
        self.sub_drone_pose = self.create_subscription(
            PoseStamped, f"/sutra/gnc/{self.drone_id}/pose_stamped", self._drone_pose_callback, 10
        )
        self.sub_model_pose = self.create_subscription(
            Pose, f"/model/{self.drone_id}/pose", self._model_pose_callback, 10
        )

        # 50Hz Loop for proximity checking and ring publishing
        self.timer = self.create_timer(0.02, self._checkpoint_loop_50hz)

        self.get_logger().info(
            f"🎯 Dynamic Infinite Checkpoint Generator Initialized for [{self.drone_id}]"
        )
        self.get_logger().info(
            f"🏁 Initial Checkpoint #1 placed at ({self.curr_ring_x:.1f}, {self.curr_ring_y:.1f}, {self.curr_ring_z:.1f})"
        )

    def _odom_callback(self, msg: Odometry):
        self.drone_x = msg.pose.pose.position.x
        self.drone_y = msg.pose.pose.position.y
        self.drone_z = msg.pose.pose.position.z
        self.has_drone_pose = True


    def _drone_pose_callback(self, msg: PoseStamped):
        self.drone_x = msg.pose.position.x
        self.drone_y = msg.pose.position.y
        self.drone_z = msg.pose.position.z
        self.has_drone_pose = True

    def _model_pose_callback(self, msg: Pose):
        if not self.has_drone_pose:
            self.drone_x = msg.position.x
            self.drone_y = msg.position.y
            self.drone_z = msg.position.z
            self.has_drone_pose = True

    def _generate_next_checkpoint(self):
        """Generates a new random 3D vector coordinate within the configured arena bounds."""
        while True:
            new_x = random.uniform(self.arena_x_min, self.arena_x_max)
            new_y = random.uniform(self.arena_y_min, self.arena_y_max)
            new_z = random.uniform(self.arena_z_min, self.arena_z_max)

            # Ensure minimum spacing from previous ring
            dx = new_x - self.curr_ring_x
            dy = new_y - self.curr_ring_y
            dz = new_z - self.curr_ring_z
            dist = math.sqrt(dx * dx + dy * dy + dz * dz)

            if dist >= self.min_dist:
                self.curr_ring_x = new_x
                self.curr_ring_y = new_y
                self.curr_ring_z = new_z
                break

        self.checkpoints_cleared += 1
        self.get_logger().info(
            f"🎉 CHECKPOINT #{self.checkpoints_cleared} PASSED! "
            f"🎯 Next Checkpoint #{self.checkpoints_cleared + 1} spawned at "
            f"({self.curr_ring_x:.1f}, {self.curr_ring_y:.1f}, {self.curr_ring_z:.1f})"
        )

    def _checkpoint_loop_50hz(self):
        # 1. Proximity Check
        if self.has_drone_pose:
            dx = self.drone_x - self.curr_ring_x
            dy = self.drone_y - self.curr_ring_y
            dz = self.drone_z - self.curr_ring_z
            dist_to_ring = math.sqrt(dx * dx + dy * dy + dz * dz)

            # Debounce rapid triggers (< 0.5s)
            if dist_to_ring < self.threshold and (time.time() - self.last_cleared_time) > 0.5:
                self.last_cleared_time = time.time()
                self._generate_next_checkpoint()

        # 2. Publish Current Ring Pose
        pose_msg = Pose()
        pose_msg.position.x = self.curr_ring_x
        pose_msg.position.y = self.curr_ring_y
        pose_msg.position.z = self.curr_ring_z

        # Orientation facing origin
        yaw = math.atan2(-self.curr_ring_y, -self.curr_ring_x)
        pose_msg.orientation.z = math.sin(yaw * 0.5)
        pose_msg.orientation.w = math.cos(yaw * 0.5)

        ps = PoseStamped()
        ps.header.stamp = self.get_clock().now().to_msg()
        ps.header.frame_id = "world"
        ps.pose = pose_msg

        self.pub_ring_pose.publish(ps)
        self.pub_gz_ring_pose.publish(pose_msg)

        # 3. Publish 3D Markers (Target Line & Floating Text)
        marker_array = MarkerArray()

        # Line Marker (Drone -> Active Checkpoint Ring)
        line_marker = Marker()
        line_marker.header.stamp = self.get_clock().now().to_msg()
        line_marker.header.frame_id = "world"
        line_marker.id = 0
        line_marker.type = Marker.LINE_STRIP
        line_marker.action = Marker.ADD
        line_marker.scale.x = 0.08  # Line width
        line_marker.color.r = 0.0
        line_marker.color.g = 1.0
        line_marker.color.b = 1.0
        line_marker.color.a = 0.9

        p1 = Point(x=self.drone_x, y=self.drone_y, z=self.drone_z)
        p2 = Point(x=self.curr_ring_x, y=self.curr_ring_y, z=self.curr_ring_z)
        line_marker.points = [p1, p2]
        marker_array.markers.append(line_marker)

        # Text Marker (Floating Above Ring)
        text_marker = Marker()
        text_marker.header.stamp = self.get_clock().now().to_msg()
        text_marker.header.frame_id = "world"
        text_marker.id = 1
        text_marker.type = Marker.TEXT_VIEW_FACING
        text_marker.action = Marker.ADD
        text_marker.pose.position.x = self.curr_ring_x
        text_marker.pose.position.y = self.curr_ring_y
        text_marker.pose.position.z = self.curr_ring_z + 2.8
        text_marker.scale.z = 0.8  # Text height
        text_marker.color.r = 1.0
        text_marker.color.g = 0.9
        text_marker.color.b = 0.0
        text_marker.color.a = 1.0

        if self.has_drone_pose:
            dist = math.sqrt((self.drone_x - self.curr_ring_x)**2 + (self.drone_y - self.curr_ring_y)**2 + (self.drone_z - self.curr_ring_z)**2)
            text_marker.text = f"CHECKPOINT #{self.checkpoints_cleared + 1} | DIST: {dist:.1f}m"
        else:
            text_marker.text = f"CHECKPOINT #{self.checkpoints_cleared + 1}"

        marker_array.markers.append(text_marker)
        self.pub_markers.publish(marker_array)

        # Status Update
        status_msg = String()
        status_msg.data = (
            f"Clears: {self.checkpoints_cleared} | "
            f"Target: ({self.curr_ring_x:.1f}, {self.curr_ring_y:.1f}, {self.curr_ring_z:.1f})"
        )
        self.pub_status.publish(status_msg)



def main(args=None):
    rclpy.init(args=args)
    node = DynamicCheckpointRingNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
