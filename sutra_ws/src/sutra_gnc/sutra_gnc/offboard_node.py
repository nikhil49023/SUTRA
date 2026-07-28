#!/usr/bin/env python3
"""
SUTRA Subsystem A: Autonomous Navigation & PX4 Offboard Mode Control Node
Lead Engineer: Rohith Kumar
"""

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import TwistStamped, PoseStamped


class SutraOffboardControlNode(Node):
    def __init__(self):
        super().__init__('sutra_offboard_control')
        self.publisher_vel = self.create_publisher(
            TwistStamped, '/uav_alpha/gazebo/command/twist', 10
        )
        self.timer = self.create_timer(0.1, self.publish_offboard_heartbeat)
        self.get_logger().info('SUTRA PX4 Offboard Control Node Initialized.')

    def publish_offboard_heartbeat(self):
        msg = TwistStamped()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = 'base_link'
        msg.twist.linear.x = 2.0
        msg.twist.linear.y = 1.2
        msg.twist.linear.z = 0.5
        msg.twist.angular.z = 0.1
        self.publisher_vel.publish(msg)


def main(args=None):
    rclpy.init(args=args)
    node = SutraOffboardControlNode()
    try:
        rclpy.spin_once(node, timeout_sec=0.1)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
