#!/usr/bin/env python3
"""
Test Suite: Coordinated Multi-Drone Search & Rescue Operation (Subsystem A & B)
=================================================================================
Verifies 5-UAV sector search waypoint assignment, SwarmRaft SURVIVOR_GPS commit
event parsing & mode re-tasking, 5-point concentric orbit surround positioning,
and Gate G5 ORCA 3D clearance (>= 2.80m).
"""

import math
import json
import pytest
import rclpy
from std_msgs.msg import String

from sutra_gnc.coordinated_swarm_search_node import (
    CoordinatedSwarmSearchNode,
    get_sector_waypoints,
    compute_concentric_orbit_positions,
    calculate_preferred_velocity,
    parse_survivor_gps_event,
    DEFAULT_SWARM_DRONES,
)
from sutra_gnc.orca_avoidance import Orca3DSolver


@pytest.fixture(scope="module", autouse=True)
def init_rclpy():
    if not rclpy.ok():
        rclpy.init()
    yield
    if rclpy.ok():
        rclpy.shutdown()


def test_5_sector_waypoint_assignment():
    """
    Verifies that all 5 UAVs receive distinct 3D search sector lawnmower grid waypoints.
    """
    drones = DEFAULT_SWARM_DRONES
    assert len(drones) == 5

    sector_map = {}
    for d in drones:
        wpts = get_sector_waypoints(d)
        assert len(wpts) > 0, f"Drone {d} has empty sector waypoints!"
        sector_map[d] = wpts

    # Assert that all 5 drones have distinct sector waypoints
    for i in range(len(drones)):
        for j in range(i + 1, len(drones)):
            d1, d2 = drones[i], drones[j]
            assert sector_map[d1] != sector_map[d2], f"Sector overlap between {d1} and {d2}!"


def test_swarmraft_survivor_gps_event_parsing():
    """
    Verifies parsing of SwarmRaft consensus messages for SURVIVOR_GPS commit events.
    """
    # 1. Valid local Cartesian SURVIVOR_GPS payload
    payload_cartesian = {
        "event": "NEW_TARGET_COMMITTED",
        "entry": {
            "term": 1,
            "index": 2,
            "type": "SURVIVOR_GPS",
            "data": {
                "x": 12.5,
                "y": -8.0,
                "z": 2.0,
                "confidence": 0.94,
                "label": "SURVIVOR",
            },
        },
    }
    pos1 = parse_survivor_gps_event(json.dumps(payload_cartesian))
    assert pos1 is not None
    assert pos1 == (12.5, -8.0, 2.0)

    # 2. Valid WGS84 GPS SURVIVOR_GPS payload (with local meter scale lat/lon)
    payload_gps_meter = {
        "event": "NEW_TARGET_COMMITTED",
        "entry": {
            "term": 2,
            "index": 5,
            "type": "SURVIVOR_GPS",
            "data": {
                "lat": 15.0,
                "lon": 20.0,
                "alt": 4.5,
                "confidence": 0.88,
                "label": "POSSIBLE_SURVIVOR",
            },
        },
    }
    pos2 = parse_survivor_gps_event(json.dumps(payload_gps_meter))
    assert pos2 is not None
    assert pos2 == (15.0, 20.0, 4.5)

    # 3. Non-survivor event payload (e.g. THREAT_GPS) should return None
    payload_threat = {
        "event": "NEW_TARGET_COMMITTED",
        "entry": {
            "term": 1,
            "index": 3,
            "type": "THREAT_GPS",
            "data": {"lat": 37.77, "lon": -122.41, "alt": 10.0},
        },
    }
    pos_threat = parse_survivor_gps_event(json.dumps(payload_threat))
    assert pos_threat is None


def test_5_drone_concentric_orbit_positions():
    """
    Verifies 5-point concentric orbital surround position calculation:
    - Orbit radius = 10.0m around survivor position
    - Altitudes staggered between 3.5m and 6.0m
    - Inter-position clearance >= 2.80m
    """
    survivor_pos = (5.0, -10.0, 1.0)
    orbit_map = compute_concentric_orbit_positions(
        survivor_pos=survivor_pos,
        radius=10.0,
        min_alt=3.5,
        max_alt=6.0,
        drones=DEFAULT_SWARM_DRONES,
    )

    assert len(orbit_map) == 5

    sx, sy, sz = survivor_pos
    altitudes = []

    for i, drone_id in enumerate(DEFAULT_SWARM_DRONES):
        px, py, pz = orbit_map[drone_id]

        # 2D Planar radius to survivor center must equal 10.0m (+/- 0.05m)
        r_xy = math.sqrt((px - sx) ** 2 + (py - sy) ** 2)
        assert pytest.approx(r_xy, abs=0.05) == 10.0

        # Altitude relative to survivor elevation must lie within [3.5, 6.0]
        alt_rel = pz - sz
        assert 3.5 <= alt_rel <= 6.0
        altitudes.append(alt_rel)

    # Assert altitudes are properly staggered
    assert max(altitudes) == 6.0
    assert min(altitudes) == 3.5

    # Pairwise clearance check between concentric surround target positions
    for i in range(len(DEFAULT_SWARM_DRONES)):
        for j in range(i + 1, len(DEFAULT_SWARM_DRONES)):
            d1, d2 = DEFAULT_SWARM_DRONES[i], DEFAULT_SWARM_DRONES[j]
            p1, p2 = orbit_map[d1], orbit_map[d2]
            dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(p1, p2)))
            assert dist >= 2.80, f"Orbital target positions for {d1} and {d2} are too close ({dist:.2f}m < 2.80m)"


