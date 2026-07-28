# 🏆 Project SUTRA — Master September 3rd Finals Strategy & Week 1 Execution Plan
**Swarm Unified Tactical Reconnaissance Architecture**  
*Team Offgrid Master Engineering & Collaboration Blueprint*

---

> [!IMPORTANT]
> **Finals Date:** September 3rd, 2026  
> **Team Offgrid:** Nikhil (Tech Architect / Comms), Rohith Kumar (GNC), Vedanth Sai Ram (Perception), Siva Kesava (GCS UI), Harika (Research & Docs Lead).  
> **Core Strategy:** Leverage **AI-Assisted Autonomous Engineering** during **Week 1 (Days 1–7)** to build, test, and lock in the 100% working baseline prototype. Use the remaining time for flight testing, refinement, and final pitch polish.

---

## 📑 Table of Contents
1. [Team Role Split & Subsystem Ownership](#1-team-role-split--subsystem-ownership)
2. [Git Workflow & Collaboration Protocol](#2-git-workflow--collaboration-protocol)
3. [Production Codebase Workspace Structure](#3-production-codebase-workspace-structure)
4. [Week 1 Day-by-Day Execution Roadmap (Days 1–7)](#4-week-1-day-by-day-execution-roadmap-days-17)
5. [Verification Gates Audit Matrix (G1–G6)](#5-verification-gates-audit-matrix-g1g6)
6. [Daily Standup & Collaboration Rituals](#6-daily-standup--collaboration-rituals)

---

## 1. Team Role Split & Subsystem Ownership

```
                                  +---------------------------------------+
                                  |        PROJECT SUTRA LEADERSHIP       |
                                  |  Nikhil — System Tech Architect Lead  |
                                  +-------------------+-------------------+
                                                      |
         +-------------------+--------------------+---+--------------------+-------------------+
         |                   |                    |                        |                   |
         v                   v                    v                        v                   v
+------------------+ +------------------+ +------------------+   +------------------+ +------------------+
|   SUBSYSTEM A    | |   SUBSYSTEM B    | |   SUBSYSTEM C    |   |   SUBSYSTEM D    | |   SUBSYSTEM E    |
| Navigation & GNC | | Swarm Comms Mesh | | AI Perception    |   | 3D GIS Dashboard | | Research & Audit |
|   Rohith Kumar   | |      Nikhil      | | Vedanth Sai Ram  |   |   Siva Kesava    | |      Harika      |
+------------------+ +------------------+ +------------------+   +------------------+ +------------------+
```

### Subsystem A: Autonomous Navigation, Flight Control & GNC
- **Owner:** Rohith Kumar
- **Deliverables:**
  - PX4 Autopilot Offboard trajectory controller (`px4_msgs/msg/TrajectorySetpoint`).
  - Visual-Inertial Odometry (VIO) & position-hold fallback.
  - Optimal Reciprocal Collision Avoidance (ORCA) for mid-air swarm collision prevention.
  - 3D OctoMap obstacle occupancy grid generation.

### Subsystem B: Swarm Communication Mesh & Neural Encoders
- **Owner:** Nikhil (System Architect)
- **Deliverables:**
  - Ad-Hoc 802.11s Wi-Fi mesh + 868MHz LoRa telemetry sockets.
  - RAFT consensus leader election protocol (instant failover if leader disconnects).
  - Deep JSCC (Joint Source-Channel Coding) neural image encoder for low SNR links.
  - Gazebo Sim 8 digital twin environment orchestration.

### Subsystem C: Tri-Modal AI Perception & Sensor Fusion
- **Owner:** Vedanth Sai Ram
- **Deliverables:**
  - YOLOv8-Nano TensorRT zero-copy inference pipeline (`30+ FPS`).
  - Tri-modal sensor fusion (RGB + Thermal IR + 77GHz mmWave Radar).
  - Target victim geolocation (raycasting bounding boxes onto WGS84 GPS elevation).

### Subsystem D: 3D GIS Ground Control Station & HSI Dashboard
- **Owner:** Siva Kesava
- **Deliverables:**
  - React.js + Mapbox GL JS interactive 3D satellite map.
  - WebGPU artificial horizon HUD, battery telemetry, and RF mesh links.
  - One-click Return-To-Launch (RTL) emergency override controls.
  - Offline SQLite telemetry trail caching buffer.

### Subsystem E: Research, Technical Documentation & Mission Audit
- **Owner:** Harika
- **Deliverables:**
  - **Master SUTRA Technical Encyclopedia** & architecture whitepapers.
  - **Verification Gate (G1–G6) Test Metric Logging** (tracking real-time factor, latencies, error margins).
  - **Presentation Decks, Demo Scripts & Video Deliverables** for finals evaluation.
  - **R&D Risk Matrix & Flight Safety Compliance Checklists**.

---

## 2. Git Workflow & Collaboration Protocol

To prevent merge conflicts and ensure clean collaboration across all 5 team members:

```
                                [ main ] (Production Stable Branch)
                                   ^
                                   | Merge only via PR with 1 Approval + Passing Test
                                [ dev ]  (Integration Branch)
                                   ^
       +-------------------+-------+-------+-------------------+
       |                   |               |                   |
[ feature/gnc ]    [ feature/comms ] [ feature/perception ] [ feature/gcs ]
  (Rohith)             (Nikhil)          (Vedanth)           (Siva)
```

### Git Branching Rules
1. **`main`**: Protected production branch. Contains only tested, locked, 100% working release code.
2. **`dev`**: Main integration branch. All subsystem feature branches merge into `dev`.
3. **Feature Branches**:
   - `feature/subsystem-a-gnc` (Rohith)
   - `feature/subsystem-b-comms` (Nikhil)
   - `feature/subsystem-c-perception` (Vedanth)
   - `feature/subsystem-d-gcs` (Siva)
   - `feature/subsystem-e-docs` (Harika)

### Conventional Commit Standard
All team members must write descriptive commit messages using conventional prefixes:
```bash
git commit -m "feat(gnc): implement PX4 Offboard trajectory setpoint publisher"
git commit -m "feat(comms): add RAFT leader election failover protocol"
git commit -m "feat(vision): integrate YOLOv8 TensorRT ROS2 wrapper"
git commit -m "feat(gcs): add Mapbox 3D real-time drone markers"
git commit -m "docs(audit): publish Verification Gate G2 test report"
```

---

## 3. Production Codebase Workspace Structure

Maintain this exact directory structure inside your team repository:

```
sutra_ws/                           # Primary ROS 2 & Project Workspace
├── src/
│   ├── sutra_gnc/                  # Subsystem A (Rohith)
│   │   ├── src/px4_offboard_node.cpp
│   │   ├── src/orca_avoidance.cpp
│   │   ├── CMakeLists.txt
│   │   └── package.xml
│   │
│   ├── sutra_comms/                # Subsystem B (Nikhil)
│   │   ├── sutra_comms/mesh_socket.py
│   │   ├── sutra_comms/deep_jscc_encoder.py
│   │   ├── sutra_comms/swarm_controller.py
│   │   └── setup.py
│   │
│   ├── sutra_perception/           # Subsystem C (Vedanth)
│   │   ├── sutra_perception/yolo_tensorrt_node.py
│   │   ├── sutra_perception/thermal_fusion.py
│   │   └── setup.py
│   │
│   ├── sutra_gcs/                  # Subsystem D (Siva Kesava)
│   │   ├── src/components/Mapbox3D.jsx
│   │   ├── src/components/ArtificialHorizon.jsx
│   │   └── package.json
│   │
│   └── sutra_sim/                  # Subsystem B & E (Sim / Harika)
│       ├── worlds/real_world_digital_twin_swarm.sdf
│       └── launch/sutra_swarm.launch.py
│
├── docs/                           # Subsystem E (Harika)
│   ├── SUTRA_Encyclopedia.md
│   ├── SUTRA_Verification_Gates_Log.md
│   └── presentations/
│
└── Desktop/SUTRA/                  # Local Executable Master Test Suites
    ├── SUTRA_48Hr_Hackathon_Master_Suite.py
    └── SUTRA_Master_Sprint_Plan_Sept3.md
```

---

## 4. Week 1 Day-by-Day Execution Roadmap (Days 1–7)

Goal: Build the **100% working baseline prototype** in 7 days using AI-assisted pair programming!

```
+-----------------------------------------------------------------------------------+
|                           WEEK 1 SPRINT TIMELINE                                  |
|                                                                                   |
|  DAY 1: Repo Setup & AI Calibration                                               |
|  DAY 2: Subsystem AI Node Generation (GNC, Comms, Vision, GCS)                     |
|  DAY 3: Gazebo Sim 8 Digital Twin & PX4 SITL Setup                                |
|  DAY 4: Pairwise Subsystem Integration                                             |
|  DAY 5: Full 5-Subsystem End-to-End Integration                                   |
|  DAY 6: Verification Gates (G1–G6) Stress Testing                                 |
|  DAY 7: Baseline Freeze, Demo Recording & Documentation Sync                      |
+-----------------------------------------------------------------------------------+
```

### 📅 Day 1: Repo Setup, Workspace & AI Calibration
- **Nikhil**: Initialize `sutra_ws` repository, configure Git branches (`dev`, feature branches), setup `ros_gz_bridge`.
- **Rohith**: Set up PX4 Autopilot SITL workspace (`make px4_sitl gz_x3`).
- **Vedanth**: Download YOLOv8-Nano weights and install TensorRT / ONNX runtime dependencies.
- **Siva Kesava**: Initialize React.js + Mapbox GL JS template app.
- **Harika**: Create `docs/SUTRA_Encyclopedia.md` and set up Verification Gate tracking templates.

### 📅 Day 2: Core Subsystem AI Node Generation
- **Rohith + AI**: Prompt Antigravity to generate C++ PX4 Offboard Trajectory Publisher node (`px4_offboard_node.cpp`).
- **Nikhil + AI**: Prompt Antigravity to generate Python `mesh_socket.py` (802.11s + LoRa) and `deep_jscc_encoder.py`.
- **Vedanth + AI**: Prompt Antigravity to generate ROS 2 YOLOv8 TensorRT detection wrapper (`yolo_tensorrt_node.py`).
- **Siva Kesava + AI**: Prompt Antigravity to generate Mapbox 3D satellite map & WebGL artificial horizon HUD.
- **Harika + AI**: Prompt Antigravity to generate subsystem architecture diagrams and technical specifications.

### 📅 Day 3: Gazebo Sim 8 Digital Twin & Hardware SITL
- **Nikhil + Rohith**: Test `real_world_digital_twin_swarm.sdf` with 4 UAVs (`uav_alpha`, `uav_beta`, `uav_gamma`, `uav_delta`).
- **Vedanth**: Attach virtual RGB & Thermal camera sensors to drone links in SDF.
- **Siva Kesava**: Connect `rosbridge_server` WebSocket to feed live `/odometry` topics into React GCS dashboard.
- **Harika**: Conduct **Verification Gate G1 Audit** (Physics 500Hz, Real-Time Factor $\ge 0.98$).

### 📅 Day 4: Pairwise Subsystem Integration
- **Integration A + B (Rohith & Nikhil)**: Test Boids swarm vectors + PX4 velocity commands over simulated RF loss.
- **Integration C + D (Vedanth & Siva Kesava)**: Test target victim detection -> GPS coordinate display on Mapbox 3D GCS.
- **Harika**: Conduct **Verification Gate G2 Audit** (Leader drone kill failover consensus $< 500\text{ms}$).

### 📅 Day 5: Full 5-Subsystem End-to-End Pipeline
- **All Team Members**: Execute `python3 /home/nikhil/Desktop/SUTRA/SUTRA_48Hr_Hackathon_Master_Suite.py`.
- Verify full loop: UAV Takeoff -> Boids Flight -> RF Mesh Packet Loss -> YOLO Target Detection -> WGS84 GPS Raycast -> GCS Mapbox HUD Update.
- **Harika**: Conduct **Verification Gate G3 & G4 Audits** (Target confidence $> 90\%$, PER under $60\%$ packet loss).

### 📅 Day 6: Verification Gates (G1–G6) Stress Testing
- Run stress tests with simulated winds ($3.5\text{m/s}$), obstacle skyscraper blockades, and GPS denial dropouts.
- **Harika**: Log all quantitative metrics into `docs/SUTRA_Verification_Gates_Log.md`.

### 📅 Day 7: Baseline Freeze, Demo Recording & Lock
- **Freeze Code**: Push final tested code to `main` branch.
- **Record Video**: Record 2-minute clean screen capture of live Gazebo Sim + React 3D Dashboard running (`Sutra_Rescue_Mission.mp4`).
- **Harika**: Package the complete Week 1 Deliverable Deck.

---

## 5. Verification Gates Audit Matrix (G1–G6)

| Gate ID | Milestone Objective | Quantified Target Metric | Harika's Audit Log File |
| :--- | :--- | :--- | :--- |
| **Gate G1** | Single UAV Autonomous Flight | Takeoff, 10m square circuit, auto-land. Max lateral error $< 1.0\text{m}$. | `docs/gate_g1_log.md` |
| **Gate G2** | Swarm Leader Failover | Leader killed; peers re-elect leader in $< 500\text{ms}$. | `docs/gate_g2_log.md` |
| **Gate G3** | AI Target Identification | Victim detected in rubble. Precision $> 85\%$, Geo-error $< 1.5\text{m}$. | `docs/gate_g3_log.md` |
| **Gate G4** | Degraded RF Mesh Comms | $60\%$ packet loss injected. Alert delivery ratio $> 90\%$. | `docs/gate_g4_log.md` |
| **Gate G5** | GPS Denial Fallback | Satellite blackout for $30\text{s}$. Position drift $< 0.5\text{m/s}$. | `docs/gate_g5_log.md` |
| **Gate G6** | End-to-End Mission Victory | Full 4-drone grid search, target alert, and formation RTL. | `docs/gate_g6_log.md` |

---

## 6. Daily Standup & Collaboration Rituals

1. **Daily 15-Minute Standup (9:00 AM)**:
   - What did you prompt/build yesterday?
   - What is your AI code generation target today?
   - Any ROS 2 topic or Gazebo SITL blockers?
2. **Evening Verification Sync (7:00 PM)**:
   - Run the master test suite script (`SUTRA_48Hr_Hackathon_Master_Suite.py`).
   - Merge approved PRs into `dev`.
   - Harika updates the daily progress log.
