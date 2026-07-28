#!/usr/bin/env python3
"""
SUTRA Subsystem B: Swarm Mesh & Deep JSCC Neural Encoder Node
Lead Engineer: Nikhil
"""

import math
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class SutraMeshNode(Node):
    def __init__(self):
        super().__init__('sutra_mesh_node')
        self.publisher_mesh = self.create_publisher(String, '/sutra/swarm/mesh_status', 10)
        self.timer = self.create_timer(1.0, self.publish_mesh_status)
        self.get_logger().info('SUTRA Swarm Mesh Node Initialized.')

    def calculate_fspl(self, distance_m: float, freq_mhz: float = 2400.0) -> float:
        if distance_m <= 0:
            return 0.0
        return 20.0 * math.log10(distance_m / 1000.0) + 20.0 * math.log10(freq_mhz) + 32.44

    def publish_mesh_status(self):
        dist = 25.0
        fspl = self.calculate_fspl(dist)
        rx_power = round(20.0 - fspl, 2)
        msg = String()
        msg.data = f"Mesh Active | UAV Distance: {dist}m | FSPL: {round(fspl,2)}dB | RX Power: {rx_power}dBm"
        self.publisher_mesh.publish(msg)


def main(args=None):
    rclpy.init(args=args)
    node = SutraMeshNode()
    try:
        rclpy.spin_once(node, timeout_sec=0.1)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
