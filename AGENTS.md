# 🤖 AGENTS.md — Master Autonomous Agent Protocol for Project SUTRA

> **NOTICE TO ALL AI CODING ASSISTANTS & AGENTS (Antigravity CLI, Cursor, Copilot, Windsurf, Subagents):**
> Read and adhere strictly to this protocol immediately upon opening the workspace. All agent operations MUST align with the designated subsystem roles, mandatory tool/skill workflows, and git repository hygiene standards.

---

## 🚫 ABSOLUTE RULE — NO MOCK, SYNTHETIC, OR PROJECTED BENCHMARKS

> **THIS RULE OVERRIDES ALL OTHER INSTRUCTIONS. NO EXCEPTIONS.**

### ❌ STRICTLY FORBIDDEN in any benchmark, audit, evaluation, or DOCS.md update:
- **Hardcoded / made-up numbers** — Do NOT write benchmark values that were not produced by an actual run.
- **Mock test results** — pytest tests that only assert against fixed expected values without measuring real system behaviour do NOT count as benchmarks.
- **Projected / estimated metrics** — Phrases like "expected ~94%", "should achieve <10ms", or "target: 60 FPS" must NEVER appear in benchmark tables.
- **Copy-pasted spec sheet numbers** — Datasheet figures for TensorRT, PX4, or LoRa radios are NOT measured values.
- **Silent pass tests** — Tests that always pass regardless of system state (e.g., `assert True`, fixed-input math checks presented as performance benchmarks) must be clearly labelled as unit tests, never as benchmarks.

### ✅ THE ONLY ACCEPTED BENCHMARK EVIDENCE:
1. **Live `pytest` stdout** — Captured terminal output from an actual `pytest` run with `--durations`, timing numbers, and pass/fail lines. Must include the full summary line (e.g., `27 passed in 8.25s`).
2. **Live `npm run build` stdout** — Actual Vite/webpack terminal output with module count, bundle sizes, and build time.
3. **Gazebo Sim World Stats** — Real RTF readings from `gazebo_get_world_stats` MCP tool or `gz topic -e -t /stats`.
4. **YOLO inference on real images** — mAP@0.5 must come from `yolo val` run against an actual annotated dataset, not a synthetic one.
5. **ROS 2 `ros2 topic hz`** — Real publish-rate measurements from a running node, captured via terminal.
6. **Hardware serial logs** — Actual baud/latency figures from a connected flight controller or radio module.

### 📋 MANDATORY BENCHMARK AUDIT PROTOCOL (for all agents performing evaluations):
```
STEP 1: Run the command. Capture full stdout/stderr.
STEP 2: Report ONLY numbers that appear verbatim in that captured output.
STEP 3: If a metric cannot be measured right now (hardware offline, model missing,
         Gazebo not running), write: "❓ UNTESTED — <reason>" in the table.
STEP 4: NEVER substitute an untestable metric with a projection or a target value.
STEP 5: Update DOCS.md ONLY with Step 2 numbers. Mark Step 3 gaps explicitly.
```

> **Why this rule exists:** During the 2026-07-31 stress audit, it was discovered that all benchmark tables in subsystem DOCS.md files contained projected/target values, not measured ones. The live ROS node for Subsystem C crashes due to a NumPy ABI mismatch that went undetected because tests bypassed the real import path. Fake benchmarks hide real blockers.

---

