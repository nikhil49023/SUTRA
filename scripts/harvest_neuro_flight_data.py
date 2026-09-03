#!/usr/bin/env python3
"""
PROJECT SUTRA — Physics-Accurate Flight Telemetry Dataset Harvester
==================================================================
Author: Tech Lead Nikhil (Subsystem A Lead)
Location: scripts/harvest_neuro_flight_data.py

Simulates and records 50Hz multi-drone physical telemetry under:
1. von Kármán turbulent wind shear (2 to 18 m/s gusts)
2. Ground effect aerodynamic cushion (z < 1.0m)
3. Swarm rotor downwash wake vortex (inter-drone z < 1.5m)
4. Sensor faults: GPS jamming, optical fog blackout, baro dynamic pressure spikes
"""

import os
import math
import numpy as np


def generate_von_karman_wind(num_steps: int, dt: float = 0.02, base_speed: float = 8.0, gust_intensity: float = 4.5) -> np.ndarray:
    """Generates continuous 3D turbulent wind velocity profiles using filtered noise (von Kármán spectrum)."""
    # 3D wind: [vx, vy, vz]
    wind = np.zeros((num_steps, 3), dtype=np.float32)
    # Low-pass filter coefficients for turbulent gust continuity
    alpha = math.exp(-dt / 0.8)  # Correlation time ~ 0.8s
    
    current_gust = np.zeros(3, dtype=np.float32)
    for i in range(num_steps):
        raw_noise = np.random.randn(3).astype(np.float32) * gust_intensity
        current_gust = alpha * current_gust + (1.0 - alpha) * raw_noise
        
        # Dominant horizontal wind vector with vertical updraft/downdraft
        wind[i, 0] = base_speed + current_gust[0]
        wind[i, 1] = base_speed * 0.5 + current_gust[1]
        wind[i, 2] = current_gust[2] * 0.4
    return wind


