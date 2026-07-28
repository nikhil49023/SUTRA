# 🚀 Project SUTRA — Team Master Technical Roadmap

> **Architectural Alignment & Role Execution Roadmap**
> **Monorepo Root:** `/home/nikhil/Desktop/Project SUTRA`
> **Target Release:** 48-Hour Hackathon Final Production Milestone (`main` branch)

---

## 🌴 Git & Buffer Integration Workflow Protocol
All team members operate according to the 3-Tier Branching Strategy:
1. Work in isolation on assigned feature branch (`feature/subsystem-*`).
2. Run local subsystem verification commands (`pytest` / `npm run build`).
3. Commit and push feature branch: `git push origin feature/subsystem-<letter>-<name>`.
4. Merge into `dev` (Buffer Integration Branch) for cross-subsystem trial runs and Gate G1–G6 verification (`python3 scripts/SUTRA_48Hr_Hackathon_Master_Suite.py`).
5. Upon 100% Gate pass, `dev` is merged into `main` for release.

---

## 🚁 1. ROHITH KUMAR — Subsystem A (GNC & Autonomous Flight)

- **Role:** Lead Engineer, Subsystem A (Flight Control, PX4 Offboard Mode, VIO, ORCA Avoidance)
- **Working Folder:** [`sutra_ws/src/sutra_gnc/`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_gnc/)
- **Active Branch:** `feature/subsystem-a-gnc`
- **Verification Command:** `pytest sutra_ws/src/sutra_gnc/test/`

### Detailed Phase-by-Phase Execution Roadmap:
* **Phase 1 (Hours 00:00 – 12:00): PX4 Offboard ROS 2 Bridge Initialization**
  - Implement `offboard_node.py` publishing `OffboardControlMode` and `TrajectorySetpoint` messages over MicroXRCE-DDS.
  - Stream 10Hz heartbeat setpoints to enable smooth mode transition from `Position` to `Offboard`.
  - Validate altitude hold and position lock in Gazebo SITL simulation.
* **Phase 2 (Hours 12:00 – 24:00): 3D Voxel OctoMap Integration**
  - Create `octomap_node.py` parsing depth camera sensor feeds (`sensor_msgs/msg/PointCloud2`).
  - Generate live 3D occupancy voxel grids for dynamic obstacle mapping.
* **Phase 3 (Hours 24:00 – 36:00): ORCA 3D Swarm Collision Avoidance**
  - Integrate RVO2 / ORCA 3D velocity obstacle algorithm in `orca_avoidance.py`.
  - Compute reciprocal velocity obstacles between UAV Alpha, UAV Beta, and dynamic environment obstacles.
* **Phase 4 (Hours 36:00 – 48:00): Gate Audits & Integration**
  - Pass all unit tests (`pytest sutra_ws/src/sutra_gnc/test/`).
  - Merge into `dev` branch for Gate G1 (Physics/Telemetry) and Gate G3 (GNC Offboard) verification.

---

## 📡 2. NIKHIL — Subsystem B (Comms, Deep JSCC & Gazebo Sim Ops)

- **Role:** Tech Architect & Lead Engineer, Subsystem B (Swarm Mesh, Deep JSCC, Gazebo Sim Ops)
- **Working Folder:** [`sutra_ws/src/sutra_comms/`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_comms/) & [`sutra_ws/src/sutra_sim/`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_sim/)
- **Active Branch:** `feature/subsystem-b-comms`
- **Verification Command:** `pytest sutra_ws/src/sutra_comms/test/`

### Detailed Phase-by-Phase Execution Roadmap:
* **Phase 1 (Hours 00:00 – 12:00): 802.11s Wi-Fi Mesh Routing Engine**
  - Develop `mesh_node.py` simulating multi-hop packet routing and SNR link signal attenuation ($d^{-2.5}$ path loss model).
  - Broadcast periodic mesh heartbeat ping frames between swarm nodes.
* **Phase 2 (Hours 12:00 – 24:00): Deep JSCC Neural Image Compression**
  - Implement PyTorch Deep Joint Source-Channel Coding (JSCC) autoencoder model in `jscc_encoder.py`.
  - Train/run neural compression under low Signal-to-Noise Ratio (SNR 0–10 dB), achieving PSNR $\ge 34.0\text{ dB}$.
* **Phase 3 (Hours 24:00 – 36:00): Gazebo Sim 8 Digital Twin Optimization**
  - Refine SDF environment world file (`real_world_digital_twin_swarm.sdf`).
  - Maintain physics solver rate at 500Hz with Real-Time Factor (RTF) $\ge 0.98$.
* **Phase 4 (Hours 36:00 – 48:00): Integration & Buffer Merge**
  - Execute `pytest sutra_ws/src/sutra_comms/test/`.
  - Merge into `dev` branch for Gate G2 (Swarm Mesh & Neural Link) verification.

---

## 👁️ 3. VEDANTH SAI RAM — Subsystem C (AI Perception & Geolocation)

- **Role:** Lead Engineer, Subsystem C (Tri-Modal Perception, YOLOv8 TensorRT, Target Geolocation)
- **Working Folder:** [`sutra_ws/src/sutra_perception/`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_perception/)
- **Active Branch:** `feature/subsystem-c-perception`
- **Verification Command:** `pytest sutra_ws/src/sutra_perception/test/`

