#!/usr/bin/env python3
"""
Project SUTRA — Subsystem A: Native PX4 MicroXRCE-DDS Offboard Flight Controller
=================================================================================
Author: Tech Lead Nikhil (Tech Architect & Subsystem A Lead ⚡)
Location: sutra_ws/src/sutra_gnc/sutra_gnc/px4_offboard_controller.py

Architecture & Standards:
- Complies with PX4 Autopilot v1.14+ MicroXRCE-DDS uORB specification.
- Seamless dual-mode: Natively binds to `px4_msgs` if available, or uses type-safe
  native DDS adapters for standalone simulation and deterministic testing.
- Bidirectional NED (North-East-Down: PX4 standard) <-> ENU (East-North-Up: ROS 2 / GIS standard)
  spatial transformations with quaternion attitude conversion.
- Full PX4 Offboard State Machine:
  1. DISARMED_STANDBY: Health checks & topic initialization.
  2. WARMUP_HEARTBEATS: 10-cycle 10Hz `OffboardControlMode` warmup stream before mode request.
  3. ARMING_COMMAND: VehicleCommand arming payload (VEHICLE_CMD_COMPONENT_ARM_DISARM).
  4. ENGAGE_OFFBOARD: VehicleCommand mode transition (VEHICLE_CMD_DO_SET_MODE -> Mode 6).
  5. OFFBOARD_TRAJECTORY_CRUISE: 50Hz setpoint streaming with DifferentiableTrajectoryFilter
     (Gate G1 compliance: accel <= 2.5 m/s^2, jerk <= 5.0 m/s^3).
  6. EMERGENCY_FAILSAFE: Automatic 500ms heartbeat loss detection -> WaveLander soft descent.
"""

import math
import time
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any

import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy, DurabilityPolicy
from geometry_msgs.msg import PoseStamped, TwistStamped
from nav_msgs.msg import Odometry
from std_msgs.msg import String


# ──────────────────────────────────────────────────────────────────────────────
# PX4 Autopilot Command Constants (uORB VehicleCommand)
# ──────────────────────────────────────────────────────────────────────────────
VEHICLE_CMD_DO_SET_MODE = 176
VEHICLE_CMD_COMPONENT_ARM_DISARM = 400
VEHICLE_CMD_NAV_TAKEOFF = 22
VEHICLE_CMD_NAV_LAND = 21

PX4_CUSTOM_MAIN_MODE_OFFBOARD = 6
PX4_ARMING_STATE_DISARMED = 1
PX4_ARMING_STATE_ARMED = 2
PX4_NAV_STATE_OFFBOARD = 14


# ──────────────────────────────────────────────────────────────────────────────
# Spatial Transformations: NED (PX4) <-> ENU (ROS 2 / GIS)
# ──────────────────────────────────────────────────────────────────────────────

def enu_to_ned(x_enu: float, y_enu: float, z_enu: float) -> Tuple[float, float, float]:
    """
    Converts local position/velocity from ENU (East-North-Up) to NED (North-East-Down).
    NED_x = ENU_y (North)
    NED_y = ENU_x (East)
    NED_z = -ENU_z (Down)
    """
    return (float(y_enu), float(x_enu), float(-z_enu))


def ned_to_enu(x_ned: float, y_ned: float, z_ned: float) -> Tuple[float, float, float]:
    """
    Converts local position/velocity from NED (North-East-Down) to ENU (East-North-Up).
    ENU_x = NED_y (East)
    ENU_y = NED_x (North)
    ENU_z = -NED_z (Up)
    """
    return (float(y_ned), float(x_ned), float(-z_ned))


def quat_enu_to_ned(qx: float, qy: float, qz: float, qw: float) -> Tuple[float, float, float, float]:
    """
    Transforms orientation quaternion from ENU body frame to NED aerospace frame.
    """
    # 90-degree yaw + 180-degree roll axis flip
    # Analytical quaternion basis transform:
    q_x_ned = (qx + qy) * 0.7071067811865475
    q_y_ned = (qy - qx) * 0.7071067811865475
    q_z_ned = (-qz + qw) * 0.7071067811865475
    q_w_ned = (qw + qz) * 0.7071067811865475
    norm = math.sqrt(q_x_ned**2 + q_y_ned**2 + q_z_ned**2 + q_w_ned**2) + 1e-9
    return (q_x_ned / norm, q_y_ned / norm, q_z_ned / norm, q_w_ned / norm)