def test_node_retasking_on_raft_consensus():
    """
    Tests CoordinatedSwarmSearchNode mode transition from SECTOR_SEARCH to SURVIVOR_CONCENTRIC_SURROUND.
    """
    node = CoordinatedSwarmSearchNode()
    assert node.phase == "SECTOR_SEARCH"
    assert node.survivor_gps is None

    # Simulate receiving Raft consensus SURVIVOR_GPS commit event
    raft_msg = String()
    raft_msg.data = json.dumps({
        "event": "NEW_TARGET_COMMITTED",
        "entry": {
            "term": 1,
            "index": 2,
            "type": "SURVIVOR_GPS",
            "data": {
                "x": 8.0,
                "y": 12.0,
                "z": 0.0,
                "label": "SURVIVOR",
            },
        },
    })

    node._on_raft_consensus(raft_msg)

    assert node.phase == "SURVIVOR_CONCENTRIC_SURROUND"
    assert node.survivor_gps == (8.0, 12.0, 0.0)

    node.destroy_node()


def test_gate_g5_clearance_during_coordinated_search_and_orbit():
    """
    Simulates 5 drones during sector search and transition to 5-point concentric surround orbit.
    Asserts minimum inter-drone clearance >= 2.80m (Gate G5 compliance) throughout the trajectory.
    """
    solver = Orca3DSolver(safety_radius=1.40, time_horizon=5.0, max_speed=3.0)
    drones = DEFAULT_SWARM_DRONES
    num_drones = len(drones)

    # Initial positions (sector search starting positions)
    positions = {
        "uav_alpha": [15.0, 0.0, 4.0],
        "uav_beta": [4.635, 14.265, 4.0],
        "uav_gamma": [-12.135, 8.816, 4.0],
        "uav_delta": [-12.135, -8.816, 4.0],
        "uav_epsilon": [4.635, -14.265, 4.0],
    }
    velocities = {d: [0.0, 0.0, 0.0] for d in drones}

    survivor_target = (0.0, 0.0, 0.0)
    orbit_targets = compute_concentric_orbit_positions(
        survivor_pos=survivor_target,
        radius=10.0,
        min_alt=3.5,
        max_alt=6.0,
        drones=drones,
    )

    dt = 0.05
    simulation_steps = 200
    min_distance_observed = float("inf")

    for step in range(simulation_steps):
        next_velocities = {}
        for drone_i in drones:
            pos_i = tuple(positions[drone_i])
            vel_i = tuple(velocities[drone_i])

            target_i = orbit_targets[drone_i]
            pref_vel_i = calculate_preferred_velocity(pos_i, target_i, max_speed=3.0)

            neighbors = [
                (tuple(positions[drone_j]), tuple(velocities[drone_j]))
                for drone_j in drones
                if drone_j != drone_i
            ]

            safe_vel = solver.compute_avoidance_velocity(pos_i, vel_i, pref_vel_i, neighbors)
            next_velocities[drone_i] = safe_vel

        # Integrate positions
        for drone_i in drones:
            velocities[drone_i] = list(next_velocities[drone_i])
            positions[drone_i][0] += velocities[drone_i][0] * dt
            positions[drone_i][1] += velocities[drone_i][1] * dt
            positions[drone_i][2] += velocities[drone_i][2] * dt

        # Pairwise distance check for Gate G5 (>= 2.80m)
        for i in range(num_drones):
            for j in range(i + 1, num_drones):
                d1, d2 = drones[i], drones[j]
                dx = positions[d1][0] - positions[d2][0]
                dy = positions[d1][1] - positions[d2][1]
                dz = positions[d1][2] - positions[d2][2]
                dist = math.sqrt(dx * dx + dy * dy + dz * dz)

                if dist < min_distance_observed:
                    min_distance_observed = dist

    assert min_distance_observed >= 2.80, (
        f"Gate G5 Clearance Violation in Coordinated Search! Min distance reached {min_distance_observed:.3f}m < 2.80m"
    )


def test_swarm_fixed_path_perception_target_tracking():
    """
    Verifies that SwarmFixedPathNode ingests perception detections (e.g., from Kaggle GPU),
    switches to TARGET_TRACK mode, and calculates dynamic concentric orbiting velocities.
    """
    from sutra_gnc.swarm_fixed_path_node import SwarmFixedPathNode
    from rclpy.parameter import Parameter

    node = SwarmFixedPathNode(
        parameter_overrides=[
            Parameter("drone_id", Parameter.Type.STRING, "uav_alpha"),
            Parameter("route_mode", Parameter.Type.STRING, "canopy_forest"),
        ]
    )

    try:
        assert node.flight_mode == "MISSION"
        assert node.detected_target is None

        # Simulate incoming Kaggle GPU detection message
        sample_detection = {
            "status": "CONFIRMED",
            "source": "kaggle_gpu_perception",
            "targets": [
                {
                    "target_code": "TGT-01",
                    "class_name": "Survivor",
                    "confidence": 0.962,
                    "local_ned": {"x": 6.15, "y": 7.88, "z": 37.80},
                    "wgs84": {"latitude": 11.524871, "longitude": 76.128456, "altitude": 782.5},
                }
            ],
        }

        msg = String()
        msg.data = json.dumps(sample_detection)
        node._on_perception_targets(msg)

        # Assert target parsed and mode transitioned
        assert node.detected_target == (6.15, 7.88, 37.80)
        assert node.flight_mode == "TARGET_TRACK"

        # Test control loop behavior in TARGET_TRACK mode
        node.has_pose = True
        node.is_airborne = True
        node.x, node.y, node.z = 6.15, 7.88, 43.80  # near target

        # Run one iteration of control loop without throwing exception
        node._control_loop()
    finally:
        node.destroy_node()

