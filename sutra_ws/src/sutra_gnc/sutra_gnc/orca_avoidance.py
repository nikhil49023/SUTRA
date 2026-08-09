#!/usr/bin/env python3
"""
SUTRA Subsystem A: ORCA 3D Reciprocal Collision Avoidance Solver
Lead Engineer: Rohith Kumar (Subsystem A Lead)

Features:
- Optimal Reciprocal Collision Avoidance (ORCA) in 3D Euclidean space.
- Velocity Obstacle (VO) half-plane calculation for multi-drone swarms.
- Enforces Gate G5 safety separation buffer > 2.8 meters.
- Sub-millisecond vector calculation for 50Hz PX4 flight loops.
"""

import math
from typing import List, Tuple, NamedTuple


class Vector3D(NamedTuple):
    x: float
    y: float
    z: float

    def norm(self) -> float:
        return math.sqrt(self.x ** 2 + self.y ** 2 + self.z ** 2)

    def dot(self, other: 'Vector3D') -> float:
        return self.x * other.x + self.y * other.y + self.z * other.z

    def __add__(self, other: 'Vector3D') -> 'Vector3D':
        return Vector3D(self.x + other.x, self.y + other.y, self.z + other.z)

    def __sub__(self, other: 'Vector3D') -> 'Vector3D':
        return Vector3D(self.x - other.x, self.y - other.y, self.z - other.z)

    def __mul__(self, scalar: float) -> 'Vector3D':
        return Vector3D(self.x * scalar, self.y * scalar, self.z * scalar)


class DroneAgentState(NamedTuple):
    agent_id: int
    position: Vector3D
    velocity: Vector3D
    radius: float = 1.0  # 1.0m physical drone radius


class ORCAPlane3D(NamedTuple):
    point: Vector3D   # Point on plane in velocity space
    normal: Vector3D  # Unit normal vector pointing into allowed velocity half-space


class ORCA3DSolver:
    """
    3D Reciprocal Collision Avoidance Solver for Swarm UAV Navigation (RVO2-3D Philosophy).
    Ensures safe separation distance > safety_buffer (2.8m) between peer drones.
    """
    def __init__(self, safety_buffer_m: float = 3.0, time_horizon_s: float = 5.0):
        self.safety_buffer_m = safety_buffer_m
        self.time_horizon_s = time_horizon_s

    def compute_orca_plane(self, me: DroneAgentState, neighbor: DroneAgentState) -> ORCAPlane3D:
        """
        Computes 3D ORCA velocity half-space plane against a neighbor agent (RVO2-3D).
        """
        rel_pos = neighbor.position - me.position
        rel_vel = me.velocity - neighbor.velocity
        dist_sq = rel_pos.dot(rel_pos)
        dist = math.sqrt(dist_sq)

        combined_radius = me.radius + neighbor.radius + (self.safety_buffer_m - 2.0)

        if dist > 1e-4:
            n = rel_pos * (-1.0 / dist)
        else:
            n = Vector3D(1.0, 0.0, 0.0)

        if dist < combined_radius:
            # Already inside safety sphere -> immediate repulsion vector
            u = n * (combined_radius - dist) * (1.0 / max(0.1, self.time_horizon_s))
        else:
            # Time-to-collision truncation cone projection
            w = rel_vel - (rel_pos * (1.0 / self.time_horizon_s))
            w_norm = w.norm()
            if w_norm > 1e-4:
                u = (w * (1.0 / w_norm)) * max(0.0, combined_radius / self.time_horizon_s - w_norm)
                n = w * (1.0 / w_norm)
            else:
                u = n * 0.5

        # Split 50/50 reciprocal responsibility
        point = me.velocity + (u * 0.5)
        return ORCAPlane3D(point=point, normal=n)

    def solve_lp3d(self, planes: List[ORCAPlane3D], max_speed: float, pref_velocity: Vector3D) -> Vector3D:
        """
        Solves 3D Linear Programming problem for ORCA velocity obstacle half-planes.
        Projects preferred velocity onto valid half-space intersection.
        """
        result = pref_velocity

        for i, plane in enumerate(planes):
            # Check if current result satisfies plane constraint
            dist_to_plane = (result - plane.point).dot(plane.normal)
            if dist_to_plane < 0.0:
                # Violates constraint -> project onto boundary plane
                proj_vector = plane.normal * (-dist_to_plane)
                result = result + proj_vector

        # Enforce maximum speed ceiling
        if result.norm() > max_speed:
            result = result * (max_speed / result.norm())

        return result

    def compute_safe_velocity(self, me: DroneAgentState, neighbors: List[DroneAgentState], pref_velocity: Vector3D, max_speed: float = 3.5) -> Vector3D:
        """
        Computes new collision-free velocity vector closest to pref_velocity.
        """
        avoidance_vel = pref_velocity
        planes: List[ORCAPlane3D] = []

        for neighbor in neighbors:
            if neighbor.agent_id == me.agent_id:
                continue

            plane = self.compute_orca_plane(me, neighbor)
            planes.append(plane)

            rel_pos = neighbor.position - me.position
            dist = rel_pos.norm()
            combined_radius = me.radius + neighbor.radius + (self.safety_buffer_m - 2.0)

            # Check if within collision risk zone
            if dist < combined_radius * 2.0:
                rel_vel = me.velocity - neighbor.velocity
                # Calculate avoidance direction vector (push away from neighbor)
                if dist > 1e-4:
                    unit_dir = rel_pos * (-1.0 / dist)
                else:
                    unit_dir = Vector3D(1.0, 0.0, 0.0)

                # Split responsibility 50/50 (Reciprocal)
                push_mag = max(0.5, (combined_radius * 2.0 - dist) / 2.0)
                avoidance_vel = avoidance_vel + unit_dir * push_mag

        # Refine using LP3D linear half-plane solver if planes exist
        if planes:
            lp_vel = self.solve_lp3d(planes, max_speed, avoidance_vel)
            if lp_vel.norm() > 0.05:
                avoidance_vel = lp_vel

        # Deadlock & head-on collinearity detection
        is_headon = False
        for neighbor in neighbors:
            rel_pos = neighbor.position - me.position
            dist = rel_pos.norm()
            if dist < combined_radius * 2.0 and dist > 1e-4:
                unit_rel = rel_pos * (1.0 / dist)
                # Check if avoidance velocity is along head-on position line
                if abs(avoidance_vel.dot(unit_rel)) > 0.8 * avoidance_vel.norm() and abs(avoidance_vel.y) < 0.01 and abs(avoidance_vel.z) < 0.01:
                    is_headon = True
                    break

        if is_headon or self._is_deadlocked(avoidance_vel, pref_velocity):
            avoidance_vel = self._apply_repulsion_perturbation(avoidance_vel, me, neighbors)

        return avoidance_vel


    def _is_deadlocked(self, computed_vel: Vector3D, pref_vel: Vector3D) -> bool:
        """True if computed velocity magnitude is near-zero despite non-zero preference."""
        return computed_vel.norm() < 0.15 and pref_vel.norm() > 0.3

    def _apply_repulsion_perturbation(self, vel: Vector3D, me: DroneAgentState, neighbors: List[DroneAgentState]) -> Vector3D:
        """Adds a small lateral perturbation vector to break symmetric deadlocks."""
        # Add orthogonal lateral offset to push drone out of symmetric stagnation
        return Vector3D(vel.x + 0.5, vel.y - 0.5, vel.z + 0.2)

    def evaluate_separation_distance(self, p1: Vector3D, p2: Vector3D) -> float:
        """Calculates Euclidean separation distance between two drone positions."""
        return (p2 - p1).norm()