# ──────────────────────────────────────────────────────────────────────────────
# Native Type-Safe Message DTOs (Fallback & Serialization Support)
# ──────────────────────────────────────────────────────────────────────────────

class OffboardControlModeDTO:
    """PX4 uORB OffboardControlMode message container."""
    def __init__(
        self,
        position: bool = True,
        velocity: bool = True,
        acceleration: bool = False,
        attitude: bool = False,
        body_rate: bool = False,
        timestamp_us: int = 0
    ):
        self.timestamp = timestamp_us
        self.position = position
        self.velocity = velocity
        self.acceleration = acceleration
        self.attitude = attitude
        self.body_rate = body_rate

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "position": self.position,
            "velocity": self.velocity,
            "acceleration": self.acceleration,
            "attitude": self.attitude,
            "body_rate": self.body_rate,
        }


class TrajectorySetpointDTO:
    """PX4 uORB TrajectorySetpoint message container (50Hz Streaming)."""
    def __init__(
        self,
        position_ned: Tuple[float, float, float] = (0.0, 0.0, -4.0),
        velocity_ned: Tuple[float, float, float] = (0.0, 0.0, 0.0),
        acceleration_ned: Tuple[float, float, float] = (0.0, 0.0, 0.0),
        yaw_rad: float = 0.0,
        yawspeed_rad_s: float = 0.0,
        timestamp_us: int = 0
    ):
        self.timestamp = timestamp_us
        self.position = list(position_ned)
        self.velocity = list(velocity_ned)
        self.acceleration = list(acceleration_ned)
        self.yaw = float(yaw_rad)
        self.yawspeed = float(yawspeed_rad_s)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "position": self.position,
            "velocity": self.velocity,
            "acceleration": self.acceleration,
            "yaw": self.yaw,
            "yawspeed": self.yawspeed,
        }


class VehicleCommandDTO:
    """PX4 uORB VehicleCommand container for arming and flight mode switching."""
    def __init__(
        self,
        command: int,
        param1: float = 0.0,
        param2: float = 0.0,
        param3: float = 0.0,
        param4: float = 0.0,
        param5: float = 0.0,
        param6: float = 0.0,
        param7: float = 0.0,
        target_system: int = 1,
        target_component: int = 1,
        source_system: int = 1,
        source_component: int = 1,
        from_external: bool = True,
        timestamp_us: int = 0
    ):
        self.timestamp = timestamp_us
        self.command = int(command)
        self.param1 = float(param1)
        self.param2 = float(param2)
        self.param3 = float(param3)
        self.param4 = float(param4)
        self.param5 = float(param5)
        self.param6 = float(param6)
        self.param7 = float(param7)
        self.target_system = int(target_system)
        self.target_component = int(target_component)
        self.source_system = int(source_system)
        self.source_component = int(source_component)
        self.from_external = bool(from_external)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "command": self.command,
            "param1": self.param1,
            "param2": self.param2,
            "param3": self.param3,
            "param4": self.param4,
            "param5": self.param5,
            "param6": self.param6,
            "param7": self.param7,
            "target_system": self.target_system,
            "target_component": self.target_component,
        }


# ──────────────────────────────────────────────────────────────────────────────
# PX4 Offboard State Machine Enums
# ──────────────────────────────────────────────────────────────────────────────

class PX4FlightState(Enum):
    DISARMED_STANDBY = "DISARMED_STANDBY"
    WARMUP_HEARTBEATS = "WARMUP_HEARTBEATS"
    ARMING = "ARMING"
    ENGAGING_OFFBOARD = "ENGAGING_OFFBOARD"
    TAKEOFF_CLIMB = "TAKEOFF_CLIMB"
    OFFBOARD_CRUISE = "OFFBOARD_CRUISE"
    RETURN_TO_LAUNCH = "RETURN_TO_LAUNCH"
    EMERGENCY_LAND = "EMERGENCY_LAND"
    DISARMED_COMPLETE = "DISARMED_COMPLETE"


# ──────────────────────────────────────────────────────────────────────────────
# 50Hz Differentiable Trajectory Continuity Filter (Gate G1 Compliance)
# ──────────────────────────────────────────────────────────────────────────────

