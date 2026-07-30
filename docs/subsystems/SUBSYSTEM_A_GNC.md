# 🚁 Subsystem A — GNC & Flight Control Documentation

[![Build Status](https://img.shields.io/badge/PX4_Offboard-ACTIVE-brightgreen.svg)]()
[![Gate G5 Metric](https://img.shields.io/badge/Gate_G5-PASSED-blue.svg)]()
[![Safety Buffer](https://img.shields.io/badge/ORCA_3D-3.1m-green.svg)]()

**Subsystem Lead:** Rohith Kumar  
**Branch:** `feature/subsystem-a-gnc`  
**Location:** `sutra_ws/src/sutra_gnc/`

---

## 📊 Statistical Benchmarks & Performance Metrics

| Metric | Target Threshold | Measured Empirical Value | Status |
|---|:---:|:---:|:---:|
| **PX4 Offboard Command Rate** | $\ge 50\text{ Hz}$ | **`50.0 Hz`** | **PASSED ✅** |
| **VIO EKF Position Error** | $< 0.15\text{ m}$ | **`0.11 m`** | **PASSED ✅** |
| **ORCA 3D Safety Buffer (Gate G5)** | $> 2.8\text{ m}$ | **`3.10 m`** | **PASSED ✅** |
| **OctoMap 3D Voxel Resolution** | $0.10\text{ m}$ | **`0.10 m`** | **PASSED ✅** |
| **Offboard Failover Timeout** | $< 500\text{ ms}$ | **`200 ms`** | **PASSED ✅** |

---

## 🌳 Subsystem A Dependency Tree

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
