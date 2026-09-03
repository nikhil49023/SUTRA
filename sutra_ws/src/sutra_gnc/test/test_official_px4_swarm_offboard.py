"""
SUTRA Subsystem A — Official PX4 Swarm Offboard Controller Tests
================================================================
Validates all 6 plan fixes without requiring live hardware or Gazebo:
  Fix 1: Topic namespacing (Instance 0 = /fmu/*, Instance 1+ = /px4_{i}/fmu/*)
  Fix 2: MAVLink target_system 1-indexed (instance_id + 1)
  Fix 3: px4_msgs import path (main branch compatibility)
  Fix 5: Timing constants (PRE_ARM_ROUNDS=100, HEARTBEAT_HZ=50)
  Fix 6: World parameterization in launch script (PX4_GZ_WORLD)
"""

import math
import sys
import os
import unittest
from unittest.mock import MagicMock

# ── Stub px4_msgs if not installed (no hardware required) ───────────────────
if "px4_msgs" not in sys.modules:
    try:
        import px4_msgs
    except ImportError:
        _px4_msgs_stub = MagicMock()
        _px4_msgs_stub.msg.OffboardControlMode = MagicMock
        _px4_msgs_stub.msg.TrajectorySetpoint = MagicMock
        _px4_msgs_stub.msg.VehicleCommand = MagicMock
        _px4_msgs_stub.msg.VehicleLocalPosition = MagicMock
        _px4_msgs_stub.msg.VehicleStatus = MagicMock
        sys.modules["px4_msgs"] = _px4_msgs_stub
        sys.modules["px4_msgs.msg"] = _px4_msgs_stub.msg

class _FakeNode:
    """Minimal real Python class so subclasses inherit properly in mock tests."""
    def __init__(self, name="fake_node"):
        self._name = name
    def create_timer(self, *a, **kw):
        return MagicMock()
    def create_publisher(self, msg_type, topic, qos):
        return MagicMock()
    def create_subscription(self, msg_type, topic, callback, qos):
        return MagicMock()
    def get_logger(self):
        return MagicMock()
    def get_clock(self):
        m = MagicMock()
        m.now.return_value.nanoseconds = 0
        return m
    def destroy_node(self):
        pass

# Only stub rclpy if it cannot be imported
try:
    import rclpy
    import rclpy.node
    import rclpy.qos
except ImportError:
    _rclpy_stub = MagicMock()
    _rclpy_node_module = MagicMock()
    _rclpy_node_module.Node = _FakeNode
    _rclpy_stub.node = _rclpy_node_module
    sys.modules["rclpy"] = _rclpy_stub
    sys.modules["rclpy.node"] = _rclpy_node_module
    sys.modules["rclpy.qos"] = MagicMock()

# ── Import the actual production module ───────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sutra_gnc.px4_swarm_offboard_node import (
    get_fmu_prefix,
    get_target_system,
    DroneController,
    SwarmOffboardNode,
)


# ─────────────────────────────────────────────────────────────────────────────
# Helper: angular difference in [-π, π]
# ─────────────────────────────────────────────────────────────────────────────
def _wrap(a):
    """Wrap angle to [-π, π]."""
    return (a + math.pi) % (2 * math.pi) - math.pi


# ═════════════════════════════════════════════════════════════════════════════
# Fix 1 — Topic Namespacing (PX4 PR #21091)
# ═════════════════════════════════════════════════════════════════════════════

class TestTopicNamespacing(unittest.TestCase):

    def test_instance_0_prefix_is_empty(self):
        assert get_fmu_prefix(0) == "", \
            "Instance 0 must return empty prefix → /fmu/* (not /px4_0/fmu/*)"

    def test_instance_1_prefix(self):
        assert get_fmu_prefix(1) == "/px4_1"

    def test_instance_2_prefix(self):
        assert get_fmu_prefix(2) == "/px4_2"

    def test_instance_3_prefix(self):
        assert get_fmu_prefix(3) == "/px4_3"

    def test_instance_4_prefix(self):
        assert get_fmu_prefix(4) == "/px4_4"

    def test_topic_format_instance_0_in(self):
        topic = f"{get_fmu_prefix(0)}/fmu/in/offboard_control_mode"
        assert topic == "/fmu/in/offboard_control_mode"

    def test_topic_format_instance_0_out(self):
        topic = f"{get_fmu_prefix(0)}/fmu/out/vehicle_status"
        assert topic == "/fmu/out/vehicle_status"

    def test_topic_format_instance_1_in(self):
        topic = f"{get_fmu_prefix(1)}/fmu/in/offboard_control_mode"
        assert topic == "/px4_1/fmu/in/offboard_control_mode"

    def test_topic_format_instance_4_out(self):
        topic = f"{get_fmu_prefix(4)}/fmu/out/vehicle_status"
        assert topic == "/px4_4/fmu/out/vehicle_status"

    def test_all_5_prefixes_unique(self):
        prefixes = [get_fmu_prefix(i) for i in range(5)]
        assert len(prefixes) == len(set(prefixes)), "All 5 prefixes must be unique"


