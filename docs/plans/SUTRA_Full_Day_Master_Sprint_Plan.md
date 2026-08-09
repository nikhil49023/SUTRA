# ⚡ Project SUTRA — Full-Day High-Intensity Master Sprint Plan
> **Date:** August 06, 2026  
> **Directive from Tech Architect (Nikhil):** Full working day dedicated to Project SUTRA. Since every teammate is equipped with autonomous AI coding assistants, there will be **zero slack, zero idle time, and maximum high-velocity output**. Every subsystem must complete its full production upgrade roadmap today.

---

## 🕒 Master Sprint Schedule & Phases

```
  08:30 – 11:30 ──► SPRINT BLOCK 1: High-Frequency C++ Refactoring & Model Optimizations
  11:30 – 14:00 ──► SPRINT BLOCK 2: Live 5-Drone Gazebo SITL Swarm & Tri-Modal Perception Pipeline
  14:30 – 17:30 ──► SPRINT BLOCK 3: Kernel Drivers, Physical Hardware Bench & WebGPU Telemetry
  17:30 – 19:30 ──► SPRINT BLOCK 4: Gate G1–G6 Brutal Stress Audit, Monorepo Merge & Demo Lock
```

---

## 👤 Subsystem-by-Subsystem Maximum Workload Assignment

### 1. 🚁 ROHITH KUMAR — Subsystem A (GNC & Flight Control Lead)
> **Goal:** Take Subsystem A from 35% SITL readiness to 100% Production Flight Control.

#### 🎯 Maximum Deliverables for Today:
1. **C++ Offboard Node Porting (`src/offboard_node.cpp`)**:
   - Compile and verify zero-latency `offboard_node.cpp` with `rclcpp` to eliminate Python GIL pauses during 50Hz setpoint dispatch (`/fmu/in/trajectory_setpoint`).
2. **Visual-Inertial Odometry (VIO) EKF Integration (`vio_localization.py`)**:
   - Wire stereo visual-inertial odometry topics to PX4 `VehicleVisualOdometry` interface.
   - Run simulated GPS loss test and verify position drift $< 0.5\%$ of distance traveled.
3. **3D Voxel OctoMap Generator (`octomap_generator.py`)**:
   - Parse Gazebo depth camera point clouds (`/camera/points`), run zero-copy binary C-struct unpack, and publish 0.10m occupancy grid voxel maps (`MarkerArray` & JSON).
4. **ORCA 3D Collision Avoidance Solver (`orca_avoidance.py`)**:
   - Execute 5-drone crossing trajectories in Gazebo Sim 8 digital twin and prove dynamic clearance $\ge 2.8\text{m}$ (Gate G5).
5. **Emergency RTL Failsafe Latency**:
   - Verify offboard state machine failover transition $< 100\text{ms}$ under telemetry signal dropouts.
6. **Live SITL Verification & DOCS Sync**:
   - Run `ros2 launch sutra_sim sutra_master_swarm_integration.launch.py sim_mode:=true`.
   - Update `sutra_ws/src/sutra_gnc/DOCS.md` with captured live terminal stdout evidence.

---

### 2. 👁️ VEDANTH SAI RAM — Subsystem C (AI Edge Perception Lead)
> **Goal:** Implement full Tri-Modal Spatial Fusion, SAHI Slicing, and TensorRT FP16 Edge Inference.

#### 🎯 Maximum Deliverables for Today:
1. **YOLOv8-Nano TensorRT FP16 Export**:
   - Convert master 7.2k VisDrone + HIT-UAV thermal trained model to TensorRT engine (`.engine`) achieving $\le 8\text{ms}$ latency ($\ge 60$ FPS) on Jetson Orin Nano.
2. **SAHI Slicing & ByteTRACK MOT Integration (`detector_node.py`)**:
   - Implement SAHI (Slicing Aided Hyper Inference) for small-target survivor detection from high-altitude aerial imagery ($1920\times1080 \rightarrow 640\times640$ patches).
   - Integrate ByteTRACK multi-object tracking to persist survivor IDs across frame occlusions.
3. **WGS84 GPS Target Raycaster (`target_geolocation.py`)**:
   - Run terrain DEM raycasting from 2D bounding box centroids, compensating for drone roll/pitch ($\pm 10^\circ$), and prove target positioning error $< 0.8\text{m}$ at 30m AGL (Gate G4).
4. **Tri-Modal Spatial Cross-Attention Fusion (`fusion_node.py`)**:
   - Fuse RGB optical, FLIR LWIR thermal, and mmWave radar point clouds to maintain target detection confidence $\ge 94.5\%$ under dense forest canopy.
5. **Live Camera Stream Verification**:
   - Subscribe to live Gazebo camera topics (`/uav_alpha/camera/rgb` & `/uav_alpha/camera/thermal`) and update `sutra_ws/src/sutra_perception/DOCS.md`.

