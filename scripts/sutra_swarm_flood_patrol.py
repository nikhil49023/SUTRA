#!/usr/bin/env python3
"""
SUTRA 8-UAV Swarm Autonomous Flight Controller
High-Efficiency Command Loop (Zero CPU Overhead)
Commands 8 simulated UAVs in Gazebo Sim across the horizontally aligned Submerged Village.
"""

import math
import time
import subprocess
import os

print("=" * 65)
print("   🚁 SUTRA 8-HEXACOPTER SWARM AUTONOMOUS FLIGHT CONTROLLER (HEXA-X)")
print("   Disaster Zone: Submerged Village Flood Arena (Fault-Tolerant SAR)")
print("=================================================================")

uav_list = [f"uav_{i}" for i in range(1, 9)]

def get_swarm_velocities(t):
    vels = {}
    
    # UAV 1: Lead Alpha — Figure-8 Command Orbit
    vels["uav_1"] = (
        1.5 * math.cos(0.3 * t),
        1.5 * math.sin(0.6 * t),
        0.1 * math.sin(0.2 * t),
        0.30
    )
    
    # UAV 2: West Recon — Lawnmower Sweep
    vels["uav_2"] = (
        2.0 * math.sin(0.4 * t),
        0.5 * math.cos(0.2 * t),
        0.05 * math.sin(0.3 * t),
        0.25
    )
    
    # UAV 3: East Recon — Circular Perimeter Recon
    vels["uav_3"] = (
        -1.5 * math.sin(0.35 * t),
        1.5 * math.cos(0.35 * t),
        0.05 * math.cos(0.2 * t),
        0.35
    )
    
    # UAV 4: River Corridor Low-Altitude Sweep
    vels["uav_4"] = (
        1.0 * math.cos(0.45 * t),
        1.8 * math.sin(0.45 * t),
        0.1 * math.cos(0.5 * t),
        0.45
    )
    
    # UAV 5: Mansion Rooftop Survivor Recon Orbit
    vels["uav_5"] = (
        0.9 * math.cos(0.5 * t),
        0.9 * math.sin(0.5 * t),
        0.02 * math.sin(t),
        0.50
    )
    
    # UAV 6: North Ridge Survivor Recon Orbit
    vels["uav_6"] = (
        -1.0 * math.sin(0.4 * t),
        1.0 * math.cos(0.4 * t),
        0.02 * math.cos(t),
        0.40
    )
    
    # UAV 7: West Terrace Houses Scan
    vels["uav_7"] = (
        1.2 * math.sin(0.35 * t),
        1.2 * math.cos(0.35 * t),
        0.05 * math.sin(0.4 * t),
        0.35
    )
    
    # UAV 8: High-Altitude Mesh Comms Relay Loiter
    vels["uav_8"] = (
        0.6 * math.cos(0.2 * t),
        0.6 * math.sin(0.2 * t),
        0.02 * math.sin(0.1 * t),
        0.20
    )
    
    return vels

def main():
    os.environ["GZ_PARTITION"] = "sutra_sim"
    t_start = time.time()
    last_print = 0

    print("Initiating 8-UAV Swarm Autonomous Search & Patrol...")
    print("Zero-lag 2 Hz command loop active.")
    print("-" * 65)

    try:
        while True:
            t = time.time() - t_start
            velocities = get_swarm_velocities(t)
            
            # Send batch twist commands
            for uav_id, (vx, vy, vz, yr) in velocities.items():
                topic = f"/{uav_id}/gazebo/command/twist"
                subprocess.run([
                    "gz", "topic",
                    "-t", topic,
                    "-m", "gz.msgs.Twist",
                    "-p", f"linear: {{x: {vx:.2f}, y: {vy:.2f}, z: {vz:.2f}}}, angular: {{z: {yr:.2f}}}"
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            if t - last_print >= 5.0:
                print(f"[T+{t:05.1f}s] Swarm Mission Active: 8 UAVs scanning flood basin.")
                last_print = t
            
            time.sleep(0.5)  # 2 Hz update rate (CPU safe)
            
    except KeyboardInterrupt:
        print("\nStopping swarm...")

if __name__ == "__main__":
    main()