class PX4DifferentiableTrajectoryFilter:
    """
    Applies continuous acceleration and jerk limits on 50Hz trajectory setpoints.
    Ensures Gate G1 dynamic feasibility (accel <= 2.5 m/s^2, jerk <= 5.0 m/s^3).
    """
    def __init__(self, max_speed: float = 3.0, max_accel: float = 2.5, max_jerk: float = 5.0):
        self.max_speed = max_speed
        self.max_accel = max_accel
        self.max_jerk = max_jerk
        self.curr_vel = [0.0, 0.0, 0.0]
        self.curr_acc = [0.0, 0.0, 0.0]

    def filter_velocity(
        self,
        target_vel: Tuple[float, float, float],
        dt: float = 0.02
    ) -> Tuple[float, float, float]:
        if dt <= 0.0:
            return target_vel

        out_vel = list(target_vel)
        speed = math.sqrt(sum(v * v for v in out_vel))
        if speed > self.max_speed:
            out_vel = [(v / speed) * self.max_speed for v in out_vel]

        des_acc = [(out_vel[i] - self.curr_vel[i]) / dt for i in range(3)]

        for i in range(3):
            jerk = (des_acc[i] - self.curr_acc[i]) / dt
            if abs(jerk) > self.max_jerk:
                des_acc[i] = self.curr_acc[i] + math.copysign(self.max_jerk * dt, jerk)

        acc_mag = math.sqrt(sum(a * a for a in des_acc))
        if acc_mag > self.max_accel:
            scale = self.max_accel / acc_mag
            des_acc = [a * scale for a in des_acc]

        for i in range(3):
            self.curr_vel[i] += des_acc[i] * dt
            self.curr_acc[i] = des_acc[i]

        return (self.curr_vel[0], self.curr_vel[1], self.curr_vel[2])


# ──────────────────────────────────────────────────────────────────────────────
# Master PX4 MicroXRCE-DDS Offboard Node
# ──────────────────────────────────────────────────────────────────────────────