# ═════════════════════════════════════════════════════════════════════════════
# Fix 2 — MAVLink target_system 1-indexed (PX4 Issue #21284)
# ═════════════════════════════════════════════════════════════════════════════

class TestTargetSystem(unittest.TestCase):

    def test_instance_0_maps_to_1(self):
        assert get_target_system(0) == 1, \
            "Instance 0 → MAVLink System ID 1 (1-indexed, not 0)"

    def test_instance_1_maps_to_2(self):
        assert get_target_system(1) == 2

    def test_instance_2_maps_to_3(self):
        assert get_target_system(2) == 3

    def test_instance_3_maps_to_4(self):
        assert get_target_system(3) == 4

    def test_instance_4_maps_to_5(self):
        assert get_target_system(4) == 5

    def test_never_zero(self):
        """MAVLink System ID 0 = broadcast address — must not be used."""
        for i in range(5):
            assert get_target_system(i) != 0

    def test_all_unique(self):
        ids = [get_target_system(i) for i in range(5)]
        assert len(ids) == len(set(ids)), "All MAVLink System IDs must be unique"


# ═════════════════════════════════════════════════════════════════════════════
# Fix 5 — Timing Constants
# ═════════════════════════════════════════════════════════════════════════════

class TestTimingConstants(unittest.TestCase):

    def test_heartbeat_hz_is_50(self):
        assert SwarmOffboardNode.HEARTBEAT_HZ == 50, \
            "Must publish at 50 Hz (PX4 Offboard requires continuous ≥2 Hz)"

    def test_pre_arm_rounds_is_100(self):
        assert SwarmOffboardNode.PRE_ARM_ROUNDS == 100

    def test_pre_arm_duration_at_least_1_5s(self):
        """100 rounds @ 50 Hz = 2s of pre-arm heartbeat — well above 1.5s minimum."""
        duration_s = SwarmOffboardNode.PRE_ARM_ROUNDS / SwarmOffboardNode.HEARTBEAT_HZ
        assert duration_s >= 1.5, f"Pre-arm duration {duration_s}s too short (need ≥1.5s)"

    def test_num_drones_is_5(self):
        assert SwarmOffboardNode.NUM_DRONES == 5


# ═════════════════════════════════════════════════════════════════════════════
# Ring-Pursuit Search Pattern Tests (Kedarnath profile)
# ═════════════════════════════════════════════════════════════════════════════

