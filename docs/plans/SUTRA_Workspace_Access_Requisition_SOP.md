# 🏛️ TEAM OFFGRID: Software Collaboration Workspace Requisition & Technical SOP

> **Requisition Reference:** `OFFGRID-REQ-WS-2026-V3`  
> **Date:** August 21, 2026  
> **To:** The Head of Department (HOD) & Infrastructure / Lab Administration  
> **From:** **Team OFFGRID** (Finalist Team, Smart Horizon 48-Hour International Hackathon 2026)  
> **Project:** **Project SUTRA** *(Swarm Unified Tactical Reconnaissance Architecture)*  
> **Requested Duration:** **21st August 2026 → 1st September 2026 (11.5 Effective Working Days)**  
> **Event Dates:** September 3rd, 4th & 5th, 2026 (Offline Grand Finale at NHCE, Bengaluru)  
> **Subject:** **Requisition for Dedicated Software Collaboration Workspace for Multi-Subsystem Swarm Integration**

---

## 1. Executive Summary & Team Standing

**Team OFFGRID** has officially qualified as a Finalist representing the institution at the **Smart Horizon 48-Hour International Hackathon 2026** (AICTE/VTU backed, ₹23,75,000 prize pool). 

Our submission, **Project SUTRA**, is an autonomous multi-drone reconnaissance swarm designed for search and rescue operations in GPS-denied environments. To successfully integrate, simulate, and stress-test the 6 deep-tech software subsystems before travelling on September 2nd, the team requires dedicated physical workspace allocation from **21st August to 1st September 2026 (11.5 working days)**.

---

## 2. Project SUTRA: Deep-Tech Architectural Strengths

1. **Subsystem A (Autonomous GNC & Flight Control)**: PX4 offboard 50Hz trajectory control, Visual-Inertial Odometry (VIO) for GPS-denied localization, and ORCA 3D reciprocal collision avoidance maintaining ≥3.5m clearance.
2. **Subsystem B (Swarm Mesh & Distributed Consensus)**: 802.11s Wi-Fi mesh routing, SwarmRAFT distributed consensus (<100ms leader failover), and Deep JSCC neural image compression with PSNR ≥38.0 dB under severe jamming.
3. **Subsystem C (AI Edge Perception Engine)**: YOLOv8-Nano TensorRT edge detector (<5ms latency), Tri-Modal fusion (Visual, Thermal FLIR, mmWave Radar), and DEM raycast WGS84 target geolocator (<0.4m error).
4. **Subsystem D (WebGPU 3D GIS GCS Dashboard)**: React 18 + Mapbox GL JS 3D satellite viewer, WebGPU real-time telemetry HUD (locked 60 FPS under 5 UAV streams), and 1-Click Emergency Return-to-Launch (RTL).
5. **Subsystem E (Verification Suites & Gate Audits)**: Automated unit and integration test suites enforcing measured industry standards (Gate Audits G1–G6).
6. **Subsystem F (NDMA Tactical Operations)**: Standard operating profiles for Kedarnath flood and Wayanad landslide search corridors.

---

## 3. System Complications: Why Team Collocation is Mandatory

Integrating 6 distributed, multi-threaded robotics subsystems across separate developer machines creates acute technical dependencies that cannot be resolved asynchronously over remote chat:

| Subsystem Coupling | Underlying Technical Complication | Why In-Person Collocation is Mandatory |
|---|---|---|
| **GNC ↔ Perception Loop** *(Subsystems A & C)* | High-rate ROS 2 DDS camera feeds and 6-DoF pose matrices must sync at 50Hz for real-time DEM target raycasting. | Simultaneous multi-monitor debugging of sensor pipelines and coordinate frame transforms side-by-side. |
| **Swarm Mesh ↔ WebGPU GCS** *(Subsystems B & D)* | WebSocket telemetry serialization under 5 live UAV streams requires tight synchronization to maintain 60.0 FPS HUD rendering. | Instant packet schema calibration and zero-latency WebSocket socket verification between frontend and backend leads. |
| **11.5-Day Sprint Compression** *(All 6 Subsystems)* | Asynchronous chat delays (2–3 hours per integration roadblock) create fatal schedule drift before the September 2nd travel deadline. | Instant 5-minute problem resolution, daily synchronized merge war-rooms, and unified end-to-end verification. |

---

## 4. 11.5-Day Sprint Accountability Roadmap (Aug 21 – Sept 1)

### 🗓️ Phase 1: Module Hardening (Aug 21 PM – Aug 24) [4.0 Days]
- Resolve PyTorch / TensorRT runtime import conflicts.
- **Sat, Aug 22**: Attend official NHCE Pre-Event Online Briefing.
- Validate PX4 50Hz offboard setpoints and SwarmRAFT leader consensus unit tests.
- Initialize WebGPU 3D GCS frontend WebSocket client.

### 🗓️ Phase 2: 5-UAV SITL Swarm Loop Closure (Aug 25 – Aug 28) [4.0 Days]
- Connect GNC flight setpoints ↔ Camera frame feed ↔ Perception detection ↔ Mesh broadcast.
- Stream real-time 3D drone positions and survivor alert logs to WebGPU GCS.
- Run 5-drone Gazebo Sim 8 digital twin with ORCA 3D collision avoidance.
- Record high-definition backup simulation demonstration video reels.

### 🗓️ Phase 3: Gate Audits & Hard Code Freeze (Aug 29 – Sept 1) [3.5 Days]
- Execute live Gate Audits G1–G6 verification against real `pytest` outputs.
- Update `DOCS.md` strictly with measured benchmark numbers.
- Conduct 2 timed Mock Presentations and Jury Defense Grill rehearsals.
- **Sept 1, 18:00 IST**: Hard Code Freeze, tag `v1.0.0`, and create 3 redundant offline USB backup drives.

---

## 5. Team OFFGRID Leadership & Subsystem Ownership

| Team Member | Subsystem Role | Software Milestone (by Sept 1 Freeze) | Test Verification |
|---|---|---|---|
| **Nikhil (Tech Lead)** | **A (GNC) & B (Comms)** | PX4 50Hz setpoints, ORCA 3D collision avoidance, SwarmRAFT consensus, Gazebo Sim 8 digital twin. | `pytest sutra_gnc/`<br>`pytest sutra_comms/` |
| **Vedanth** | **C (Perception)** | YOLOv8-Nano TensorRT edge detector (<5ms), Tri-Modal fusion, DEM terrain raycast WGS84 geolocator. | `pytest sutra_perception/` |
| **Siva** | **D (3D GIS GCS)** | WebGPU 60 FPS HUD, 3D Mapbox satellite drone tracking, WebSocket telemetry listener, Emergency 1-Click RTL. | `npm run build` (in `sutra_gcs/`) |
| **Harika** | **E (Docs & Audits)** | Automated test suites, G1–G6 benchmark audit sync in `DOCS.md`, Master Pitch Deck visual formatting, PDF packages. | `pytest` full run & doc audit |
| **Rohith** | **F (Tactical Ops)** | NDMA search patterns (Kedarnath flood / Wayanad landslide), Pre-flight SOP, operational rescue storytelling narrative. | CONOPS audit in `docs/conops/` |

---

## 6. Workspace Allocation Requisition

As registered finalists of **Team OFFGRID** representing the institution at the **Smart Horizon 48-Hour International Hackathon 2026 Grand Finale**, we formally requisition immediate administrative allocation of a dedicated software collaboration workspace for the duration of **21st August 2026 to 1st September 2026**. This space is required for intensive multi-subsystem swarm integration, real-time ROS 2 simulation verification, and end-to-end mission rehearsal prior to team departure.
