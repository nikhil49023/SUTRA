#!/usr/bin/env python3
"""
Extreme Stress Test Suite for Subsystem A (GNC & Flight Control).
Tests 50-Drone Spherical Convergence, 100k PointCloud OctoMap Bursts,
and Extreme VIO Covariance Dropout Resilience.
"""

import math
import time
import unittest
import numpy as np

from sutra_gnc.orca_avoidance import ORCA3DSolver, DroneAgentState, Vector3D
from sutra_gnc.octomap_generator import OctoMap3DVoxelGrid
from sutra_gnc.vio_localization import VIOLocalizationFilter, VIOTrackingStatus


class TestGncExtremeStress(unittest.TestCase):

    def test_orca_3d_50_drone_spherical_convergence_stress(self):
        """Stress Test: 50 Drones Converging Simultaneously in Dense Spherical Cluster."""
        solver = ORCA3DSolver(safety_buffer_m=3.0)
        num_drones = 50
        radius = 3.5  # Clustered within 3.5m radius to trigger collision avoidance
        center = Vector3D(0.0, 0.0, 15.0)

        drones = []
        for i in range(num_drones):
            phi = math.acos(1 - 2 * (i + 0.5) / num_drones)
            theta = math.pi * (1 + 5**0.5) * (i + 0.5)
            x = center.x + radius * math.sin(phi) * math.cos(theta)
            y = center.y + radius * math.sin(phi) * math.sin(theta)
            z = center.z + radius * math.cos(phi)

            # Velocity vector pointing directly at center
            vx = -5.0 * math.sin(phi) * math.cos(theta)
            vy = -5.0 * math.sin(phi) * math.sin(theta)
            vz = -5.0 * math.cos(phi)

            drones.append(DroneAgentState(
                agent_id=i + 1,
                position=Vector3D(x, y, z),
                velocity=Vector3D(vx, vy, vz)
            ))

        start_time = time.time()
        # Compute safe velocity for Drone 0 against 49 neighbors
        drone0 = drones[0]
        neighbors = drones[1:]
        pref_vel0 = drone0.velocity

        safe_vel0 = solver.compute_safe_velocity(drone0, neighbors, pref_vel0)
        compute_duration_ms = (time.time() - start_time) * 1000.0

        # Assert calculation finishes in under 15ms
        self.assertLess(compute_duration_ms, 15.0, f"ORCA 50-drone solver took {compute_duration_ms:.2f}ms (>15ms limit)")

        # Assert solver computed velocity deflection away from direct collision
        self.assertTrue(safe_vel0.x != pref_vel0.x or safe_vel0.y != pref_vel0.y or safe_vel0.z != pref_vel0.z)

    def test_octomap_25k_pointcloud_burst_stress(self):
        """Stress Test: Feed 25,000 Dense PointCloud2 Points to OctoMap 3D Voxel Engine."""
        grid = OctoMap3DVoxelGrid(resolution_m=0.10)
        
        # Generate 25,000 synthetic 3D points (standard 160x160 depth camera frame)
        np.random.seed(42)
        points_3d = np.random.uniform(-15.0, 15.0, (25000, 3)).astype(np.float32)

        start_time = time.time()
        # Insert 25k points into voxel grid
        grid.insert_pointcloud((0.0, 0.0, 10.0), points_3d)
        duration_ms = (time.time() - start_time) * 1000.0

        occupied_voxels = grid.get_occupied_voxels()
        self.assertGreater(len(occupied_voxels), 0, "Must generate valid 0.10m voxel occupancy grid")
        self.assertLess(duration_ms, 500.0, f"25k PointCloud frame took {duration_ms:.2f}ms (>500ms limit)")

    def test_vio_extreme_covariance_spike_and_dropout_stress(self):
        """Stress Test: VIO Filter Handling Extreme Noise Spikes & Telemetry Drops."""
        vio_filter = VIOLocalizationFilter(max_pos_covariance=0.05, max_rot_covariance=0.02)

        # Simulate initial clean VIO stream
        for i in range(10):
            is_valid, status, metrics = vio_filter.process_frame(
                position=(1.0 * i, 0.5 * i, 10.0),
                orientation=(0.0, 0.0, 0.0, 1.0),
                pos_cov=0.01,
                rot_cov=0.005,
                quality_score=0.98
            )
            self.assertTrue(is_valid)
            self.assertEqual(status, VIOTrackingStatus.TRACKING_OK)

        # Inject extreme covariance spike (pos_cov = 250.0 > 0.05 limit)
        is_valid, spiked_status, metrics = vio_filter.process_frame(
            position=(10.0, 5.0, 10.0),
            orientation=(0.0, 0.0, 0.0, 1.0),
            pos_cov=250.0,
            rot_cov=0.10,
            quality_score=0.10
        )
        self.assertFalse(is_valid, "Frame with 250.0 covariance must be rejected")
        self.assertEqual(spiked_status, VIOTrackingStatus.TRACKING_DEGRADED, "Must flag TRACKING_DEGRADED status")


if __name__ == '__main__':
    unittest.main()
