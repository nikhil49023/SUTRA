#!/usr/bin/env python3
"""
Project SUTRA — Subsystem A: Telemetry & Stress Test Manager Node
=================================================================
Author: Tech Lead Nikhil (Subsystem A)

Features:
- Subscribes to multi-UAV odometry [/uav_alpha, uav_beta, uav_gamma, uav_delta, uav_epsilon], VIO, and clock.
- Logs real-time FPS, topic latency, min inter-drone clearance (Gate G5 >= 2.80m), and VIO drift.
- Publishes comprehensive stress test telemetry metrics to /stress_test/telemetry.
"""

import json
import math
import time
from typing import Dict, List, Tuple, Optional

import rclpy
from rclpy.node import Node
from nav_msgs.msg import Odometry
from std_msgs.msg import String


class StressTestMetrics:
    """
    Computes real-time telemetry, inter-drone clearance, and VIO drift metrics.
    """

    def __init__(self, drones: List[str]):
        self.drones = drones
        self.positions: Dict[str, Tuple[float, float, float]] = {d: (0.0, 0.0, 0.0) for d in drones}
        self.last_msg_times: Dict[str, float] = {}
        self.msg_counts: Dict[str, int] = {d: 0 for d in drones}

        self.gt_pos: Optional[Tuple[float, float, float]] = None
        self.vio_pos: Optional[Tuple[float, float, float]] = None

    def update_drone_odometry(self, drone_id: str, x: float, y: float, z: float, timestamp: float):
        self.positions[drone_id] = (x, y, z)
        self.last_msg_times[drone_id] = timestamp
        self.msg_counts[drone_id] += 1
        if drone_id == "uav_alpha":
            self.gt_pos = (x, y, z)

    def update_vio_odometry(self, x: float, y: float, z: float):
        self.vio_pos = (x, y, z)

    def compute_min_clearance(self) -> float:
        """
        Computes minimum Euclidean distance across all pairs among the 5 drones.
        Gate G5 threshold: min_clearance >= 2.80m.
        """
        min_dist = float('inf')
        drone_list = list(self.positions.keys())
        n = len(drone_list)

        if n < 2:
            return 10.0  # Default safe distance if single drone

        for i in range(n):
            for j in range(i + 1, n):
                p1 = self.positions[drone_list[i]]
                p2 = self.positions[drone_list[j]]
                dist = math.sqrt(
                    (p1[0] - p2[0])**2 + (p1[1] - p2[1])**2 + (p1[2] - p2[2])**2
                )
                if dist < min_dist:
                    min_dist = dist

        return min_dist if min_dist != float('inf') else 10.0

    def compute_vio_drift(self) -> float:
        """
        Computes VIO drift (Euclidean error) relative to ground truth pose.
        """
        if self.gt_pos is None or self.vio_pos is None:
            return 0.0

        dx = self.gt_pos[0] - self.vio_pos[0]
        dy = self.gt_pos[1] - self.vio_pos[1]
        dz = self.gt_pos[2] - self.vio_pos[2]
        return math.sqrt(dx * dx + dy * dy + dz * dz)


class StressTestManagerNode(Node):
    """
    ROS 2 Telemetry & Stress Test Manager Node.
    """

    def __init__(self):
        super().__init__("stress_test_manager_node")

        self.declare_parameter("swarm_drones", ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"])
        drone_list = self.get_parameter("swarm_drones").value

        self.metrics = StressTestMetrics(drones=list(drone_list))
        self.start_time = time.time()

        # Publisher
        self.pub_telemetry = self.create_publisher(
            String, "/stress_test/telemetry", 10
        )

        # Subscriptions for Swarm Odometry
        self.subs_odom: List[rclpy.subscription.Subscription] = []
        for drone_id in self.metrics.drones:
            sub1 = self.create_subscription(
                Odometry,
                f"/{drone_id}/odometry",
                self._make_odom_cb(drone_id),
                10
            )
            sub2 = self.create_subscription(
                Odometry,
                f"/model/{drone_id}/odometry",
                self._make_odom_cb(drone_id),
                10
            )
            self.subs_odom.extend([sub1, sub2])

        # Subscription for VIO Odometry
        self.sub_vio = self.create_subscription(
            Odometry,
            "/vio/odometry",
            self._vio_cb,
            10
        )

        # 1Hz Telemetry Summary Timer
        self.timer = self.create_timer(1.0, self._publish_telemetry_1hz)
        self.get_logger().info(
            f"📊 Stress Test Manager Node Initialized [{len(self.metrics.drones)} Swarm UAVs] | Gate G5 & VIO Diagnostics Active"
        )

    def _make_odom_cb(self, drone_id: str):
        def callback(msg: Odometry):
            p = msg.pose.pose.position
            t = time.time()
            self.metrics.update_drone_odometry(drone_id, p.x, p.y, p.z, t)
        return callback

    def _vio_cb(self, msg: Odometry):
        p = msg.pose.pose.position
        self.metrics.update_vio_odometry(p.x, p.y, p.z)

    def _publish_telemetry_1hz(self):
        elapsed = max(0.1, time.time() - self.start_time)
        min_clearance = self.metrics.compute_min_clearance()
        vio_drift = self.metrics.compute_vio_drift()
        total_msgs = sum(self.metrics.msg_counts.values())
        avg_fps = total_msgs / (elapsed * max(1, len(self.metrics.drones)))

        g5_status = "PASSED" if min_clearance >= 2.80 else "FAILED_GATE_G5"

        telemetry_payload = {
            "elapsed_sec": round(elapsed, 2),
            "avg_fps": round(avg_fps, 2),
            "min_inter_drone_clearance_m": round(min_clearance, 3),
            "gate_g5_status": g5_status,
            "vio_drift_m": round(vio_drift, 4),
            "active_swarm_count": len(self.metrics.drones)
        }

        msg = String()
        msg.data = json.dumps(telemetry_payload)
        self.pub_telemetry.publish(msg)

        self.get_logger().info(
            f"📈 [TELEMETRY] FPS: {avg_fps:.1f} | Min Clearance: {min_clearance:.2f}m ({g5_status}) | VIO Drift: {vio_drift:.4f}m"
        )


def main(args=None):
    rclpy.init(args=args)
    node = StressTestManagerNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
