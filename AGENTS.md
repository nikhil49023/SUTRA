# 🤖 AGENTS.md — Autonomous Agent Workspace Protocol for Project SUTRA

> **Notice to AI Coding Assistants (Antigravity CLI, Cursor, Copilot, Windsurf):**
> Read this file immediately upon opening the workspace to autonomously align with the user's identity, role, and subsystem scope.

---

## 🎯 What We Are Building
**Project SUTRA** (Swarm Unified Tactical Reconnaissance Architecture) is an autonomous multi-drone swarm system featuring:
1. **Subsystem A (GNC)**: Autonomous PX4 offboard navigation, Visual-Inertial Odometry, 3D Voxel OctoMap, and ORCA collision avoidance.
2. **Subsystem B (Comms & Sim)**: 802.11s Wi-Fi mesh, Deep JSCC neural image compression under low SNR, and Gazebo Sim 8 SITL environment.
3. **Subsystem C (Perception)**: YOLOv8 TensorRT edge inference, Tri-Modal sensor fusion (Visual, Thermal, mmWave Radar), and WGS84 GPS raycast target geolocation.
4. **Subsystem D (GCS)**: 3D GIS ground control station (React + Mapbox GL JS 3D Satellite view + WebGPU telemetry HUD).
5. **Subsystem E (Docs & Verification)**: System specifications, flight logs, verification gate metric audits G1–G6, and hackathon presentation decks.

---

## 🌴 3-Tier Branching & Buffer Integration Strategy

```
  [ Individual Role Branches ]         [ Buffer Integration Branch ]         [ Main Production Branch ]
  feature/subsystem-a-gnc (Rohith) ──┐
  feature/subsystem-b-comms (Nikhil) ┼──► buffer-integration / dev ────────► main (Final Releases)
  feature/subsystem-c-perception ────┤   (Full 5-Subsystem Integration
  feature/subsystem-d-gcs (Siva) ────┤    Suite & Gate G1-G6 Audits)
  feature/subsystem-e-docs (Harika) ─┘
```

1. **Individual Role Branches**: Engineers work in isolation on their assigned subsystem branch.
2. **Buffer Integration Branch (`dev` / `buffer-integration`)**: All features merge here FIRST for cross-subsystem testing and end-to-end rehearsal execution.
3. **Main Branch (`main`)**: Clean, final production releases. No direct commits allowed; only merges from `buffer-integration` after passing all verification gates G1–G6.

---

## 👤 Instant Name-Based Teammate Activation

When a teammate introduces themselves by name in the prompt (e.g. *"I am Rohith"*, *"Nikhil here"*, *"Vedanth"*, *"Siva Kesava"*, *"Harika"*), the AI Agent MUST automatically switch to their exact role guidelines:

---

### 1. 🚁 If Teammate is ROHITH KUMAR (Subsystem A Lead — GNC & Navigation)
- **Role**: Lead Engineer, Subsystem A (Flight Control, PX4 Offboard Mode, VIO, ORCA Avoidance).
- **Working Folder**: `sutra_ws/src/sutra_gnc/`
- **Active Branch**: `feature/subsystem-a-gnc`
- **Current Tasks**:
  1. Develop PX4 Offboard control mode scripts (`sutra_gnc/offboard_node.py`).
  2. Implement ORCA 3D collision avoidance algorithm for multi-agent drone trajectories.
  3. Integrate OctoMap 3D occupancy voxel grid generation.
- **Verification Command**: `pytest sutra_ws/src/sutra_gnc/test/`
- **Target Buffer Merge**: Merge into `dev` (buffer branch) after unit tests pass.

---

### 2. 📡 If Teammate is NIKHIL (Tech Architect & Subsystem B Lead — Comms & Sim)
- **Role**: Tech Architect & Lead Engineer, Subsystem B (Swarm Mesh, Deep JSCC, Gazebo Sim Ops).
- **Working Folder**: `sutra_ws/src/sutra_comms/` & `sutra_ws/src/sutra_sim/`
- **Active Branch**: `feature/subsystem-b-comms`
- **Current Tasks**:
  1. Optimize 802.11s Wi-Fi mesh packet routing node (`sutra_comms/mesh_node.py`).
  2. Train/run Deep JSCC neural encoder model for low SNR image transmission.
  3. Maintain Gazebo Sim 8 SDF worlds (`sutra_sim/worlds/real_world_digital_twin_swarm.sdf`).
