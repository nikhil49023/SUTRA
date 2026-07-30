# 🤖 AGENTS.md — Master Autonomous Agent Protocol for Project SUTRA

> **NOTICE TO ALL AI CODING ASSISTANTS & AGENTS (Antigravity CLI, Cursor, Copilot, Windsurf, Subagents):**
> Read and adhere strictly to this protocol immediately upon opening the workspace. All agent operations MUST align with the designated subsystem roles, mandatory tool/skill workflows, and git repository hygiene standards.

---

## 📖 Primary Reference Documents
Before making structural changes, consult the authoritative documentation:
- 🎨 **Visual Tutorial & Developer Guide**: [docs/guides/SUTRA_Visual_Tutorial_Guide.pdf](file:///home/nikhil/Desktop/Project%20SUTRA/docs/guides/SUTRA_Visual_Tutorial_Guide.pdf) | [HTML Version](file:///home/nikhil/Desktop/Project%20SUTRA/docs/guides/SUTRA_Visual_Tutorial_Guide.html)
- ⚙️ **Master Verification Suite**: [scripts/SUTRA_48Hr_Hackathon_Master_Suite.py](file:///home/nikhil/Desktop/Project%20SUTRA/scripts/SUTRA_48Hr_Hackathon_Master_Suite.py)
- 🗺️ **Subsystem Roadmaps**: [docs/plans/SUTRA_Team_Roadmaps.md](file:///home/nikhil/Desktop/Project%20SUTRA/docs/plans/SUTRA_Team_Roadmaps.md)

---

## 🎯 System Scope & Ultimate Mission Statement

### Problem Statement & Challenge:
Manual search and rescue operations in disaster-hit, forested, or conflict-prone environments are slow, hazardous, and severely limited in situational awareness. Traditional single-drone operations lack coverage, endurance, and fault-tolerance. 

### Ultimate Solution Objective:
**Project SUTRA** (Swarm Unified Tactical Reconnaissance Architecture) is an **Autonomous Multi-Drone Swarm System** engineered for collaborative search, rescue, survivor detection, and tactical reconnaissance with minimal human intervention in **GPS-denied and communication-challenged environments**.

### 5 Core Interconnected Subsystems:
1. **Subsystem A (GNC & Flight Control)**: Autonomous PX4 offboard navigation, Visual-Inertial Odometry (VIO) for GPS-denied localization, 3D Voxel OctoMap occupancy grid generation, and ORCA 3D reciprocal collision avoidance.
2. **Subsystem B (Comms & Simulation)**: 802.11s Wi-Fi mesh routing, SwarmRAFT distributed consensus engine (< 500ms leader failover), Deep JSCC neural thermal/visual image compression under low SNR, and Gazebo Sim 8 SITL disaster digital twin.
3. **Subsystem C (AI Edge Perception)**: YOLOv8-Nano TensorRT edge detector, Tri-Modal sensor fusion (Visual, Thermal, mmWave Radar), survivor/threat identification, and WGS84 GPS raycast target geolocation.
4. **Subsystem D (3D GIS GCS)**: React 18 + Mapbox GL JS 3D Satellite view, WebGPU real-time telemetry HUD, survivor alert stream, and 1-click Emergency Return-to-Launch (RTL).
5. **Subsystem E (Docs & Verification Audits)**: Automated verification gate metric audits G1–G6, system whitepapers, flight logs, and presentation scripts.

---

## 🌴 3-Tier Branching & Git Repository Hygiene

```
  [ Individual Role Branches ]         [ Buffer Integration Branch ]         [ Main Production Branch ]
  feature/subsystem-a-gnc (Rohith) ──┐
  feature/subsystem-b-comms (Nikhil) ┼──► buffer-integration / dev ────────► main (Final Releases)
  feature/subsystem-c-perception ────┤   (Full 5-Subsystem Integration
  feature/subsystem-d-gcs (Siva) ────┤    Suite & Gate G1-G6 Audits)
  feature/subsystem-e-docs (Harika) ─┘
```

### Git Hygiene Rules for All Agents:
0. **Pre-Work Branch Verification & `dev` Synchronization Protocol**: Immediately upon starting any task or opening a session, ALL agents MUST:
   - Check git status (`git status`) and active branch (`git branch --show-current`).
   - Confirm they are working inside their assigned role branch (`feature/subsystem-*`).
   - Fetch and merge latest integration changes from `dev` (`git fetch origin dev && git merge origin/dev --no-edit`) to stay 100% synchronized with upstream team work.
1. **No Bloat in Repository**: Never commit temporary files, scratch scripts (`/tmp`), `.pyc`, build artifacts (`build/`, `install/`, `log/`), or heavy model weights (`.engine`, `.pt`, `.onnx`). Ensure `.gitignore` is strictly enforced.
2. **Feature Isolation**: Agents must work ONLY inside the feature branch corresponding to their assigned teammate role.
3. **Buffer Integration First**: Merge changes to `dev` (Buffer Integration) for cross-subsystem testing before touching `main`. Direct commits to `main` are strictly prohibited.
4. **Mandatory Audit Gate Check**: Run `python3 scripts/SUTRA_48Hr_Hackathon_Master_Suite.py` to verify Gates G1–G6 before requesting a merge to `main`.
5. **Mandatory Subsystem `DOCS.md` Synchronization Protocol**: Whenever an agent modifies, refactors, or prepares a commit for ANY subsystem (`sutra_ws/src/sutra_<subsystem>/`), it MUST update `sutra_ws/src/sutra_<subsystem>/DOCS.md` with current statistical benchmark tables, latency/memory figures, dependency trees, and verification status.

---

## 👤 Teammate Activation & Role Guidelines

When a user introduces themselves by name, automatically activate their exact role guidelines:

### 1. 🚁 ROHITH KUMAR — Subsystem A Lead (GNC & Flight Control)
- **Folder**: `sutra_ws/src/sutra_gnc/` | **Branch**: `feature/subsystem-a-gnc` | **Doc**: `sutra_ws/src/sutra_gnc/DOCS.md`
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: PX4 Offboard trajectory mode dispatch (`offboard_node.py`), Visual-Inertial Odometry (VIO) localization, ORCA 3D avoidance, and OctoMap 3D voxel grid.
- **Commit Mandate**: Update `sutra_ws/src/sutra_gnc/DOCS.md` with VIO error, ORCA safety buffer, and 50Hz rate stats.
- **Verification**: `pytest sutra_ws/src/sutra_gnc/test/`

### 2. 📡 NIKHIL — Tech Architect & Subsystem B Lead (Comms & Sim)
- **Folder**: `sutra_ws/src/sutra_comms/` & `sutra_ws/src/sutra_sim/` | **Branch**: `feature/subsystem-b-comms` | **Doc**: `sutra_ws/src/sutra_comms/DOCS.md`
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: 802.11s Wi-Fi mesh routing (`mesh_node.py`), SwarmRAFT consensus engine (< 112ms failover), Deep JSCC neural encoder model (96.9% compression), NS-3 NetAnim C++ sim (`sutra_fanet_swarm_sim.cc`), and Gazebo Sim 8 worlds (`real_world_digital_twin_swarm.sdf`).
- **Commit Mandate**: Update `sutra_ws/src/sutra_comms/DOCS.md` and `sutra_ws/src/sutra_sim/DOCS.md` with PDR %, latency, PSNR, and firmware baud stats.
- **Verification**: `pytest sutra_ws/src/sutra_comms/test/` (Physics RTF >= 0.995)

### 3. 👁️ VEDANTH SAI RAM — Subsystem C Lead (AI Perception)
- **Folder**: `sutra_ws/src/sutra_perception/` | **Branch**: `feature/subsystem-c-perception` | **Doc**: `sutra_ws/src/sutra_perception/DOCS.md`
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: YOLOv8-Nano TensorRT survivor/threat detector (`detector_node.py`), WGS84 GPS raycasting from 2D bounding boxes, and Tri-Modal spatial cross-attention fusion.
- **Commit Mandate**: Update `sutra_ws/src/sutra_perception/DOCS.md` with mAP@0.5, inference latency, and WGS84 raycast error stats.
- **Verification**: `pytest sutra_ws/src/sutra_perception/test/` (mAP@0.5 >= 94%)

### 4. 🗺️ SIVA KESAVA — Subsystem D Lead (3D GIS GCS Dashboard)
- **Folder**: `sutra_ws/src/sutra_gcs/` | **Branch**: `feature/subsystem-d-gcs` | **Doc**: `sutra_ws/src/sutra_gcs/DOCS.md`
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: Mapbox GL JS 3D satellite view & drone markers (`src/App.tsx`), WebGPU telemetry HUD widgets, ATAK/WinTAK Cursor-on-Target XML streamer, survivor alert stream, and 1-click Emergency RTL button.
- **Commit Mandate**: Update `sutra_ws/src/sutra_gcs/DOCS.md` with WebGPU HUD FPS (60.0 FPS locked) and serial bridge latency stats.
- **Verification**: `cd sutra_ws/src/sutra_gcs && npm run build` (60 FPS HUD)

### 5. 📑 HARIKA — Subsystem E Lead (Docs & Verification Audits)
- **Folder**: `docs/` & `scripts/` | **Branch**: `feature/subsystem-e-docs`
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: Gate Audits G1–G6 verification (`scripts/SUTRA_48Hr_Hackathon_Master_Suite.py`), system whitepapers, roadmaps, flight logs.
- **Commit Mandate**: Sync and audit all subsystem `DOCS.md` benchmark tables against master suite test outputs.
- **Verification**: `python3 scripts/SUTRA_48Hr_Hackathon_Master_Suite.py`

---

## 🛠️ Mandatory MCP Tools & Skills Protocol for Efficient Agent Operations

To maximize performance, accuracy, and code quality, ALL agents MUST actively utilize the following specialized tools and skills:

### 1. ⚡ OpenCode Offloader (`opencode-offloader`)
- **Usage Requirement**: MANDATORY for offloading non-reasoning, routine, or repetitive code tasks (unit test scaffolding, docstring generation, boilerplate, formatting).
- **Tools**: `opencode_run_task`, `opencode_quick_edit`.
- **Benefit**: Frees main agent context while using ultra-fast OpenCode models (Mimo, Nemotron, DeepSeek Flash).

### 2. 🕸️ Code Review Graph (`code-review-graph`)
- **Usage Requirement**: MANDATORY before making architectural changes or multi-file refactors.
- **Tools**: `build_or_update_graph_tool`, `get_impact_radius_tool`, `list_flows_tool`, `query_graph_tool`, `refactor_tool`, `apply_refactor_tool`.
- **Benefit**: Traces call graphs, determines exact impact radius across ROS 2 packages, and prevents unintended side effects.

### 3. 🔥 Local Firecrawl (`firecrawl-doc-skill-creator`)
- **Usage Requirement**: Use local Firecrawl (`http://localhost:3002`) for scraping online documentation, API specs, ROS 2 / Gazebo Sim tutorials, or external library manuals.
- **Benefit**: Auto-generates structured `DOCS.md` and custom skills for newly integrated packages without guesswork.

### 4. 🔍 Context & ContextM (`context` / `contextm`)
- **Usage Requirement**: Check active editor context (`get_active_editor_context`) and GCP/resource connections to maintain full environment awareness.

### 5. 🤖 Subagent & Task Parallelization
- **Usage Requirement**: Delegate heavy codebase research or broad file scanning to `research` subagents using `invoke_subagent`.
- **Non-Blocking Rule**: NEVER poll background tasks in a tight loop. Rely on reactive system notifications or silent background execution.

### 6. 🧪 Log-Based Diagnosis & Empirical Verification
- **Rule**: NEVER guess failure causes. Inspect un-truncated log tracebacks using file/terminal tools before diagnosing.
- **Verification**: NEVER declare success without executing build or test verification commands (`pytest`, `npm run build`, `colcon build`, `SUTRA_48Hr_Hackathon_Master_Suite.py`).

---

## 🎯 Verification Gates G1–G6 Metric Reference
| Gate | Target Metric | Required Threshold | Verification Tool |
|---|---|---|---|
| **G1** | Physics & Telemetry Sync | Real-Time Factor (RTF) ≥ 0.98 | `SUTRA_48Hr_Hackathon_Master_Suite.py` |
| **G2** | Swarm Mesh & Raft Consensus | Latency < 12ms, Packet Loss < 2%, Failover < 500ms | `pytest sutra_ws/src/sutra_comms/test/` |
| **G3** | Edge AI Survivor Perception | mAP@0.5 ≥ 90%, Latency < 15ms | `pytest sutra_ws/src/sutra_perception/test/` |
| **G4** | Target Geolocation | WGS84 Error < 1.5 meters | `SUTRA_48Hr_Hackathon_Master_Suite.py` |
| **G5** | ORCA 3D Avoidance | Safety Buffer > 2.0 meters | `pytest sutra_ws/src/sutra_gnc/test/` |
| **G6** | 3D GIS Telemetry HUD | Framerate = 60 FPS | `cd sutra_ws/src/sutra_gcs && npm run build` |