### Detailed Phase-by-Phase Execution Roadmap:
* **Phase 1 (Hours 00:00 – 12:00): YOLOv8-Nano TensorRT Inference Engine**
  - Construct `detector_node.py` utilizing TensorRT FP16 engine bindings for realtime edge detection ($\ge 60$ FPS).
  - Detect victim targets in complex urban rubble and forest canopy environments.
* **Phase 2 (Hours 12:00 – 24:00): WGS84 GPS Target Raycasting**
  - Implement raycasting algorithm in `target_geolocation.py`.
  - Transform 2D bounding box centroids into WGS84 GPS coordinates (Latitude, Longitude, Altitude) using camera calibration intrinsics, drone pose, and elevation map ray intersection.
* **Phase 3 (Hours 24:00 – 36:00): Tri-Modal Sensor Fusion Engine**
  - Develop spatial cross-attention fusion layer combining RGB visual frames, FLIR thermal heatmaps, and mmWave radar point clouds.
  - Elevate detection confidence threshold to $\ge 90\%$.
* **Phase 4 (Hours 36:00 – 48:00): Verification Audit & Merge**
  - Execute unit tests (`pytest sutra_ws/src/sutra_perception/test/`).
  - Merge into `dev` branch for Gate G4 (Target Geolocation & AI Detection) verification.

---

## 🗺️ 4. SIVA KESAVA — Subsystem D (3D GIS Ground Control Station)

- **Role:** Lead Engineer, Subsystem D (3D GIS Ground Control Station & HSI Telemetry HUD)
- **Working Folder:** [`sutra_ws/src/sutra_gcs/`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_gcs/)
- **Active Branch:** `feature/subsystem-d-gcs`
- **Verification Command:** `cd sutra_ws/src/sutra_gcs && npm run build`

### Detailed Phase-by-Phase Execution Roadmap:
* **Phase 1 (Hours 00:00 – 12:00): Mapbox GL JS 3D Satellite Globe**
  - Build React dashboard frontend ([`src/App.tsx`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_gcs/src/App.tsx)) integrating Mapbox GL JS 3D satellite view.
  - Render 3D terrain elevation and animated custom 3D drone GLTF markers.
* **Phase 2 (Hours 12:00 – 24:00): ROS 2 Telemetry WebSocket Bridge**
  - Establish `rosbridge_server` WebSocket connection to stream live telemetry topics (`/uav_alpha/odometry`, `/uav_beta/odometry`).
  - Render dynamic flight trajectories, altitude graphs, and heading vectors.
* **Phase 3 (Hours 24:00 – 36:00): WebGPU Telemetry HUD Widgets**
  - Construct WebGPU accelerated artificial horizon pitch/roll dial, battery level gauges, and mesh SNR link indicators at 60 FPS.
  - Add 1-Click Emergency Return-To-Launch (RTL) trigger button with failsafe confirmation modal.
* **Phase 4 (Hours 36:00 – 48:00): Build & Integration Audit**
  - Verify clean TypeScript build (`npm run build`).
  - Merge into `dev` branch for Gate G5 (3D GIS GCS Telemetry Bridge) verification.

---

## 📑 5. HARIKA — Subsystem E (Docs, Verification Audits & Flight Logs)

- **Role:** Lead Engineer / PMO, Subsystem E (Documentation, Gate Audits G1-G6, Flight Logs)
- **Working Folder:** [`docs/`](file:///home/nikhil/Desktop/Project%20SUTRA/docs/) & [`scripts/`](file:///home/nikhil/Desktop/Project%20SUTRA/scripts/)
- **Active Branch:** `feature/subsystem-e-docs`
- **Verification Command:** `python3 scripts/SUTRA_48Hr_Hackathon_Master_Suite.py`

### Detailed Phase-by-Phase Execution Roadmap:
* **Phase 1 (Hours 00:00 – 12:00): System Specification & Plan Maintenance**
  - Maintain whitepapers, action plans, and role-specific guides in [`docs/guides/`](file:///home/nikhil/Desktop/Project%20SUTRA/docs/guides/) and [`docs/plans/`](file:///home/nikhil/Desktop/Project%20SUTRA/docs/plans/).
  - Document all API message schemas, node parameters, and network topologies.
* **Phase 2 (Hours 12:00 – 24:00): Continuous Verification Audit Engine**
  - Maintain and execute [`scripts/SUTRA_48Hr_Hackathon_Master_Suite.py`](file:///home/nikhil/Desktop/Project%20SUTRA/scripts/SUTRA_48Hr_Hackathon_Master_Suite.py) auditing Verification Gates G1 through G6.
  - Record detailed flight log traces and metric pass/fail matrices.
* **Phase 3 (Hours 24:00 – 36:00): Infographics & Hackathon Pitch Presentation Deck**
  - Produce high-impact system visuals ([`docs/assets/`](file:///home/nikhil/Desktop/Project%20SUTRA/docs/assets/)).
  - Craft the 3-minute executive presentation script ([`docs/plans/SUTRA_Presentation_Script.md`](file:///home/nikhil/Desktop/Project%20SUTRA/docs/plans/SUTRA_Presentation_Script.md)).
* **Phase 4 (Hours 36:00 – 48:00): Final Master Release Audit**
  - Ensure 100% clean verification gate audit across all 5 subsystems on `dev`.
  - Authorize and execute merge from `dev` into `main` for final hackathon release.
