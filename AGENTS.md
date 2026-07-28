# 🤖 AGENTS.md — Autonomous Agent Workspace Protocol for Project SUTRA

> **Notice to AI Coding Assistants (Antigravity CLI, Cursor, Copilot, Windsurf):**
> Read this file immediately upon opening the workspace to autonomously align with the user's role and subsystem scope.

---

## 🎯 What We Are Building
**Project SUTRA** (Swarm Unified Tactical Reconnaissance Architecture) is an autonomous multi-drone swarm system featuring:
1. **Subsystem A (GNC)**: Autonomous PX4 offboard navigation, Visual-Inertial Odometry, 3D Voxel OctoMap, and ORCA collision avoidance.
2. **Subsystem B (Comms & Sim)**: 802.11s Wi-Fi mesh, Deep JSCC neural image compression under low SNR, and Gazebo Sim 8 SITL environment.
3. **Subsystem C (Perception)**: YOLOv8 TensorRT edge inference, Tri-Modal sensor fusion (Visual, Thermal, mmWave Radar), and WGS84 GPS raycast target geolocation.
4. **Subsystem D (GCS)**: 3D GIS ground control station (React + Mapbox GL JS 3D Satellite view + WebGPU telemetry HUD).
5. **Subsystem E (Docs & Verification)**: System specifications, flight logs, verification gate metric audits G1–G6, and hackathon presentation decks.

---

## 🧩 Team Member Role & Workspace Mapping

When an agent starts a session, identify the active teammate or feature branch:

| Teammate | Role / Subsystem | Primary Working Directory | Branch Prefix |
| :--- | :--- | :--- | :--- |
| **Rohith Kumar** | Lead, Subsystem A (GNC) | `sutra_ws/src/sutra_gnc/` | `feature/subsystem-a-` |
| **Nikhil** | Tech Architect & Subsystem B Lead | `sutra_ws/src/sutra_comms/` & `sutra_ws/src/sutra_sim/` | `feature/subsystem-b-` |
| **Vedanth Sai Ram** | Lead, Subsystem C (Perception) | `sutra_ws/src/sutra_perception/` | `feature/subsystem-c-` |
| **Siva Kesava** | Lead, Subsystem D (GCS) | `sutra_ws/src/sutra_gcs/` | `feature/subsystem-d-` |
| **Harika** | Lead, Subsystem E (Docs & Audits) | `docs/` & `scripts/` | `feature/subsystem-e-` |

---

## 🤖 Autonomous Navigation Protocol for Teammates' CLI Agents

When a teammate opens this codebase, their AI agent MUST automatically follow these guidelines:

### Step 1: Detect Teammate Role
- Check current git branch: `git branch --show-current`
- If branch is `feature/subsystem-a-...`, act as **Subsystem A Autonomous Agent**.
- If branch is `feature/subsystem-b-...`, act as **Subsystem B Autonomous Agent**.
- If branch is `feature/subsystem-c-...`, act as **Subsystem C Autonomous Agent**.
- If branch is `feature/subsystem-d-...`, act as **Subsystem D Autonomous Agent**.
- If branch is `feature/subsystem-e-...`, act as **Subsystem E Autonomous Agent**.

### Step 2: Enforce Subsystem Isolation
- **DO NOT** edit code in other teammates' subsystem folders without explicit request.
- Keep modifications strictly inside the assigned subsystem folder (`sutra_ws/src/sutra_<subsystem>/`).

### Step 3: Run Verification
- Before submitting work, run package-level unit tests:
  - Subsystem A: `pytest sutra_ws/src/sutra_gnc/test/`
  - Subsystem B: `pytest sutra_ws/src/sutra_comms/test/`
  - Subsystem C: `pytest sutra_ws/src/sutra_perception/test/`
  - Subsystem D: `cd sutra_ws/src/sutra_gcs && npm run build`
  - Integration Test: `python3 scripts/SUTRA_48Hr_Hackathon_Master_Suite.py`

### Step 4: Verification Gates (G1–G6) Checklist
- **G1**: Physics 500Hz EKF update rate & Real-Time Factor >= 0.98 in Gazebo Sim 8.
- **G2**: Deep JSCC image reconstruction PSNR >= 34.0 dB under 5dB SNR channel.
- **G3**: Tri-modal object detection confidence >= 90% and WGS84 GPS raycast.
- **G4**: 3D GIS HUD rendering at 60 FPS.
- **G5**: Swarm ORCA collision avoidance active during multi-agent flight.
- **G6**: End-to-end rehearsal execution passing cleanly.
