# 🚀 Project SUTRA — Pre-Prototype Building Phase Master Roadmap

> **Phase Alignment:** Pre-Prototype Building Phase (Foundational Subsystem Architecture, SITL/HITL Validation & Pre-Hardware Integration)  
> **Monorepo Root:** `/home/nikhil/Desktop/Project SUTRA`  
> **Target Outcome:** Fully integrated, SITL-verified 5-Subsystem Pre-Prototype Architecture ready for Physical Hardware Deployment.

---

## 🌴 3-Tier Branching & Integration Strategy
All team members operate according to the project's 3-Tier Git Strategy:
1. **Feature Development (`feature/subsystem-*`):** Engineers work on dedicated subsystem branches.
2. **Buffer Integration Branch (`dev` / `buffer-integration`):** Merge code here FIRST for cross-subsystem integration testing and Gate G1–G6 metric audits.
3. **Production Branch (`main`):** Verified stable releases after passing all pre-prototype verification gates.

---

## 🚁 1. ROHITH KUMAR — Subsystem A (GNC & Flight Control Lead)

- **Role:** Lead Engineer, Subsystem A (Flight Control, PX4 Offboard Mode, VIO, ORCA Avoidance)
- **Working Folder:** [`sutra_ws/src/sutra_gnc/`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_gnc/)
- **Active Branch:** `feature/subsystem-a-gnc`
- **Verification Command:** `pytest sutra_ws/src/sutra_gnc/test/`

### Pre-Prototype Phase Roadmap:
* **Phase 1: PX4 MicroXRCE-DDS Offboard Controller (`sutra_gnc/offboard_node.py`)**
  - Implement ROS 2 PX4 offboard control interface publishing `OffboardControlMode` and `TrajectorySetpoint` @ 10Hz.
  - Build state machine for smooth transition: Manual -> Position -> Offboard setpoint control.
  - Validate 3D position lock and velocity tracking accuracy in Gazebo SITL environment.
* **Phase 2: 3D Voxel OctoMap Generation (`sutra_gnc/octomap_node.py`)**
  - Integrate OctoMap 3D voxel occupancy grid generator parsing stereo depth camera and LiDAR point clouds (`sensor_msgs/msg/PointCloud2`).
  - Implement real-time free/occupied space probability updates for dynamic obstacle mapping.
* **Phase 3: ORCA 3D Multi-Agent Swarm Collision Avoidance (`sutra_gnc/orca_avoidance.py`)**
  - Integrate RVO2 / ORCA 3D velocity obstacle algorithm for multi-agent trajectory negotiation.
  - Compute collision-free velocity vectors under dynamic physical constraints (max acceleration $2.5\text{ m/s}^2$, safety radius $1.5\text{m}$).
* **Phase 4: Hardware-In-The-Loop (HITL) & Gate G1/G3 Audit**
  - Conduct SITL/HITL flight simulation verifying offboard trajectory tracking and collision avoidance.
  - Merge into `dev` branch for **Gate G1** (Physics & Telemetry) and **Gate G3** (GNC Offboard) verification audits.

---

## 📡 2. NIKHIL — Subsystem B (Tech Architect, Comms & Sim Lead)

- **Role:** Tech Architect & Lead Engineer, Subsystem B (Swarm Mesh, Deep JSCC, Gazebo Sim Ops)
- **Working Folder:** [`sutra_ws/src/sutra_comms/`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_comms/) & [`sutra_ws/src/sutra_sim/`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_sim/)
- **Active Branch:** `feature/subsystem-b-comms`
- **Verification Command:** `pytest sutra_ws/src/sutra_comms/test/`

### Pre-Prototype Phase Roadmap:
* **Phase 1: High-Fidelity Gazebo Sim 8 Environment (`sutra_sim/worlds/`)**
  - Construct realistic SDF digital twin worlds (`real_world_digital_twin_swarm.sdf`) featuring complex terrain elevation, structures, and dynamic obstacles.
  - Optimize 500Hz physics solver execution maintaining Real-Time Factor (RTF) $\ge 0.98$.
* **Phase 2: 802.11s Wi-Fi Swarm Mesh Simulation (`sutra_comms/mesh_node.py`)**
  - Develop multi-agent mesh packet routing node with dynamic IP discovery and link quality calculation ($d^{-2.5}$ RF path loss model).
  - Implement mesh heartbeat broadcast and telemetry relay across multi-hop node topologies.
* **Phase 3: Deep JSCC Neural Image Compression (`sutra_comms/jscc_encoder.py`)**
  - Implement PyTorch Deep Joint Source-Channel Coding (JSCC) autoencoder model for low-latency image compression over noisy wireless channels.
  - Evaluate image reconstruction quality under low Signal-to-Noise Ratios (SNR 0–10 dB), achieving PSNR $\ge 34.0\text{ dB}$.
* **Phase 4: Swarm Network Stress Testing & Gate G2 Audit**
  - Test mesh throughput and neural compression latency under simulated interference and high packet loss.
  - Merge into `dev` branch for **Gate G2** (Swarm Mesh & Deep JSCC) verification audit.

---

## 👁️ 3. VEDANTH SAI RAM — Subsystem C (AI Perception & Geolocation Lead)

- **Role:** Lead Engineer, Subsystem C (Tri-Modal Perception, YOLOv8 TensorRT, Target Geolocation)
- **Working Folder:** [`sutra_ws/src/sutra_perception/`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_perception/)
- **Active Branch:** `feature/subsystem-c-perception`
- **Verification Command:** `pytest sutra_ws/src/sutra_perception/test/`