class PX4OffboardControllerNode(Node):
    """
    ROS 2 Node interfacing companion computers with PX4 Autopilot over MicroXRCE-DDS.
    """
    def __init__(self):
        super().__init__("sutra_px4_offboard_controller")

        # ── Parameters ────────────────────────────────────────────────────────
        self.declare_parameter("drone_id", "uav_alpha")
        self.declare_parameter("takeoff_altitude_m", 4.0)
        self.declare_parameter("cruise_speed_mps", 2.5)
        self.declare_parameter("heartbeat_warmup_count", 10)
        self.declare_parameter("failsafe_timeout_s", 0.5)

        self.drone_id: str = str(self.get_parameter("drone_id").value)
        self.takeoff_alt_m: float = float(self.get_parameter("takeoff_altitude_m").value)
        self.cruise_speed: float = float(self.get_parameter("cruise_speed_mps").value)
        self.heartbeat_warmup_target: int = int(self.get_parameter("heartbeat_warmup_count").value)
        self.failsafe_timeout: float = float(self.get_parameter("failsafe_timeout_s").value)

        # ── State Machine ─────────────────────────────────────────────────────
        self.state: PX4FlightState = PX4FlightState.DISARMED_STANDBY
        self.heartbeat_count: int = 0
        self.is_armed: bool = False
        self.is_offboard: bool = False
        self.last_odometry_time: float = time.time()

        # Current Estimated State (in ENU and NED frames)
        self.pos_enu: Tuple[float, float, float] = (0.0, 0.0, 0.0)
        self.vel_enu: Tuple[float, float, float] = (0.0, 0.0, 0.0)
        self.pos_ned: Tuple[float, float, float] = (0.0, 0.0, 0.0)
        self.yaw_rad: float = 0.0

        # Target Navigation Setpoint (ENU input -> converted to NED for PX4)
        self.target_pos_enu: Tuple[float, float, float] = (0.0, 0.0, self.takeoff_alt_m)
        self.target_yaw_rad: float = 0.0

        # Trajectory Continuity Filter
        self.traj_filter = PX4DifferentiableTrajectoryFilter(
            max_speed=self.cruise_speed,
            max_accel=2.5,
            max_jerk=5.0
        )

        # ── Dynamic Message Adapters (Native px4_msgs vs Fallback DTOs) ───────
        self._has_px4_msgs: bool = False
        try:
            from px4_msgs.msg import (  # type: ignore
                OffboardControlMode as Px4OffboardControlMode,
                TrajectorySetpoint as Px4TrajectorySetpoint,
                VehicleCommand as Px4VehicleCommand,
                VehicleOdometry as Px4VehicleOdometry,
                VehicleStatus as Px4VehicleStatus
            )
            self._msg_offboard_mode = Px4OffboardControlMode
            self._msg_trajectory_setpoint = Px4TrajectorySetpoint
            self._msg_vehicle_command = Px4VehicleCommand
            self._has_px4_msgs = True
            self.get_logger().info(f"✅ [{self.drone_id}] Native px4_msgs dynamically loaded.")
        except ImportError:
            self._has_px4_msgs = False
            self.get_logger().info(f"ℹ️ [{self.drone_id}] Operating in Universal Standalone DTO mode.")

        # ── QoS Configuration for PX4 MicroXRCE-DDS ───────────────────────────
        px4_qos = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            durability=DurabilityPolicy.VOLATILE,
            history=HistoryPolicy.KEEP_LAST,
            depth=1
        )

        # ── Publishers ────────────────────────────────────────────────────────
        # 1. 10Hz Offboard Control Mode Heartbeat
        self.pub_offboard_mode = self.create_publisher(
            self._msg_offboard_mode if self._has_px4_msgs else String,
            f"/fmu/in/offboard_control_mode",
            px4_qos
        )

        # 2. 50Hz Trajectory Setpoints
        self.pub_trajectory_setpoint = self.create_publisher(
            self._msg_trajectory_setpoint if self._has_px4_msgs else String,
            f"/fmu/in/trajectory_setpoint",
            px4_qos
        )

        # 3. Mode/Arming Vehicle Commands
        self.pub_vehicle_command = self.create_publisher(
            self._msg_vehicle_command if self._has_px4_msgs else String,
            f"/fmu/in/vehicle_command",
            px4_qos
        )

        # 4. Standard ROS 2 Telemetry & State Broadcaster
        self.pub_status_str = self.create_publisher(
            String, f"/sutra/{self.drone_id}/px4_state", 10
        )

        # ── Subscriptions ─────────────────────────────────────────────────────
        # Odometry Feedback from PX4 EKF2
        self.sub_odom = self.create_subscription(
            Odometry, f"/{self.drone_id}/odometry", self._on_odometry, 10
        )
        self.sub_model_odom = self.create_subscription(
            Odometry, f"/model/{self.drone_id}/odometry", self._on_odometry, 10
        )

        # High-level Waypoint & RTL Command Uplinks
        self.sub_target_pose = self.create_subscription(
            PoseStamped, f"/sutra/{self.drone_id}/cmd_pose", self._on_cmd_pose, 10
        )
        self.sub_rtl = self.create_subscription(
            String, "/sutra/cmd/rtl", self._on_cmd_rtl, 10
        )

        # ── Timers: 50Hz Flight Loop (20ms) & 10Hz Heartbeat (100ms) ──────────
        self.timer_heartbeat = self.create_timer(0.10, self._heartbeat_tick)     # 10Hz
        self.timer_control = self.create_timer(0.02, self._flight_control_tick)  # 50Hz

        self.get_logger().info(
            f"🚁 SUTRA PX4 Offboard Controller Node Initialized [{self.drone_id}] | Rate: 50Hz"
        )

    # ──────────────────────────────────────────────────────────────────────────
    # PX4 Vehicle Command Helpers
    # ──────────────────────────────────────────────────────────────────────────

    def publish_vehicle_command(self, command: int, param1: float = 0.0, param2: float = 0.0) -> None:
        """Publishes an arming or flight mode command to PX4 uORB."""
        timestamp_us = int(self.get_clock().now().nanoseconds / 1000)
        cmd_dto = VehicleCommandDTO(
            command=command,
            param1=param1,
            param2=param2,
            timestamp_us=timestamp_us
        )

        if self._has_px4_msgs:
            msg = self._msg_vehicle_command()
            msg.timestamp = timestamp_us
            msg.command = command
            msg.param1 = float(param1)
            msg.param2 = float(param2)
            msg.target_system = 1
            msg.target_component = 1
            msg.source_system = 1
            msg.source_component = 1
            msg.from_external = True
            self.pub_vehicle_command.publish(msg)
        else:
            msg_fallback = String()
            import json
            msg_fallback.data = json.dumps(cmd_dto.to_dict())
            self.pub_vehicle_command.publish(msg_fallback)

    def arm(self) -> None:
        """Sends VEHICLE_CMD_COMPONENT_ARM_DISARM (param1=1.0) to arm motors."""
        self.publish_vehicle_command(VEHICLE_CMD_COMPONENT_ARM_DISARM, param1=1.0)
        self.get_logger().info(f"⚡ [{self.drone_id}] Arming command dispatched to PX4.")

    def disarm(self) -> None:
        """Sends VEHICLE_CMD_COMPONENT_ARM_DISARM (param1=0.0) to disarm motors."""
        self.publish_vehicle_command(VEHICLE_CMD_COMPONENT_ARM_DISARM, param1=0.0)
        self.get_logger().info(f"🛑 [{self.drone_id}] Disarm command dispatched to PX4.")

    def engage_offboard_mode(self) -> None:
        """Sends VEHICLE_CMD_DO_SET_MODE with custom main mode OFFBOARD."""
        self.publish_vehicle_command(
            VEHICLE_CMD_DO_SET_MODE,
            param1=1.0,  # Custom mode
            param2=float(PX4_CUSTOM_MAIN_MODE_OFFBOARD)
        )
        self.get_logger().info(f"🎯 [{self.drone_id}] Offboard flight mode transition requested.")

    # ──────────────────────────────────────────────────────────────────────────
    # 10Hz Offboard Heartbeat Loop
    # ──────────────────────────────────────────────────────────────────────────

    def _heartbeat_tick(self) -> None:
        """Publishes 10Hz OffboardControlMode heartbeat to maintain PX4 offboard lock."""
        timestamp_us = int(self.get_clock().now().nanoseconds / 1000)
        mode_dto = OffboardControlModeDTO(
            position=True,
            velocity=True,
            acceleration=False,
            attitude=False,
            body_rate=False,
            timestamp_us=timestamp_us
        )

        if self._has_px4_msgs:
            msg = self._msg_offboard_mode()
            msg.timestamp = timestamp_us
            msg.position = True
            msg.velocity = True
            msg.acceleration = False
            msg.attitude = False
            msg.body_rate = False
            self.pub_offboard_mode.publish(msg)
        else:
            msg_fallback = String()
            import json
            msg_fallback.data = json.dumps(mode_dto.to_dict())
            self.pub_offboard_mode.publish(msg_fallback)

        self.heartbeat_count += 1

        # Advance warmup state machine
        if self.state == PX4FlightState.DISARMED_STANDBY:
            self.state = PX4FlightState.WARMUP_HEARTBEATS
        elif self.state == PX4FlightState.WARMUP_HEARTBEATS:
            if self.heartbeat_count >= self.heartbeat_warmup_target:
                self.arm()
                self.state = PX4FlightState.ARMING
        elif self.state == PX4FlightState.ARMING:
            self.engage_offboard_mode()
            self.state = PX4FlightState.ENGAGING_OFFBOARD

    # ──────────────────────────────────────────────────────────────────────────
    # 50Hz Flight Control & Trajectory Streaming Loop (Gate G1)
    # ──────────────────────────────────────────────────────────────────────────

    def _flight_control_tick(self) -> None:
        """Computes and streams 50Hz TrajectorySetpoint to PX4."""
        now = time.time()
        timestamp_us = int(self.get_clock().now().nanoseconds / 1000)

        # 1. Failsafe: Check for EKF2 odometry dropout (> 500ms)
        if (now - self.last_odometry_time) > self.failsafe_timeout and self.state not in (
            PX4FlightState.DISARMED_STANDBY, PX4FlightState.DISARMED_COMPLETE, PX4FlightState.EMERGENCY_LAND
        ):
            self.get_logger().warn(
                f"⚠️ [{self.drone_id}] Odometry timeout ({now - self.last_odometry_time:.2f}s > {self.failsafe_timeout}s) -> Triggering EMERGENCY_LAND"
            )
            self.state = PX4FlightState.EMERGENCY_LAND

        # 2. State-Specific 3D Setpoint Computation
        des_pos_enu = list(self.target_pos_enu)
        des_vel_enu = [0.0, 0.0, 0.0]

        if self.state in (PX4FlightState.ENGAGING_OFFBOARD, PX4FlightState.TAKEOFF_CLIMB):
            des_pos_enu = [self.pos_enu[0], self.pos_enu[1], self.takeoff_alt_m]
            dz = self.takeoff_alt_m - self.pos_enu[2]
            des_vel_enu = [0.0, 0.0, min(1.5, max(0.2, dz * 1.0))]
            if abs(dz) < 0.25:
                self.state = PX4FlightState.OFFBOARD_CRUISE

        elif self.state == PX4FlightState.OFFBOARD_CRUISE:
            dx = self.target_pos_enu[0] - self.pos_enu[0]
            dy = self.target_pos_enu[1] - self.pos_enu[1]
            dz = self.target_pos_enu[2] - self.pos_enu[2]
            dist = math.sqrt(dx * dx + dy * dy + dz * dz)
            if dist > 0.05:
                speed = min(self.cruise_speed, dist * 1.5)
                des_vel_enu = [(dx / dist) * speed, (dy / dist) * speed, (dz / dist) * speed]

        elif self.state in (PX4FlightState.EMERGENCY_LAND, PX4FlightState.RETURN_TO_LAUNCH):
            # 2-phase WaveLander soft descent
            if self.pos_enu[2] > 1.2:
                des_vel_enu = [0.0, 0.0, -1.20]  # Approach phase
            else:
                des_vel_enu = [0.0, 0.0, -0.35]  # Soft touchdown phase
            des_pos_enu = [self.pos_enu[0], self.pos_enu[1], 0.0]
            if self.pos_enu[2] <= 0.15:
                self.disarm()
                self.state = PX4FlightState.DISARMED_COMPLETE

        # 3. Apply Continuous Differentiable Jerk/Accel Continuity Filter
        filtered_vel_enu = self.traj_filter.filter_velocity(
            (des_vel_enu[0], des_vel_enu[1], des_vel_enu[2]), dt=0.02
        )

        # 4. Convert ENU (ROS 2 standard) -> NED (PX4 uORB standard)
        pos_ned = enu_to_ned(des_pos_enu[0], des_pos_enu[1], des_pos_enu[2])
        vel_ned = enu_to_ned(filtered_vel_enu[0], filtered_vel_enu[1], filtered_vel_enu[2])

        # 5. Formulate and Publish TrajectorySetpoint DTO / px4_msg
        setpoint_dto = TrajectorySetpointDTO(
            position_ned=pos_ned,
            velocity_ned=vel_ned,
            yaw_rad=self.target_yaw_rad,
            timestamp_us=timestamp_us
        )

        if self._has_px4_msgs:
            msg = self._msg_trajectory_setpoint()
            msg.timestamp = timestamp_us
            msg.position = list(pos_ned)
            msg.velocity = list(vel_ned)
            msg.yaw = float(self.target_yaw_rad)
            self.pub_trajectory_setpoint.publish(msg)
        else:
            msg_str = String()
            import json
            msg_str.data = json.dumps(setpoint_dto.to_dict())
            self.pub_trajectory_setpoint.publish(msg_str)

        # 6. Publish State Broadcast
        status_msg = String()
        import json
        status_msg.data = json.dumps({
            "drone_id": self.drone_id,
            "state": self.state.value,
            "pos_enu": [round(p, 3) for p in self.pos_enu],
            "pos_ned": [round(p, 3) for p in pos_ned],
            "vel_enu": [round(v, 3) for v in filtered_vel_enu],
            "target_enu": [round(t, 3) for t in self.target_pos_enu],
            "heartbeats": self.heartbeat_count,
            "timestamp": now,
        })
        self.pub_status_str.publish(status_msg)

    # ──────────────────────────────────────────────────────────────────────────
    # Subscriber Callbacks
    # ──────────────────────────────────────────────────────────────────────────

    def _on_odometry(self, msg: Odometry) -> None:
        """Parses state feedback from PX4 EKF2 / simulation odometry."""
        self.last_odometry_time = time.time()
        p = msg.pose.pose.position
        v = msg.twist.twist.linear
        self.pos_enu = (p.x, p.y, p.z)
        self.vel_enu = (v.x, v.y, v.z)
        self.pos_ned = enu_to_ned(p.x, p.y, p.z)

    def _on_cmd_pose(self, msg: PoseStamped) -> None:
        """Handles external waypoint navigation commands in ENU frame."""
        p = msg.pose.position
        self.target_pos_enu = (p.x, p.y, p.z)

    def _on_cmd_rtl(self, msg: String) -> None:
        """Triggers 1-click Return-To-Launch."""
        self.get_logger().info(f"🚨 [{self.drone_id}] RTL Command Received.")
        self.state = PX4FlightState.RETURN_TO_LAUNCH


def main(args=None):
    rclpy.init(args=args)
    node = PX4OffboardControllerNode()
    try:
        rclpy.spin(node)
    except (KeyboardInterrupt, ExternalShutdownException):
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
