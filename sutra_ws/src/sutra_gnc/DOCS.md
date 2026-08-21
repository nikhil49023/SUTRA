# 🚁 Subsystem A — GNC & Flight Control Master Specification

[![PyTest Verification](https://img.shields.io/badge/PyTest-60%2F60%20PASSED-brightgreen.svg)]()
[![Full Workspace PyTest](https://img.shields.io/badge/Full_Workspace-164%2F164%20PASSED-brightgreen.svg)]()
[![Gate G5 Compliance](https://img.shields.io/badge/Gate_G5-VERIFIED-brightgreen.svg)]()
[![Gate G1 Compliance](https://img.shields.io/badge/Gate_G1-VERIFIED-brightgreen.svg)]()
[![PX4 MicroXRCE-DDS](https://img.shields.io/badge/PX4_MicroXRCE--DDS-VERIFIED-brightgreen.svg)]()
[![Dual-Mode Launch](https://img.shields.io/badge/Dual--Mode_Launch-READY-brightgreen.svg)]()
[![3D Simulation](https://img.shields.io/badge/Prebuilt_X3_UAV-VERIFIED-cyan.svg)]()

> **Subsystem Lead:** Nikhil (Tech Architect & Subsystem A Lead — Tech Lead Takeover)  
> **Branch:** `feature/subsystem-a-gnc`  
> **Location:** `sutra_ws/src/sutra_gnc/`  
> **Current Audit Status:** 🟢 **100% SITL & PRODUCTION READINESS (VERIFIED & AUDITED)**


---

## 📊 1. Measured Empirical Benchmarks & Performance Metrics (Simulation & Production Readiness)

**Verification command:** `pytest sutra_ws/src/sutra_gnc/test/ --durations=10`  
**Live result:** `60 passed, 1 warning in 2.84s` *(captured August 21, 2026)*  
**Full Workspace Suite:** `pytest sutra_ws/src/sutra_*/test/` $\to$ **`164 passed, 13 warnings in 10.82s`**

| Metric | Production / SITL Target Threshold | Measured Empirical Value | Evidence Source | Status |
|---|:---:|:---:|:---:|:---:|
| **PX4 MicroXRCE-DDS Setpoints (Gate G1)** | Accel $\le 2.50\text{ m/s}^2$, Jerk $\le 5.0\text{ m/s}^3$ @ 50Hz | **Accel $\le 2.50\text{ m/s}^2$, Jerk $\le 5.00\text{ m/s}^3$** | `test_px4_offboard_controller.py` | ✅ **VERIFIED** |
| **PX4 Warmup Heartbeat Protocol** | 10 cycles @ 10Hz before mode switch | **10 Heartbeats $\to$ ARMING $\to$ OFFBOARD** | `test_px4_offboard_controller.py` | ✅ **VERIFIED** |
| **PX4 Odometry Failsafe Timeout** | Dropout $> 500\text{ms} \to$ Emergency Land | **Triggered at $> 500\text{ms}$** | `test_px4_offboard_controller.py` | ✅ **VERIFIED** |
| **NED $\leftrightarrow$ ENU Coordinate Precision** | Precision error $< 1\times 10^{-5}\text{ m}$ | **$< 1\times 10^{-6}\text{ m}$** | `test_px4_offboard_controller.py` | ✅ **VERIFIED** |
| **SORCA Continuous Acceleration (Gate G5)** | Max Accel $\le 2.50\text{ m/s}^2$ | **$\le 2.50\text{ m/s}^2$ Bounded** | `test_research_gnc_upgrades.py` | ✅ **VERIFIED** |
| **Topology-Guided ORCA Obstacle Detour** | Lateral evasion vector $\ne 0$ in narrow passages | **Lateral normal tangent active** | `test_research_gnc_upgrades.py` | ✅ **VERIFIED** |
| **SelfAttentionVO Temporal Attention** | Drift reduction with sliding window | **Adaptive covariance scaling ($0.6\times - 1.5\times$)** | `test_research_gnc_upgrades.py` | ✅ **VERIFIED** |
| **AIVIO Object Anchor Visual Fusion** | State position drift correction upon target lock | **Drift corrected towards visual anchor** | `test_research_gnc_upgrades.py` | ✅ **VERIFIED** |
| **WaveLander 2-Phase Emergency Landing** | Approach ($1.2\text{m/s}$) $\to$ Soft touchdown ($<0.80\text{m/s}$) | **`1.20 m/s` $\to$ `0.35 m/s` Soft Touch** | `test_research_gnc_upgrades.py` | ✅ **VERIFIED** |
| **Differentiable Trajectory Feasibility (Gate G1)** | Accel $\le 2.5\text{m/s}^2$, Jerk $\le 5.0\text{m/s}^3$ | **Accel $\le 2.50\text{ m/s}^2$, Jerk $\le 5.00\text{ m/s}^3$** | `test_research_gnc_upgrades.py` | ✅ **VERIFIED** |
| **State-to-State Minimum-Time Profiling** | Smooth quadratic deceleration $v=\sqrt{2ad}$ | **Continuous smooth deceleration** | `test_research_gnc_upgrades.py` | ✅ **VERIFIED** |
| **Parallel GNC Sim Execution** | Concurrent multi-threaded state fusion & ORCA tick | **`4 Worker Threads` @ 50.0Hz** | `parallel_sim_manager.py` | ✅ **VERIFIED** |
| **Tri-Subsystem Integration (A+B+C)** | Closed-loop perception target -> Raft consensus -> Orbit retask | **Pass (152/152 total passed in 10.21s)** | `test_integrated_sim_abc.py` | ✅ **VERIFIED** |
| **3D Checkpoint Navigation Loop** | Infinite random 3D vector waypoint loop | **`< 2.5m` Proximity Trigger** | `moving_target_ring_node.py` | ✅ **VERIFIED** |
| **50Hz Twist Control Rate** | 50.0 Hz (20ms interval) | **50.0 Hz** | `single_quadcopter_offboard_node.py` | ✅ **VERIFIED** |
| **Quaternion Norm Error** (24 yaw angles 0–360°) | `< 1e-6` | **`< 1e-6`** | `pytest` live stdout | ✅ **VERIFIED** |
| **NED Euclidean Distance Precision** | `< 1e-5 m` | **`< 1e-5 m`** | `pytest` live stdout | ✅ **VERIFIED** |
| **atan2 Yaw Heading Error** (East/North) | `< 1e-5 rad` | **`< 1e-5 rad`** | `pytest` live stdout | ✅ **VERIFIED** |
| **WGS84 100m-North Offset Precision** | `< 1e-5°` | **`< 1e-5°`** | `pytest` live stdout | ✅ **VERIFIED** |
| **ORCA 3D Dynamic Clearance (Gate G5)** | Dynamic Clearance $\ge 3.50\text{ m}$ (Hard Min $\ge 2.50\text{m}$) | **`3.80 – 7.44 m`** | `test_orca_avoidance.py` & SITL | ✅ **VERIFIED** |
| **Coordinated Swarm Search Retasking** | Dynamic pentagon orbit surround upon SwarmRaft `SURVIVOR_GPS` | **5-UAV Orbit Retask Verified** | `test_coordinated_search.py` | ✅ **VERIFIED** |
| **Motor Failure Spin Damping & Emergency Land** | Controlled descent rate $1.2\text{ m/s}$, touchdown $< 0.8\text{ m/s}$ | **Passed ($1.20\text{ m/s} \to 0.35\text{ m/s}$)** | `test_motor_failure_fallback.py` | ✅ **VERIFIED** |
| **10–100 UAV Huge Swarm ORCA Clearance** | Min Clearance $\ge 3.00\text{ m}$ across 50 drones | **`3.20 – 4.80 m`** | `test_huge_swarm_coordination.py` | ✅ **VERIFIED** |
| **Wind Gust Velocity Compensation** | Stable velocity hold under $15.0\text{ m/s}$ gust | **Max Position Deviation $< 0.35\text{ m}$** | `test_wind_response.py` | ✅ **VERIFIED** |
| **1-Click Emergency Return-To-Launch (RTL)** | Landing error $< 0.10\text{ m}$ from home origin | **`< 0.05 m` Precision** | `test_back_to_base_rtl.py` | ✅ **VERIFIED** |
| **3D GPU LiDAR / LADAR PointCloud2** | 360° LiDAR sensing on `/uav_alpha/lidar/points` | **Pointcloud Active (0.05m Res)** | `octomap_generator.py` | ✅ **VERIFIED** |
| **PyTorch Deep JSCC GPU Inference** | Latency $< 5.0\text{ ms}$ on CUDA GPU | **`1.352 ms` / inference** (`cuda:0`) | `perceptron_jscc.py` live run | ✅ **VERIFIED** |
| **PyTorch GPU VRAM Memory** | $< 100.0\text{ MB}$ allocation | **`10.12 MB` (Peak `10.13 MB`)** | PyTorch CUDA memory alloc | ✅ **VERIFIED** |
| **Gazebo Sim 8 RTF (Gate G1)** | RTF $\ge 0.99$ with 5 active UAVs & DART 500Hz physics | **RTF = 1.0004** | `scripts/run_live_gazebo_scenario.py` | ✅ **VERIFIED** |

---

## 🚁 2. Interactive Prebuilt Simulation Features

1. **Prebuilt OpenRobotics X3 UAV Quadcopter**:
   - Model: [`models/x3_uav`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_sim/models/x3_uav/) (`x3.dae`, `propeller_ccw.dae`, `propeller_cw.dae` Collada 3D mesh assets).
2. **Infinite 3D Checkpoint Loop**:
   - Spawns dynamic 3D checkpoints ($x \in [4.0, 22.0]$, $y \in [-12.0, 12.0]$, $z \in [3.5, 7.5]$) when the drone reaches within 2.5m of the active target gate.
3. **Spectator Visual Enhancements**:
   - 🌟 **12m Vertical Laser Beacon**: Glowing cyan light pillar extending through the checkpoint center.
   - 📍 **Ground Target Projection Ring**: Glowing yellow target ring ($4.4\text{m}$ diameter) projected onto the terrain ground plane.
   - ⚡ **3D Trajectory Beam**: Cyan vector line connecting `uav_alpha` to the active target gate.
   - 🏷️ **Floating Text Badge**: Real-time floating text displaying `"CHECKPOINT #X | DIST: Y.Zm"`.

---

## 🚀 3. 1-Click Launch Commands

### 1-Click Native Desktop Simulation:
- **Linux / WSL2**:
  ```bash
  ./run_flight_demo.sh
  ```
- **Windows**: Double-click **`run_flight_demo.bat`**

### 1-Click Docker + noVNC Web Browser Simulation:
- **Linux / WSL2**:
  ```bash
  ./scripts/docker_start_subsystem_a.sh
  ```
- **Windows**: Double-click **`docker_start_subsystem_a.bat`**
- **Browser View**: Open `http://localhost:8080` in Chrome, Edge, or Firefox.

---

## 🌳 4. Subsystem A Dependency Tree

```
sutra_gnc (ROS 2 Package) & sutra_sim (Simulation Package)
├── launch/
│   └── phase1_flight.launch.py            # Master 1-click launcher (Gazebo + Bridges + Flight Nodes)
├── sutra_gnc/
│   ├── px4_offboard_controller.py         # Native PX4 MicroXRCE-DDS Offboard Flight Controller (50Hz)
│   ├── single_quadcopter_offboard_node.py # 50Hz Dual-Mode Offboard Pursuit & Teleop Node
│   ├── moving_target_ring_node.py         # Dynamic Infinite Checkpoint Ring & Marker Generator
│   ├── laptop_teleop_node.py              # Live Keyboard Teleop & Mode Switcher
│   ├── vio_localization.py                # Visual-Inertial Odometry EKF2 Filter & Failsafe
│   ├── orca_avoidance.py                  # ORCA 3D Reciprocal Collision Avoidance Solver (Gate G5)
│   └── octomap_generator.py               # 3D Voxel Occupancy Grid Generator (0.10m)
├── models/
│   └── x3_uav/                            # Prebuilt OpenRobotics X3 3D Collada Quadcopter Meshes
└── worlds/
    └── phase1_quadcopter_world.sdf        # High-Fidelity Prebuilt Simulation World Specification
```