def generate_flight_dataset(
    num_samples: int = 15000,
    imu_window: int = 5,
    save_path: str = "data/neuro_flight_dataset.npz"
):
    """
    Synthesizes physics-grounded flight telemetry under extreme disaster conditions.
    """
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    np.random.seed(42)

    dt = 0.02  # 50 Hz control rate
    wind_profile = generate_von_karman_wind(num_samples, dt=dt)

    imu_seq_list = []
    direct_feats_list = []
    dist_gt_list = []
    alpha_gt_list = []

    # Drone state simulation variables
    pos = np.array([0.0, 0.0, 4.0], dtype=np.float32)
    vel = np.array([0.0, 0.0, 0.0], dtype=np.float32)
    quat = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    omega = np.array([0.0, 0.0, 0.0], dtype=np.float32)

    # Rolling IMU buffer (6 channels x imu_window)
    imu_buffer = np.zeros((6, imu_window), dtype=np.float32)

    # Peer drone states (2 closest peers)
    peer1_pos = np.array([4.0, 3.0, 4.2], dtype=np.float32)
    peer2_pos = np.array([-3.5, 5.0, 3.8], dtype=np.float32)

    print(f"🌪️ Generating {num_samples:,} physics-accurate telemetry timesteps (50Hz)...")

    for t in range(num_samples):
        # 1. Trajectory waypoint & kinematic errors
        target_pos = np.array([
            8.0 * math.cos(t * 0.02 * 0.5),
            8.0 * math.sin(t * 0.02 * 0.5),
            4.0 + 0.5 * math.sin(t * 0.02 * 0.2)
        ], dtype=np.float32)

        err_pos = target_pos - pos
        err_vel = np.clip(err_pos * 0.8, -3.0, 3.0) - vel
        err_quat = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)  # Nominal level
        err_omega = -omega

        # 2. Environmental physical disturbance modeling
        current_wind = wind_profile[t]
        drag_coeff = 0.28  # Drone aerodynamic drag
        f_drag = -drag_coeff * (vel - current_wind) * np.linalg.norm(vel - current_wind)
        f_drag = np.clip(f_drag, -3.5, 3.5)

        # Ground effect lift augmentation for z < 1.2m
        f_ground_effect = 0.0
        if pos[2] < 1.2:
            f_ground_effect = max(0.0, 2.5 * (1.2 - pos[2]))

        # Swarm rotor downwash wake when peer is directly above (dx, dy < 1.5m and dz in [0.5m, 2.5m])
        f_downwash = 0.0
        rel_peer1 = peer1_pos - pos
        if abs(rel_peer1[0]) < 1.5 and abs(rel_peer1[1]) < 1.5 and 0.5 < rel_peer1[2] < 2.5:
            f_downwash = -2.8 * (1.0 - math.hypot(rel_peer1[0], rel_peer1[1]) / 1.5)

        # Total unmodeled aerodynamic disturbance force in m/s^2
        dist_gt = np.array([
            f_drag[0],
            f_drag[1],
            f_drag[2] + f_ground_effect + f_downwash
        ], dtype=np.float32)

        # 3. Simulate sensor readings & technical faults
        # Fault scenario schedule:
        # t in [2000, 3500]: GPS Jamming / Dropout
        # t in [5000, 6500]: Optical Camera Blackout in Smoke
        # t in [8000, 9200]: Dynamic Baro Pressure Spike (Wind Gust)
        # t in [11000, 12500]: Laser Rangefinder Dust Degradation

        is_gps_jammed = (2000 <= t <= 3500) or (13000 <= t <= 14000)
        is_vio_blinded = (5000 <= t <= 6500)
        is_baro_noisy = (8000 <= t <= 9200)
        is_rng_noisy = (11000 <= t <= 12500)

        alpha_gps = 0.05 if is_gps_jammed else 0.98
        alpha_baro = 0.15 if is_baro_noisy else 0.95
        alpha_vio = 0.02 if is_vio_blinded else 0.96
        alpha_rng = 0.10 if is_rng_noisy else 0.99
        alpha_mag = 0.95

        alpha_gt = np.array([alpha_gps, alpha_baro, alpha_vio, alpha_rng, alpha_mag], dtype=np.float32)

        # Environmental sensory indicators
        baro_rate = float(vel[2] + (np.random.randn() * 1.5 if is_baro_noisy else np.random.randn() * 0.05))
        laser_agl = float(pos[2] + (np.random.randn() * 2.0 if is_rng_noisy else np.random.randn() * 0.02))
        opt_flow_u = float(vel[0] + (np.random.randn() * 2.5 if is_vio_blinded else np.random.randn() * 0.05))
        opt_flow_v = float(vel[1] + (np.random.randn() * 2.5 if is_vio_blinded else np.random.randn() * 0.05))
        wind_est_x = float(current_wind[0] * 0.9 + np.random.randn() * 0.2)
        wind_est_y = float(current_wind[1] * 0.9 + np.random.randn() * 0.2)

        env_feats = [baro_rate, laser_agl, opt_flow_u, opt_flow_v, wind_est_x, wind_est_y]

        # Swarm proximity features
        swarm_feats = [
            float(rel_peer1[0]), float(rel_peer1[1]), float(rel_peer1[2]), 0.0, 0.0, 0.0,
            float(peer2_pos[0] - pos[0]), float(peer2_pos[1] - pos[1]), float(peer2_pos[2] - pos[2]), 0.0, 0.0, 0.0
        ]

        # Health metrics
        health_feats = [
            0.1 if is_gps_jammed else 0.95,   # GPS HDOP
            0.05 if is_vio_blinded else 0.98, # VIO Quality
            0.20 if is_baro_noisy else 0.95,  # Baro Confidence
            0.95                              # Mag Confidence
        ]

        # Assemble direct features (34 dims)
        direct_feats = np.concatenate([
            err_pos, err_vel, err_quat, err_omega,  # Kinematic error (12)
            env_feats,                              # Environmental (6)
            swarm_feats,                            # Swarm (12)
            health_feats                            # Health (4)
        ]).astype(np.float32)

        # Update high-rate IMU buffer (Acc_xyz, Gyro_xyz = 6)
        raw_acc = dist_gt + np.random.randn(3).astype(np.float32) * 0.08
        raw_gyro = omega + np.random.randn(3).astype(np.float32) * 0.02
        imu_step = np.concatenate([raw_acc, raw_gyro])  # (6,)

        imu_buffer = np.roll(imu_buffer, -1, axis=1)
        imu_buffer[:, -1] = imu_step

        # Step physics forward
        pos += vel * dt
        vel += (err_vel * 0.5 + dist_gt) * dt
        omega = np.clip(err_omega * 0.8, -2.5, 2.5)

        # Peer drone movement
        peer1_pos[0] = 4.0 * math.cos(t * 0.02 * 0.3)
        peer1_pos[1] = 4.0 * math.sin(t * 0.02 * 0.3)

        # Store sample
        imu_seq_list.append(imu_buffer.copy())
        direct_feats_list.append(direct_feats.copy())
        dist_gt_list.append(dist_gt.copy())
        alpha_gt_list.append(alpha_gt.copy())

    # Save to compressed NPZ
    np.savez_compressed(
        save_path,
        imu_seq=np.array(imu_seq_list, dtype=np.float32),
        direct_feats=np.array(direct_feats_list, dtype=np.float32),
        dist_gt=np.array(dist_gt_list, dtype=np.float32),
        alpha_gt=np.array(alpha_gt_list, dtype=np.float32),
    )

    size_mb = os.path.getsize(save_path) / (1024 * 1024)
    print(f"✅ Physics dataset saved to {save_path} ({size_mb:.2f} MB)")
    print(f"   IMU sequence shape: {np.array(imu_seq_list).shape}")
    print(f"   Direct features shape: {np.array(direct_feats_list).shape}")
    print(f"   Disturbance GT shape: {np.array(dist_gt_list).shape}")
    print(f"   Sensor Reliability GT shape: {np.array(alpha_gt_list).shape}")


if __name__ == "__main__":
    generate_flight_dataset(num_samples=20000, save_path="data/neuro_flight_dataset.npz")