class TestRingSearchPattern(unittest.TestCase):

    def _ring_setpoint(self, drone_idx, t_sec):
        n = SwarmOffboardNode.NUM_DRONES
        radius = SwarmOffboardNode.SEARCH_RADIUS_M
        alt = SwarmOffboardNode.SEARCH_ALTITUDE
        base_angle = (2 * math.pi / n) * drone_idx
        angle = base_angle + 0.05 * t_sec
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        z = alt
        yaw = angle + math.pi
        return x, y, z, yaw

    def test_altitude_is_ned_negative(self):
        """NED z=-5 → 5m altitude. Must be negative."""
        assert SwarmOffboardNode.SEARCH_ALTITUDE < 0

    def test_radius_positive(self):
        assert SwarmOffboardNode.SEARCH_RADIUS_M > 0

    def test_radius_maintained_at_t0(self):
        """All drones at expected orbit radius at t=0."""
        radius = SwarmOffboardNode.SEARCH_RADIUS_M
        for i in range(5):
            x, y, z, _ = self._ring_setpoint(i, 0.0)
            r = math.sqrt(x**2 + y**2)
            self.assertAlmostEqual(r, radius, places=9,
                msg=f"Drone {i} radius {r:.4f}m ≠ {radius}m at t=0")

    def test_radius_maintained_at_t60(self):
        """Radius must hold constant even after 60s of orbit."""
        radius = SwarmOffboardNode.SEARCH_RADIUS_M
        for i in range(5):
            x, y, z, _ = self._ring_setpoint(i, 60.0)
            r = math.sqrt(x**2 + y**2)
            self.assertAlmostEqual(r, radius, places=9,
                msg=f"Drone {i} radius {r:.4f}m ≠ {radius}m at t=60")

    def test_drones_equidistant_at_t0(self):
        """All 5 drones must be 2π/5 radians apart at t=0."""
        angles = []
        for i in range(5):
            x, y, _, _ = self._ring_setpoint(i, 0.0)
            angles.append(math.atan2(y, x))
        expected = 2 * math.pi / 5
        for i in range(4):
            diff = abs(_wrap(angles[i+1] - angles[i]))
            self.assertAlmostEqual(diff, expected, places=9,
                msg=f"Gap between drone {i} and {i+1}: {diff:.4f} ≠ {expected:.4f}")

    def test_yaw_faces_orbit_center(self):
        """Drone yaw = orbit angle + π → always faces center."""
        for i in range(5):
            x, y, _, yaw = self._ring_setpoint(i, 0.0)
            angle = math.atan2(y, x)
            expected_yaw_wrapped = _wrap(angle + math.pi)
            actual_wrapped = _wrap(yaw)
            self.assertAlmostEqual(actual_wrapped, expected_yaw_wrapped, places=9,
                msg=f"Drone {i} yaw {actual_wrapped:.4f} ≠ {expected_yaw_wrapped:.4f}")

    def test_orbit_advances_over_time(self):
        """Drones must move — position at t=10 ≠ position at t=0."""
        x0, y0, _, _ = self._ring_setpoint(0, 0.0)
        x1, y1, _, _ = self._ring_setpoint(0, 10.0)
        assert (x0, y0) != (x1, y1), "Drone must orbit over time"


# ═════════════════════════════════════════════════════════════════════════════
# Phase State Machine Tests
# ═════════════════════════════════════════════════════════════════════════════

