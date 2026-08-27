#!/usr/bin/env python3
"""
PROJECT SUTRA — Real-Time Neuro-Adaptive Flight Companion Node
==============================================================
Author: Tech Lead Nikhil (Subsystem A Lead)
Location: sutra_ws/src/sutra_gnc/sutra_gnc/neuro_adaptive_flight_node.py

Runs at 50Hz on companion GPU / CPU:
1. Feeds recent 5-step IMU window and multi-sensor metrics into SutraNeuroFlight ONNX engine.
2. Injects predicted aerodynamic disturbance force (wind gusts, downwash, ground effect) into PX4 Velocity PID.
3. Dynamically publishes EKF2 sensor reliability weights [0, 1]^5 to gate jammed GPS or blinded optical flow.
"""

import os
import json
import math
import numpy as np
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import TwistStamped, Twist
from nav_msgs.msg import Odometry
from sensor_msgs.msg import Imu, FluidPressure, NavSatFix, LaserScan
from std_msgs.msg import Float32MultiArray, String
import onnxruntime as ort


class NeuroAdaptiveFlightNode(Node):
    """
    ROS 2 Companion Supervisor Node for Hybrid Neuro-Adaptive Flight.
    """

    def __init__(self):
        super().__init__("neuro_adaptive_flight_node")

        # ── Parameters ────────────────────────────────────────────────────────
        self.declare_parameter("drone_id", "uav_alpha")
        self.declare_parameter("onnx_model_path", "models/sutra_neuro_flight.onnx")
        self.declare_parameter("enable_feedforward", True)
        self.declare_parameter("feedforward_gain", 0.40)  # Scaling factor for acceleration compensation
        self.declare_parameter("use_sim_time", True)

        self.drone_id = self.get_parameter("drone_id").value
        self.model_path = self.get_parameter("onnx_model_path").value
        self.enable_ff = bool(self.get_parameter("enable_feedforward").value)
        self.ff_gain = float(self.get_parameter("feedforward_gain").value)

        # Locate model file
        ws_dir = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        resolved_path = os.path.join(ws_dir, "..", self.model_path)
        if not os.path.exists(resolved_path):
            resolved_path = os.path.join(os.getcwd(), self.model_path)

        self.get_logger().info(f"🧠 [{self.drone_id}] Loading NeuroFlight ONNX Model from {resolved_path}...")
        self.ort_session = None
        try:
            self.ort_session = ort.InferenceSession(
                resolved_path,
                providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
            )
            self.get_logger().info(f"✅ [{self.drone_id}] ONNX Runtime Active: {self.ort_session.get_providers()}")
        except Exception as e:
            self.get_logger().warn(f"⚠️ Failed to load ONNX session: {e}. Running in passthrough mode.")

        # ── State Buffers ─────────────────────────────────────────────────────
        self.imu_buffer = np.zeros((1, 6, 5), dtype=np.float32)  # (Batch=1, Channels=6, Seq=5)
        self.pos = np.zeros(3, dtype=np.float32)
        self.vel = np.zeros(3, dtype=np.float32)
        self.quat = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
        self.omega = np.zeros(3, dtype=np.float32)
        self.target_pos = np.array([0.0, 0.0, 4.0], dtype=np.float32)

        # Environmental & Sensor metrics
        self.baro_alt = 4.0
        self.laser_agl = 4.0
        self.gps_status = 1.0  # 1.0 = nominal, 0.0 = jammed/loss
        self.vio_quality = 1.0
        self.last_baro_time = self.get_clock().now()

        # Swarm peer positions: peer_id -> (x, y, z)
        self.peer_positions = {}

        # ── Publishers ────────────────────────────────────────────────────────
        self.pub_feedforward_twist = self.create_publisher(
            TwistStamped, f"/{self.drone_id}/neuro_flight/feedforward_twist", 10
        )
        self.pub_sensor_reliability = self.create_publisher(
            Float32MultiArray, f"/{self.drone_id}/neuro_flight/sensor_reliability", 10
        )
        self.pub_status = self.create_publisher(
            String, f"/sutra/gnc/{self.drone_id}/neuro_flight_status", 10
        )

        # ── Subscriptions ─────────────────────────────────────────────────────
        self.create_subscription(Odometry, f"/model/{self.drone_id}/odometry", self._on_odom, 10)
        self.create_subscription(Imu, f"/{self.drone_id}/imu", self._on_imu, 10)
        self.create_subscription(FluidPressure, f"/{self.drone_id}/air_pressure", self._on_baro, 10)
        self.create_subscription(NavSatFix, f"/{self.drone_id}/navsat", self._on_navsat, 10)
        self.create_subscription(LaserScan, f"/{self.drone_id}/rangefinder/distance", self._on_rangefinder, 10)

        # 50Hz Control Loop Timer
        self.timer = self.create_timer(0.02, self._control_loop_50hz)

    # ── Sensor Callbacks ──────────────────────────────────────────────────────
    def _on_odom(self, msg: Odometry):
        p = msg.pose.pose.position
        v = msg.twist.twist.linear
        q = msg.pose.pose.orientation
        w = msg.twist.twist.angular
        self.pos = np.array([p.x, p.y, p.z], dtype=np.float32)
        self.vel = np.array([v.x, v.y, v.z], dtype=np.float32)
        self.quat = np.array([q.w, q.x, q.y, q.z], dtype=np.float32)
        self.omega = np.array([w.x, w.y, w.z], dtype=np.float32)

    def _on_imu(self, msg: Imu):
        a = msg.linear_acceleration
        w = msg.angular_velocity
        # Shift IMU buffer
        step = np.array([a.x, a.y, a.z, w.x, w.y, w.z], dtype=np.float32)
        self.imu_buffer[0] = np.roll(self.imu_buffer[0], -1, axis=1)
        self.imu_buffer[0, :, -1] = step

    def _on_baro(self, msg: FluidPressure):
        # Hydrostatic approximation: delta_p / (rho * g)
        p0 = 101325.0
        self.baro_alt = max(0.0, float((p0 - msg.fluid_pressure) / 12.0))

    def _on_navsat(self, msg: NavSatFix):
        # If position covariance is high or status < 0, GPS is degraded
        if msg.status.status < 0 or msg.position_covariance[0] > 10.0:
            self.gps_status = 0.05
        else:
            self.gps_status = 0.98

    def _on_rangefinder(self, msg: LaserScan):
        if len(msg.ranges) > 0 and not math.isinf(msg.ranges[0]) and not math.isnan(msg.ranges[0]):
            self.laser_agl = float(msg.ranges[0])

    # ── 50Hz Inference & Compensation Loop ───────────────────────────────────
    def _control_loop_50hz(self):
        if self.ort_session is None:
            return

        # 1. Compute Kinematic Errors
        err_pos = self.target_pos - self.pos
        err_vel = np.clip(err_pos * 0.8, -3.0, 3.0) - self.vel
        err_quat = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
        err_omega = -self.omega

        # 2. Assemble Environmental Features (6)
        baro_rate = float(self.vel[2])
        laser_agl = float(self.laser_agl)
        opt_flow_u = float(self.vel[0])
        opt_flow_v = float(self.vel[1])
        wind_est_x = 0.0
        wind_est_y = 0.0
        env_feats = [baro_rate, laser_agl, opt_flow_u, opt_flow_v, wind_est_x, wind_est_y]

        # 3. Assemble Swarm Proximity (12)
        swarm_feats = [0.0] * 12

        # 4. Assemble Sensor Health (4)
        health_feats = [self.gps_status, self.vio_quality, 0.95, 0.95]

        direct_feats = np.concatenate([
            err_pos, err_vel, err_quat, err_omega,  # (13)
            env_feats,                              # (6)
            swarm_feats,                            # (12)
            health_feats                            # (4)
        ]).reshape(1, 35).astype(np.float32)

        # 5. Run ONNX Inference (< 0.50 ms)
        ort_inputs = {
            "imu_seq": self.imu_buffer,
            "direct_feats": direct_feats,
        }
        pred_dist, pred_alpha = self.ort_session.run(None, ort_inputs)

        dist_accel = pred_dist[0]       # [f_x, f_y, f_z] in m/s^2
        reliability = pred_alpha[0]     # [alpha_gps, alpha_baro, alpha_vio, alpha_rng, alpha_mag]

        # 6. Publish Feedforward Disturbance Compensation
        if self.enable_ff:
            ff_msg = TwistStamped()
            ff_msg.header.stamp = self.get_clock().now().to_msg()
            ff_msg.header.frame_id = "world"
            ff_msg.twist.linear.x = float(dist_accel[0] * self.ff_gain)
            ff_msg.twist.linear.y = float(dist_accel[1] * self.ff_gain)
            ff_msg.twist.linear.z = float(dist_accel[2] * self.ff_gain)
            self.pub_feedforward_twist.publish(ff_msg)

        # 7. Publish EKF Sensor Reliability Scaling
        rel_msg = Float32MultiArray()
        rel_msg.data = [float(a) for a in reliability]
        self.pub_sensor_reliability.publish(rel_msg)

        # 8. Broadcast JSON Status for GCS HUD
        status_dict = {
            "drone_id": self.drone_id,
            "dist_accel_x": round(float(dist_accel[0]), 3),
            "dist_accel_y": round(float(dist_accel[1]), 3),
            "dist_accel_z": round(float(dist_accel[2]), 3),
            "alpha_gps": round(float(reliability[0]), 3),
            "alpha_baro": round(float(reliability[1]), 3),
            "alpha_vio": round(float(reliability[2]), 3),
            "alpha_rng": round(float(reliability[3]), 3),
            "alpha_mag": round(float(reliability[4]), 3),
            "status": "NOMINAL" if self.gps_status > 0.5 else "GPS_DENIED_VIO_ACTIVE",
        }
        s_msg = String()
        s_msg.data = json.dumps(status_dict)
        self.pub_status.publish(s_msg)


def main(args=None):
    rclpy.init(args=args)
    node = NeuroAdaptiveFlightNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