### Pre-Prototype Phase Roadmap:
* **Phase 1: YOLOv8-Nano TensorRT Edge Inference Engine (`sutra_perception/detector_node.py`)**
  - Train YOLOv8-Nano on aerial search-and-rescue datasets (RGB & FLIR thermal image pairs).
  - Export and optimize engine using NVIDIA TensorRT (FP16/INT8 precision) achieving $\ge 60$ FPS on edge platforms.
* **Phase 2: WGS84 GPS Target Raycaster (`sutra_perception/target_geolocation.py`)**
  - Implement raycasting algorithm converting 2D bounding box centroids into WGS84 GPS coordinates (Latitude, Longitude, Altitude).
  - Calculate ray intersection with terrain digital elevation models using drone attitude (roll, pitch, yaw) and camera intrinsic parameters.
* **Phase 3: Tri-Modal Spatial Cross-Attention Fusion (`sutra_perception/fusion_node.py`)**
  - Develop spatial cross-attention fusion layer combining RGB visual frames, FLIR thermal heatmaps, and mmWave radar point clouds.
  - Achieve target detection confidence threshold $\ge 90\%$ under foliage and degraded visibility conditions.
* **Phase 4: Target Geolocation Accuracy Verification & Gate G4 Audit**
  - Benchmark geolocation accuracy (target positioning error $< 1.5\text{m}$ at 30m flight altitude).
  - Merge into `dev` branch for **Gate G4** (AI Detection & Geolocation) verification audit.

---

## 🗺️ 4. SIVA KESAVA — Subsystem D (3D GIS Ground Control Station Lead)

- **Role:** Lead Engineer, Subsystem D (3D GIS Ground Control Station & HSI Telemetry HUD)
- **Working Folder:** [`sutra_ws/src/sutra_gcs/`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_gcs/)
- **Active Branch:** `feature/subsystem-d-gcs`
- **Verification Command:** `cd sutra_ws/src/sutra_gcs && npm run build`

### Pre-Prototype Phase Roadmap:
* **Phase 1: Mapbox GL JS 3D Satellite Map Engine (`sutra_gcs/src/App.tsx`)**
  - Build React GIS GCS dashboard integrating Mapbox GL JS 3D satellite imagery and digital terrain elevation.
  - Implement dynamic 3D drone GLTF markers, altitude vectors, and historical flight path trails.
* **Phase 2: High-Throughput ROS 2 Telemetry WebSocket Bridge**
  - Connect `rosbridge_server` WebSocket interface to stream real-time ROS 2 telemetry topics (`/uav_alpha/odometry`, `/uav_beta/odometry`, etc.).
  - Display live telemetry updates for multi-drone swarm positions, battery levels, and mesh network SNR.
* **Phase 3: WebGPU Telemetry HUD & Control Interface (`sutra_gcs/src/components/`)**
  - Build WebGPU-accelerated pitch/roll artificial horizon dials, link quality widgets, and mission waypoints planner at 60 FPS.
  - Implement 1-Click Emergency Return-To-Launch (RTL) trigger button with failsafe confirmation modal.
* **Phase 4: Build Optimization & Gate G5 Audit**
  - Verify clean production build (`npm run build`) and cross-browser rendering performance.
  - Merge into `dev` branch for **Gate G5** (3D GIS GCS Telemetry Bridge) verification audit.

---

## 📑 5. HARIKA — Subsystem E (Verification Audits, System Docs & PMO Lead)

- **Role:** Lead Engineer / PMO, Subsystem E (Documentation, Gate Audits G1-G6, Flight Logs)
- **Working Folder:** [`docs/`](file:///home/nikhil/Desktop/Project%20SUTRA/docs/) & [`scripts/`](file:///home/nikhil/Desktop/Project%20SUTRA/scripts/)
- **Active Branch:** `feature/subsystem-e-docs`
- **Verification Command:** `python3 scripts/SUTRA_48Hr_Hackathon_Master_Suite.py`

### Pre-Prototype Phase Roadmap:
* **Phase 1: System Specifications & Interface Control Documents (ICDs)**
  - Maintain whitepapers, system specifications, and role execution roadmaps in [`docs/guides/`](file:///home/nikhil/Desktop/Project%20SUTRA/docs/guides/) and [`docs/plans/`](file:///home/nikhil/Desktop/Project%20SUTRA/docs/plans/).
  - Define clear ROS 2 message schemas, topic naming conventions, and parameter bounds across all 5 subsystems.
* **Phase 2: Automated Verification Gate Audit Engine (`scripts/`)**
  - Maintain and execute [`scripts/SUTRA_48Hr_Hackathon_Master_Suite.py`](file:///home/nikhil/Desktop/Project%20SUTRA/scripts/SUTRA_48Hr_Hackathon_Master_Suite.py) for continuous automated auditing of Verification Gates G1 through G6.
  - Record detailed flight logs, metric pass/fail logs, and system audit certificates.
* **Phase 3: Flight Log Telemetry Analyzer & Visual Assets**
  - Build post-flight telemetry analyzer parsing ROS 2 bag files and PX4 `.ulg` flight logs.
  - Maintain high-impact visual graphics and architectural schematics in [`docs/assets/`](file:///home/nikhil/Desktop/Project%20SUTRA/docs/assets/).
* **Phase 4: Pre-Prototype Release Certification & Gate G6 Audit**
  - Audit 100% pass rate across all verification gates (G1–G6) on `dev`.
  - Authorize and execute final release merge from `dev` to `main` for physical hardware prototyping deployment.