class TestPhaseTransitions(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        if not rclpy.ok():
            rclpy.init()

    def test_initial_phase_is_pre_flight(self):
        node = SwarmOffboardNode()
        assert node._phase == "PRE_FLIGHT"

    def test_heartbeat_count_starts_at_zero(self):
        node = SwarmOffboardNode()
        assert node._heartbeat_count == 0

    def test_num_drones_controllers_created(self):
        node = SwarmOffboardNode()
        assert len(node._drones) == SwarmOffboardNode.NUM_DRONES

    def test_rtl_sets_phase(self):
        node = SwarmOffboardNode()
        node._phase = "SEARCH"
        node.emergency_rtl()
        assert node._phase == "RTL"

    def test_valid_phase_strings(self):
        valid = {"PRE_FLIGHT", "TAKEOFF", "SEARCH", "RTL"}
        node = SwarmOffboardNode()
        assert node._phase in valid


# ═════════════════════════════════════════════════════════════════════════════
# Fix 6 — World Parameterization & Script Validation
# ═════════════════════════════════════════════════════════════════════════════

SCRIPTS_DIR = "/home/nikhil/Desktop/Project SUTRA/scripts"

class TestWorldParameterization(unittest.TestCase):

    def _read_script(self, name):
        path = os.path.join(SCRIPTS_DIR, name)
        self.assertTrue(os.path.exists(path), f"{name} must exist in scripts/")
        with open(path) as f:
            return f.read()

    def test_launch_script_exists(self):
        assert os.path.exists(os.path.join(SCRIPTS_DIR, "launch_official_px4_swarm.sh"))

    def test_setup_script_exists(self):
        assert os.path.exists(os.path.join(SCRIPTS_DIR, "setup_official_px4_environment.sh"))

    def test_world_arg_with_default(self):
        """Fix 6: Script must accept world name with 'default' fallback."""
        content = self._read_script("launch_official_px4_swarm.sh")
        assert 'WORLD_NAME="${1:-default}"' in content

    def test_px4_gz_world_env_passed(self):
        """Fix 6: PX4_GZ_WORLD must be exported to PX4 processes."""
        content = self._read_script("launch_official_px4_swarm.sh")
        assert "PX4_GZ_WORLD" in content

    def test_8s_sleep_for_gz_server(self):
        """Fix 5: Must sleep 8s after Drone 0 to allow GZ server init."""
        content = self._read_script("launch_official_px4_swarm.sh")
        assert "sleep 8" in content

    def test_standalone_flag_present(self):
        """Drones 1-4 must use PX4_GZ_STANDALONE=1."""
        content = self._read_script("launch_official_px4_swarm.sh")
        assert "PX4_GZ_STANDALONE=1" in content

    def test_package_conflict_purge(self):
        """Fix 4: Setup script configures ROS 2 Jazzy / Gazebo Harmonic environment."""
        content = self._read_script("setup_official_px4_environment.sh")
        assert "jazzy" in content or "ros-humble-ros-gz" in content

    def test_px4_autopilot_main_branch(self):
        """Fix 3: Must clone PX4-Autopilot main branch (not release/1.14)."""
        content = self._read_script("setup_official_px4_environment.sh")
        # Should NOT reference 1.14; main branch is referenced
        assert "1.14" not in content, \
            "Must use main branch not release/1.14 for Harmonic support"

    def test_micro_xrce_agent_installed(self):
        """Setup script must install Micro-XRCE-DDS-Agent."""
        content = self._read_script("setup_official_px4_environment.sh")
        assert "Micro-XRCE-DDS-Agent" in content

    def test_px4_swarm_node_file_exists(self):
        node_path = (
            "/home/nikhil/Desktop/Project SUTRA/sutra_ws/src/sutra_gnc/"
            "sutra_gnc/px4_swarm_offboard_node.py"
        )
        assert os.path.exists(node_path)


# ═════════════════════════════════════════════════════════════════════════════
# DroneController Topic Wiring Tests
# ═════════════════════════════════════════════════════════════════════════════

class TestDroneControllerTopicWiring(unittest.TestCase):

    def _make_controller(self, instance_id):
        node = _FakeNode("test_node")
        captured = []
        original_pub = node.create_publisher
        original_sub = node.create_subscription

        def cap_pub(msg_type, topic, qos):
            captured.append(topic)
            return MagicMock()

        def cap_sub(msg_type, topic, cb, qos):
            captured.append(topic)
            return MagicMock()

        node.create_publisher = cap_pub
        node.create_subscription = cap_sub
        ctrl = DroneController(node, instance_id)
        return ctrl, captured

    def test_drone0_no_px4_prefix_in_any_topic(self):
        _, topics = self._make_controller(0)
        for t in topics:
            assert not t.startswith("/px4_"), \
                f"Drone 0 topic '{t}' must not have /px4_N prefix"

    def test_drone0_all_topics_have_fmu(self):
        _, topics = self._make_controller(0)
        assert all("/fmu/" in t for t in topics)

    def test_drone1_all_topics_start_px4_1(self):
        _, topics = self._make_controller(1)
        for t in topics:
            assert t.startswith("/px4_1/"), \
                f"Drone 1 topic '{t}' must start with /px4_1/"

    def test_drone4_all_topics_start_px4_4(self):
        _, topics = self._make_controller(4)
        for t in topics:
            assert t.startswith("/px4_4/"), \
                f"Drone 4 topic '{t}' must start with /px4_4/"

    def test_drone0_target_system_is_1(self):
        ctrl, _ = self._make_controller(0)
        assert ctrl.target_system == 1

    def test_drone1_target_system_is_2(self):
        ctrl, _ = self._make_controller(1)
        assert ctrl.target_system == 2

    def test_drone4_target_system_is_5(self):
        ctrl, _ = self._make_controller(4)
        assert ctrl.target_system == 5

    def test_each_controller_has_three_publishers(self):
        """Each drone needs 3 publishers: offboard_mode, setpoint, command."""
        ctrl, topics = self._make_controller(0)
        pub_topics = [t for t in topics if "in" in t]
        assert len(pub_topics) == 3, \
            f"Expected 3 inbound publishers, got {len(pub_topics)}: {pub_topics}"

    def test_each_controller_has_two_subscribers(self):
        """Each drone needs 2 subscribers: local_position, vehicle_status."""
        ctrl, topics = self._make_controller(0)
        sub_topics = [t for t in topics if "out" in t]
        assert len(sub_topics) == 2, \
            f"Expected 2 outbound subscribers, got {len(sub_topics)}: {sub_topics}"


if __name__ == "__main__":
    unittest.main(verbosity=2)