---

### 3. 🗺️ SIVA KESAVA — Subsystem D (3D GIS GCS Dashboard Lead)
> **Goal:** Deliver 60 FPS WebGPU Telemetry HUD, ATAK CoT Serializer, and 1-Click RTL Command Engine.

#### 🎯 Maximum Deliverables for Today:
1. **Mapbox GL JS 3D Satellite & Altitude Vector Engine (`src/App.tsx`)**:
   - Render 3D terrain elevation, dynamic 5-drone GLTF markers, altitude trajectory ribbons, and historical search coverage polylines.
2. **WebGPU Locked 60.0 FPS Telemetry RingBuffer**:
   - Implement high-throughput `TelemetryRingBuffer` throttler to smooth 50Hz ROS 2 telemetry topics without UI lag or frame drops.
3. **WebSocket Gateway Bridge Integration (`gcs_gateway_bridge.py`)**:
   - Connect GCS dashboard to ROS 2 topic bus (port `9090`), rendering real-time battery, RSSI, survivor alert popups, and drone statuses.
4. **1-Click Emergency RTL & State Interlocks (`MissionControlConsole.tsx`)**:
   - Implement 10-state safety interlock state machine and 1-click Emergency Return-to-Launch (RTL) trigger button over WebSocket.
5. **ATAK / WinTAK Cursor-on-Target (CoT) Serializer**:
   - Stream XML CoT target events (`takv`, `cot_event`) for tactical integration with military TAK devices.
6. **Production Build & Performance Benchmarking**:
   - Run `cd sutra_ws/src/sutra_gcs && npm run build` and update `sutra_ws/src/sutra_gcs/DOCS.md`.

---

### 4. 📡 NIKHIL — Tech Architect & Subsystem B Lead (Comms & Sim) ⚡
> **Goal:** Master Monorepo Architecture, 802.11s Wi-Fi Mesh, SwarmRAFT Consensus, and Deep JSCC Transceiver.

#### 🎯 Maximum Deliverables for Today:
1. **Master 5-Subsystem Dual-Mode Launcher (`sutra_master_swarm_integration.launch.py`)**:
   - Orchestrate single-command launch file starting Gazebo Sim 8 digital twin, ROS bridge, GNC offboard nodes, perception engine, and GCS bridge.
2. **802.11s Wi-Fi Swarm Mesh & Kernel Drivers (`mesh_node.py`)**:
   - Configure Linux kernel `mac80211_hwsim` mesh simulation and UART 921600 baud hardware radio serial bridge.
   - Benchmark log-normal RF path loss ($d^{-2.7}$) under simulated foliage attenuation.
3. **SwarmRAFT Distributed Consensus Engine**:
   - Benchmark leader election failover ($< 150\text{ms}$) under 20% node churn and simulate Drone 1 (Alpha Lead) crash handover to Drone 2 (Beta Relay).
4. **Deep JSCC Neural Video Transceiver (`jscc.py`)**:
   - Run PyTorch / TensorRT neural encoder-decoder compression on live aerial video feeds (96.9% payload reduction, zero digital cliff resilience).
5. **Cross-Subsystem Code Review & Gate Audits**:
   - Oversee integration across all 5 branches, resolving ABI conflicts and enforcing Rule 0/Rule 5 repository hygiene.

---

### 5. 📑 HARIKA — Subsystem E (Docs, Verification & Audit Lead)
> **Goal:** Automated Gate Audits (G1–G6), Flight Traceback Logs, and System Whitepaper.

#### 🎯 Maximum Deliverables for Today:
1. **Automated Integration Audit Suite (`pytest sutra_ws/src/sutra_*/test/`)**:
   - Run full monorepo test suites continuously across all 5 subsystems and log pass rates.
2. **Live SITL Flight Log Traceback Archiving**:
   - Capture terminal stdout, ROS 2 bag files, and Gazebo world stats from the 5-drone swarm flight run, saving tracebacks in `docs/audits/`.
3. **Subsystem `DOCS.md` Verification Audit**:
   - Audit every subsystem's `DOCS.md` file to ensure all statistical benchmark tables contain 100% verbatim measured values (zero hardcoded numbers!).
4. **Master Project SUTRA System Whitepaper & SOPs**:
   - Finalize the complete System Architecture Whitepaper, Student Budget Hardware BOM, SOPs, and Presentation Slides for project sign-off.

---

## 🏁 End-of-Day Target (19:30 IST)
* **All 64+ Unit & Integration Tests PASSING**
* **Gazebo Sim 8 SITL Swarm Flight Executed & Verified (Gate G1)**
* **WebGPU 3D GIS GCS Dashboard Rendering Live Swarm Streams @ 60 FPS (Gate G6)**
* **All 5 Subsystems Merged to `dev` and Verified for Production `main` Release**