- **Verification Command**: `pytest sutra_ws/src/sutra_comms/test/`
- **Target Buffer Merge**: Merge into `dev` (buffer branch) after verifying physics RTF >= 0.98.

---

### 3. 👁️ If Teammate is VEDANTH SAI RAM (Subsystem C Lead — AI Perception)
- **Role**: Lead Engineer, Subsystem C (Tri-Modal Perception, YOLOv8 TensorRT, Target Geolocation).
- **Working Folder**: `sutra_ws/src/sutra_perception/`
- **Active Branch**: `feature/subsystem-c-perception`
- **Current Tasks**:
  1. Build YOLOv8-Nano TensorRT edge inference node (`sutra_perception/detector_node.py`).
  2. Implement WGS84 GPS raycasting from 2D visual/thermal bounding box centroids.
  3. Fuse visual, thermal, and mmWave radar signatures via spatial cross-attention.
- **Verification Command**: `pytest sutra_ws/src/sutra_perception/test/`
- **Target Buffer Merge**: Merge into `dev` (buffer branch) after detection confidence >= 90%.

---

### 4. 🗺️ If Teammate is SIVA KESAVA (Subsystem D Lead — 3D GIS Dashboard)
- **Role**: Lead Engineer, Subsystem D (3D GIS Ground Control Station & HSI Telemetry HUD).
- **Working Folder**: `sutra_ws/src/sutra_gcs/`
- **Active Branch**: `feature/subsystem-d-gcs`
- **Current Tasks**:
  1. Build Mapbox GL JS 3D satellite view and real-time drone telemetry markers (`src/App.tsx`).
  2. Develop WebGPU telemetry HUD widgets for battery, altitude, and link health.
  3. Implement 1-click Emergency Return-to-Launch (RTL) trigger button.
- **Verification Command**: `cd sutra_ws/src/sutra_gcs && npm run build`
- **Target Buffer Merge**: Merge into `dev` (buffer branch) after dashboard renders clean at 60 FPS.

---

### 5. 📑 If Teammate is HARIKA (Subsystem E Lead — Docs & Verification Audits)
- **Role**: Lead Engineer / PMO, Subsystem E (Documentation, Gate Audits G1-G6, Flight Logs).
- **Working Folder**: `docs/` & `scripts/`
- **Active Branch**: `feature/subsystem-e-docs`
- **Current Tasks**:
  1. Audit Verification Gates G1–G6 using `scripts/SUTRA_48Hr_Hackathon_Master_Suite.py`.
  2. Maintain system specs, whitepapers, and role execution roadmaps in `docs/`.
  3. Craft presentation scripts, infographics, and flight logs for hackathon evaluation.
- **Verification Command**: `python3 scripts/SUTRA_48Hr_Hackathon_Master_Suite.py`
- **Target Buffer Merge**: Merge into `dev` (buffer branch) after all metric audits pass cleanly.

---

## 🤖 Autonomous Navigation Protocol for Teammates' CLI Agents

When a teammate opens this codebase, their AI agent MUST automatically follow these guidelines:

### Step 1: Detect Teammate Role & Switch Branch
- If branch is not checkout to their role branch, suggest or switch:
  - Rohith: `git checkout feature/subsystem-a-gnc`
  - Nikhil: `git checkout feature/subsystem-b-comms`
  - Vedanth: `git checkout feature/subsystem-c-perception`
  - Siva Kesava: `git checkout feature/subsystem-d-gcs`
  - Harika: `git checkout feature/subsystem-e-docs`

### Step 2: Enforce Subsystem Isolation
- **DO NOT** edit code in other teammates' subsystem folders without explicit request.
- Keep modifications strictly inside the assigned subsystem folder (`sutra_ws/src/sutra_<subsystem>/`).

### Step 3: Buffer Branch Merge Workflow
1. Test subsystem package locally.
2. Commit feature code on individual branch: `git commit -m "feat(<subsystem>): ..."`
3. Push individual branch: `git push origin feature/subsystem-<letter>-<name>`
4. Merge into **buffer integration branch** (`dev`) for cross-subsystem trial runs.
5. Run Master Rehearsal integration test: `python3 scripts/SUTRA_48Hr_Hackathon_Master_Suite.py`
6. Once integration passes cleanly on `dev`, merge `dev` into `main` for final testing.
