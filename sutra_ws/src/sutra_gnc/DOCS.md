# 🚁 Subsystem A — GNC & Flight Control Master Specification

[![Subsystem Status](https://img.shields.io/badge/Subsystem_Status-IN_PROGRESS-orange.svg)]()
[![PyTest Verification](https://img.shields.io/badge/PyTest-8%2F8%20PASSED-brightgreen.svg)]()
[![Gate G5 Math Check](https://img.shields.io/badge/Gate_G5-MATH_VERIFIED-blue.svg)]()
[![SITL Flight Test](https://img.shields.io/badge/SITL_Flight_Test-PENDING-red.svg)]()

> **Subsystem Lead:** Rohith Kumar  
> **Branch:** `feature/subsystem-a-gnc`  
> **Location:** `sutra_ws/src/sutra_gnc/`  
> **Current Audit Status:** ⚠️ **INCOMPLETE** — Static math tests passed. SITL 50Hz flight verification, VIO EKF module, and OctoMap generator remain incomplete.

---

## 📊 1. Measured Empirical Benchmarks & Performance Metrics (Simulation & Production Readiness)

**Verification command:** `pytest sutra_ws/src/sutra_gnc/test/ --durations=0`  
**Live result:** `8 passed in 0.24s` *(captured August 03, 2026)*

| Metric | Production / SITL Target Threshold | Measured Empirical Value | Evidence Source | Status |
|---|:---:|:---:|:---:|:---:|
| **Quaternion Norm Error** (24 yaw angles 0–360°) | `< 1e-6` | **`< 1e-6`** | `pytest` live stdout | ✅ **VERIFIED** |
| **NED Euclidean Distance Precision** | `< 1e-5 m` | **`< 1e-5 m`** | `pytest` live stdout | ✅ **VERIFIED** |
| **atan2 Yaw Heading Error** (East/North) | `< 1e-5 rad` | **`< 1e-5 rad`** | `pytest` live stdout | ✅ **VERIFIED** |
| **WGS84 100m-North Offset Precision** | `< 1e-5°` | **`< 1e-5°`** | `pytest` live stdout | ✅ **VERIFIED** |
| **WP State Machine 1.5m Threshold** | Correct FSM | **Correct** | `pytest` live stdout | ✅ **VERIFIED** |
| **ORCA 3D Dynamic Clearance (Gate G5)** | Dynamic Clearance $> 2.80\text{ m}$ (Hard Min $\ge 2.0\text{m}$) under $2.5\text{ m/s}^2$ limits | **`3.00 – 4.00 m`** | `test_orca_avoidance.py` | ✅ **VERIFIED** |
| **PX4 Offboard Setpoint Tracking RMSE (Gate G1)** | $< 0.15\text{ m}$ (Horiz) / $< 0.10\text{ m}$ (Vert) @ $\ge 50\text{ Hz}$ | ❓ UNTESTED — requires active PX4 SITL node | `ros2 topic hz` / SITL trace | ❌ BLOCKED |
| **Offboard Command Loop Rate & Timeout** | Strictly $\ge 50\text{ Hz}$ loop ($20\text{ ms}$ max jitter, $< 500\text{ ms}$ failsafe) | ❓ UNTESTED — requires active PX4 SITL node | SITL execution trace | ❌ BLOCKED |
| **VIO EKF Position Drift (GPS-Denied)** | $< 0.5\%$ of distance traveled under sensor dropouts | ❓ UNTESTED — `vio_localization.py` unverified | SITL / hardware VIO required | ❌ BLOCKED |
| **Emergency RTL / Failsafe Latency** | Transition $< 100\text{ ms}$ upon link loss, tilt overshoot $< 5^\circ$ | ❓ UNTESTED — failsafe test required | SITL failsafe test | ❌ BLOCKED |
| **OctoMap 3D Voxel Resolution** | $0.10\text{ m}$ occupancy grid voxel size | ❓ UNTESTED — `octomap_generator.py` unverified | Depth sensor + ROS required | ❌ BLOCKED |

---

## 🎓 2. Student Budget & Dual-Mode Hardware Target

* **Student Hardware Target (Option A - $269 / ₹22,450)**: Pixhawk 2.4.8 / Pixhawk 6C flight controller + Raspberry Pi 4/5 companion computer running MicroXRCE-DDS agent.
* **Micro Swarm Hardware Target (Option B - $145 / ₹12,000)**: ESP32-S3 Micro Quadrotor Flight Controller using ESP-NOW mesh telemetry.
* **Dual Launch Switch**: `ros2 launch sutra_sim sutra_master_swarm_integration.launch.py sim_mode:=true / false`

---

## 🏛️ 3. Subsystem A Architectural Audit & Upgrade Plan

> **Audit Date:** August 03, 2026  
> **Lead Architect Review:** Python GIL latencies during 50Hz setpoint dispatch, missing C++ RVO2 3D solver, missing hardware VIO bridge.

### 💡 Production Upgrade Roadmap:
1. **Port `offboard_node.py` to C++ (`rclcpp`)**: Eliminate Python GC pauses for high-frequency flight control loops.
2. **Implement C++ RVO2 3D Library Integration**: Unblock **Gate G5 (ORCA Safety Buffer > 2.8m)** under multi-drone densities.
3. **Connect Hardware VIO Bridge**: Bind Intel RealSense / ArduCam stereo visual-inertial odometry to PX4 `VehicleVisualOdometry`.

---

## 🌳 4. Subsystem A Dependency Tree

```
sutra_gnc (ROS 2 Package)
├── src/
│   ├── offboard_node.py       # PX4 Offboard Mode & Waypoint Dispatcher (50Hz)
│   ├── vio_localization.py    # Visual-Inertial Odometry EKF2 Filter
│   ├── orca_avoidance.py      # ORCA 3D Reciprocal Collision Avoidance Solver
│   └── octomap_generator.py   # 3D Voxel Occupancy Grid Generator (0.1m)
└── dependencies:
    ├── MicroXRCE-DDS Agent & PX4 Autopilot v1.14
    ├── ROS 2 Jazzy (nav_msgs, geometry_msgs, sensor_msgs)
    └── OctoMap C++ / Python Bindings
```

---

## 🛠️ 5. Step-by-Step Task & Execution Guide for Rohith

Follow these exact steps to complete Subsystem A GNC verification:

### Step 1: Branch Sync & Environment Setup
```bash
git checkout feature/subsystem-a-gnc
git fetch origin dev && git merge origin/dev --no-edit
```

### Step 2: Run Automated Unit & Integration Tests
```bash
pytest sutra_ws/src/sutra_gnc/test/ --durations=0
```

### Step 3: Run SITL Simulation Flight Verification (Gate G1)
1. **Launch Gazebo Sim 8 Digital Twin Swarm World:**
   ```bash
   ros2 launch sutra_sim sutra_master_swarm_integration.launch.py sim_mode:=true
   ```
2. **Execute PX4 Offboard Dispatcher:**
   ```bash
   ros2 run sutra_gnc offboard_node
   ```
3. **Verify 50Hz Setpoint Rate:**
   ```bash
   ros2 topic hz /fmu/in/trajectory_setpoint
   ```

### Step 4: Update Measured Benchmarks
After completing the SITL verification run, update Section 1 of this document (`sutra_ws/src/sutra_gnc/DOCS.md`) with your actual captured terminal results. Do NOT use synthetic or projected numbers.

---

## 📋 6. Mandatory Subsystem A Sign-off & Completion Checklist

Subsystem A CANNOT be declared "Complete" or merged to `main` until all 5 criteria are verified:

- [ ] **1. Code Commit Verification**: Rohith must author and commit `sutra_gnc/vio_localization.py` and `sutra_gnc/octomap_generator.py` to `feature/subsystem-a-gnc`.
- [ ] **2. Gate G1 SITL Flight Verification**: `offboard_node.py` must be run against live PX4 SITL Gazebo simulation with setpoint rate $\ge 50\text{Hz}$ (`ros2 topic hz /fmu/in/trajectory_setpoint`) and position tracking RMSE $< 0.15\text{m}$.
- [ ] **3. Gate G5 Multi-Drone Avoidance**: ORCA 3D avoidance must demonstrate dynamic clearance $\ge 2.8\text{m}$ across 5 active drones in Gazebo SITL.
- [ ] **4. Failsafe Latency Test**: Emergency RTL transition on telemetry drop must be verified $< 100\text{ms}$.
- [ ] **5. Statistical DOCS.md Sync**: Update Section 1 of this document with verbatim captured stdout output from live verification commands.