## 📖 Primary Reference Documents
Before making structural changes, consult the authoritative documentation:
- 🎨 **Visual Tutorial & Developer Guide**: [docs/guides/SUTRA_Visual_Tutorial_Guide.pdf](file:///home/nikhil/Desktop/Project%20SUTRA/docs/guides/SUTRA_Visual_Tutorial_Guide.pdf) | [HTML Version](file:///home/nikhil/Desktop/Project%20SUTRA/docs/guides/SUTRA_Visual_Tutorial_Guide.html)
- ⚙️ **Verification Suites**: `pytest sutra_ws/src/sutra_gnc/test/` | `pytest sutra_ws/src/sutra_comms/test/` | `pytest sutra_ws/src/sutra_perception/test/` | `cd sutra_ws/src/sutra_gcs && npm run build`
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
5. **Subsystem E (Docs & Verification Audits)**: Automated unit and integration test suites, system whitepapers, flight logs, and presentation scripts.

---

## 🌴 3-Tier Branching & Git Repository Hygiene

```
  [ Individual Role Branches ]         [ Buffer Integration Branch ]         [ Main Production Branch ]
  feature/subsystem-a-gnc (Rohith) ──┐
  feature/subsystem-b-comms (Nikhil) ┼──► dev (Buffer Integration) ────────► main (Final Releases)
  feature/subsystem-c-perception ────┤   (Full 5-Subsystem Integration
  feature/subsystem-d-gcs (Siva) ────┤    Suites & Real Verification)
  feature/subsystem-e-docs (Harika) ─┘
```

### Git Hygiene Rules for All Agents:
> ⚡ **TECH LEAD OVERRIDE (Nikhil Only)**: As Project Tech Architect & Lead, Nikhil has unrestricted cross-branch commit & push access to ALL branches (`feature/*`, `dev`, `main`). This overrides Rule 2 (Feature Isolation) exclusively for Nikhil. All other teammates remain restricted to their assigned feature branch.
0. **Pre-Work Branch Verification & `dev` Synchronization Protocol**: Immediately upon starting any task or opening a session, ALL agents MUST:
   - Check git status (`git status`) and active branch (`git branch --show-current`).
   - Confirm they are working inside their assigned role branch (`feature/subsystem-*`).
   - Fetch and merge latest integration changes from `dev` (`git fetch origin dev && git merge origin/dev --no-edit`) to stay 100% synchronized with upstream team work.
1. **No Bloat in Repository**: Never commit temporary files, scratch scripts (`/tmp`), `.pyc`, build artifacts (`build/`, `install/`, `log/`), or heavy model weights (`.engine`, `.pt`, `.onnx`). Ensure `.gitignore` is strictly enforced.
2. **Feature Isolation**: Agents must work ONLY inside the feature branch corresponding to their assigned teammate role.
3. **Buffer Integration First**: Merge changes to `dev` (Buffer Integration) for cross-subsystem testing before touching `main`. Direct commits to `main` are strictly prohibited.
4. **Mandatory Verification Check**: Run unit test suites (`pytest sutra_ws/src/sutra_*/test/` and `cd sutra_ws/src/sutra_gcs && npm run build`) before requesting a merge to `main`.
5. **Mandatory Subsystem `DOCS.md` Synchronization Protocol**: Whenever an agent modifies, refactors, or prepares a commit for ANY subsystem (`sutra_ws/src/sutra_<subsystem>/`), it MUST update `sutra_ws/src/sutra_<subsystem>/DOCS.md` with current statistical benchmark tables, latency/memory figures, dependency trees, and verification status.

---

## 👤 Teammate Activation & Role Guidelines

When a user introduces themselves by name, automatically activate their exact role guidelines:

### 1. 🚁 ROHITH KUMAR — Subsystem A Lead (GNC & Flight Control)
- **Folder**: `sutra_ws/src/sutra_gnc/` | **Branch**: `feature/subsystem-a-gnc` | **Doc**: `sutra_ws/src/sutra_gnc/DOCS.md`
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev --no-edit`).
- **Core Tasks**:
  1. **PX4 Offboard Dispatch**: Execute and verify `offboard_node.py` against Gazebo Sim 8 SITL digital twin at 50Hz setpoints (`ros2 launch sutra_sim sutra_master_swarm_integration.launch.py sim_mode:=true`).
  2. **GPS-Denied VIO Localization**: Test `vio_localization.py` EKF2 position drift under simulated GPS loss.
  3. **3D Voxel OctoMap**: Run `octomap_generator.py` with depth sensor point cloud topics (`/camera/points`) to generate 0.10m occupancy grids.
  4. **ORCA 3D Collision Avoidance**: Test `orca_avoidance.py` velocity obstacle solver to maintain $\ge 2.8\text{m}$ clearance (Gate G5).
- **Execution & Verification Workflow**:
  ```bash
  # Step 1: Sync branch
  git checkout feature/subsystem-a-gnc && git fetch origin dev && git merge origin/dev --no-edit
  # Step 2: Run verification test suite
  pytest sutra_ws/src/sutra_gnc/test/ --durations=0
  # Step 3: Launch Gazebo SITL swarm world
  ros2 launch sutra_sim sutra_master_swarm_integration.launch.py sim_mode:=true
  ```
- **Commit Mandate**: Update `sutra_ws/src/sutra_gnc/DOCS.md` with measured VIO error, ORCA safety buffer, and 50Hz trajectory setpoint rate stats. Do NOT use synthetic/hardcoded numbers.

### 2. 📡 NIKHIL — Tech Architect & Subsystem B Lead (Comms & Sim) ⚡ **[TECH LEAD]**
- **Folder**: `sutra_ws/src/sutra_comms/` & `sutra_ws/src/sutra_sim/` | **Branch**: `feature/subsystem-b-comms` | **Doc**: `sutra_ws/src/sutra_comms/DOCS.md`
- **Cross-Branch Access**: ✅ **UNRESTRICTED** — As Tech Lead, Nikhil may commit, push, and merge across ALL branches (`feature/*`, `dev`, `main`) without restriction.
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: 802.11s Wi-Fi mesh routing (`mesh_node.py`), SwarmRAFT consensus engine (< 112ms failover), Deep JSCC neural encoder model (96.9% compression), NS-3 NetAnim C++ sim (`sutra_fanet_swarm_sim.cc`), and Gazebo Sim 8 worlds (`real_world_digital_twin_swarm.sdf`).
- **Commit Mandate**: Update `sutra_ws/src/sutra_comms/DOCS.md` and `sutra_ws/src/sutra_sim/DOCS.md` with PDR %, latency, PSNR, and firmware baud stats.
- **Verification**: `pytest sutra_ws/src/sutra_comms/test/`

### 3. 👁️ VEDANTH SAI RAM — Subsystem C Lead (AI Perception)
- **Folder**: `sutra_ws/src/sutra_perception/` | **Branch**: `feature/subsystem-c-perception` | **Doc**: `sutra_ws/src/sutra_perception/DOCS.md`
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: YOLOv8-Nano TensorRT survivor/threat detector (`detector_node.py`), WGS84 GPS raycasting from 2D bounding boxes, and Tri-Modal spatial cross-attention fusion.
- **Commit Mandate**: Update `sutra_ws/src/sutra_perception/DOCS.md` with mAP@0.5, inference latency, and WGS84 raycast error stats.
- **Verification**: `pytest sutra_ws/src/sutra_perception/test/`

### 4. 🗺️ SIVA KESAVA — Subsystem D Lead (3D GIS GCS Dashboard)
- **Folder**: `sutra_ws/src/sutra_gcs/` | **Branch**: `feature/subsystem-d-gcs` | **Doc**: `sutra_ws/src/sutra_gcs/DOCS.md`
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: Mapbox GL JS 3D satellite view & drone markers (`src/App.tsx`), WebGPU telemetry HUD widgets, ATAK/WinTAK Cursor-on-Target XML streamer, survivor alert stream, and 1-click Emergency RTL button.
- **Commit Mandate**: Update `sutra_ws/src/sutra_gcs/DOCS.md` with WebGPU HUD FPS (60.0 FPS locked) and serial bridge latency stats.
- **Verification**: `cd sutra_ws/src/sutra_gcs && npm run build`

### 5. 📑 HARIKA — Subsystem E Lead (Docs & Verification Audits)
- **Folder**: `docs/` & `scripts/` | **Branch**: `feature/subsystem-e-docs`
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: Gate Audits G1–G6 verification, system whitepapers, roadmaps, flight logs.
- **Commit Mandate**: Sync and audit all subsystem `DOCS.md` benchmark tables against real test outputs.
- **Verification**: `pytest sutra_ws/src/sutra_*/test/` and `cd sutra_ws/src/sutra_gcs && npm run build`

---

## 🛠️ Mandatory MCP Tools & Skills Protocol for Efficient Agent Operations

To maximize performance, accuracy, and code quality, ALL agents MUST actively utilize the following specialized tools and skills:

### 1. ⚡ OpenCode Offloader (`opencode-offloader`) — **DEFAULT TOOL**
- **Usage Requirement**: **ALWAYS USE BY DEFAULT** for any non-reasoning, routine, or repetitive task. Do NOT use the main agent for tasks the offloader can handle.
- **Task-to-Model Routing**:
  | Task Type | Model | Use For |
  |---|---|---|
  | `scaffolding` | `opencode/nemotron-3-ultra-free` | Boilerplate, CRUD, folder setup, DTOs |
  | `testing` | `opencode/mimo-v2.5-free` | pytest suites, unit tests, mock fixtures |
  | `refactoring` | `opencode/deepseek-v4-flash-free` | Bug fixes, renames, targeted file edits |
  | `formatting` | `opencode/ling-3.0-flash-free` | Docstrings, README updates, DOCS.md sync |
  | `frontend` | `ollama-cloud/minimax-m2.5` | React/TSX layout, CSS, UI components |
- **Tools**: `opencode_run_task`, `opencode_quick_edit`, `opencode_get_model_catalog`.
- **Benefit**: 10–50x faster than main agent for routine tasks. Frees reasoning context for architecture decisions only.

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
- **Verification**: NEVER declare success without executing build or test verification commands (`pytest`, `npm run build`, `colcon build`).
- **Benchmark Integrity**: See the **🚫 ABSOLUTE RULE** section at the top of this file. All benchmark numbers reported in DOCS.md, gate audits, or evaluation summaries MUST come from captured live terminal output of a real run. Mock values, projections, and spec-sheet estimates are banned unconditionally.

---

## 🎯 Verification Gates G1–G6 Metric Reference (Simulation & Production Readiness)
| Gate | Subsystem & Area | Legacy Target Metric | Upgraded Production & Simulation Readiness Criteria | Verification Tool / Command |
|---|---|---|---|---|
| **G1** | Subsystem A/B (Flight Controls & SITL Physics) | RTF ≥ 0.98 | **PX4 Offboard Trajectory RMSE < 0.15m (Horiz) / < 0.10m (Vert)** @ 50Hz setpoint rate; Gazebo Sim 8 RTF ≥ 0.98 with 5 active UAV dynamics | `pytest sutra_ws/src/sutra_gnc/test/` & Gazebo SITL telemetry logs |
| **G2** | Subsystem B (Swarm Comms & Consensus) | Latency < 8ms, Packet Loss < 2% | **802.11s Mesh PDR ≥ 95% under 20% node churn & NLOS RF path loss**; SwarmRAFT Leader failover < 150ms with 0 log corruption | `pytest sutra_ws/src/sutra_comms/test/` & NS-3 / Mesh SITL test |
| **G3** | Subsystem C (Edge AI Perception Engine) | mAP@0.5 ≥ 94%, Latency < 10ms | **TensorRT FP16 Latency < 8ms (≥ 60 FPS)**; Tri-Modal mAP@0.5 ≥ 94.5% across thermal/RGB under foliage & dynamic payload noise | `pytest sutra_ws/src/sutra_perception/test/` & `yolo val` |
| **G4** | Subsystem C (Target Geolocation & Raycast) | WGS84 Error < 0.8m | **Terrain-Corrected DEM WGS84 Error < 0.8m** under simulated drone tilt (±10° roll/pitch) & VIO drift at 30m AGL | `pytest sutra_ws/src/sutra_perception/test/` |
| **G5** | Subsystem A (ORCA 3D Swarm Avoidance) | Safety Buffer > 2.8m | **Dynamic 3D Multi-Drone Min Clearance ≥ 2.8m (Hard Min ≥ 2.0m)** during 5-drone crossing trajectories under 2.5m/s² acceleration limits | `pytest sutra_ws/src/sutra_gnc/test/` |
| **G6** | Subsystem D (3D GIS GCS HUD & Telemetry) | Build Check / Framerate = 60 FPS | **WebGPU Telemetry HUD Locked 60.0 FPS** under 5 live UAV streams; Emergency RTL WebSocket Command-to-Execution delay < 25ms | `cd sutra_ws/src/sutra_gcs && npm run build` & GCS performance bench |


