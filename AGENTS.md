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
- ⚡ **Full-Day Master Sprint Plan**: [docs/plans/SUTRA_Full_Day_Master_Sprint_Plan.md](file:///home/nikhil/Desktop/Project%20SUTRA/docs/plans/SUTRA_Full_Day_Master_Sprint_Plan.md)
- 🎨 **Visual Tutorial & Developer Guide**: [docs/guides/SUTRA_Visual_Tutorial_Guide.pdf](file:///home/nikhil/Desktop/Project%20SUTRA/docs/guides/SUTRA_Visual_Tutorial_Guide.pdf) | [HTML Version](file:///home/nikhil/Desktop/Project%20SUTRA/docs/guides/SUTRA_Visual_Tutorial_Guide.html)
- ⚙️ **Verification Suites**: `pytest sutra_ws/src/sutra_gnc/test/` | `pytest sutra_ws/src/sutra_comms/test/` | `pytest sutra_ws/src/sutra_perception/test/` | `cd sutra_ws/src/sutra_gcs && npm run build`
- 🗺️ **Subsystem Roadmaps**: [docs/plans/SUTRA_Team_Roadmaps.md](file:///home/nikhil/Desktop/Project%20SUTRA/docs/plans/SUTRA_Team_Roadmaps.md)

---

## 🎯 System Scope & Ultimate Mission Statement

### Problem Statement & Challenge:
Manual search and rescue operations in disaster-hit, forested, or conflict-prone environments are slow, hazardous, and severely limited in situational awareness. Traditional single-drone operations lack coverage, endurance, and fault-tolerance. 

### Ultimate Solution Objective:
**Project SUTRA** (Swarm Unified Tactical Reconnaissance Architecture) is an **Autonomous Multi-Drone Swarm System** engineered for collaborative search, rescue, survivor detection, and tactical reconnaissance with minimal human intervention.

### 6 Core Interconnected Subsystems:
1. **Subsystem A (GNC & Flight Control)**: Autonomous PX4 offboard navigation, Visual-Inertial Odometry (VIO) for GPS-denied localization, 3D Voxel OctoMap occupancy grid generation, and ORCA 3D reciprocal collision avoidance. *(Led by Tech Lead Nikhil)*
2. **Subsystem B (Comms & Simulation)**: 802.11s Wi-Fi mesh routing, SwarmRAFT distributed consensus engine (< 500ms leader failover), Deep JSCC neural thermal/visual image compression under low SNR, and Gazebo Sim 8 SITL disaster digital twin. *(Led by Tech Lead Nikhil)*
3. **Subsystem C (AI Edge Perception)**: YOLOv8-Nano TensorRT edge detector, Tri-Modal sensor fusion (Visual, Thermal, mmWave Radar), survivor/threat identification, and WGS84 GPS raycast target geolocation. *(Led by Vedanth Sai Ram)*
4. **Subsystem D (3D GIS GCS)**: React 18 + Mapbox GL JS 3D Satellite view, WebGPU real-time telemetry HUD, survivor alert stream, and 1-click Emergency Return-to-Launch (RTL). *(Led by Siva Kesava)*
5. **Subsystem E (Docs, Verification Audits & Presentation Design)**: Automated unit and integration test suites, system whitepapers, flight logs, master pitch deck formatting, and visual media design. *(Led by Harika)*
6. **Subsystem F (Tactical Operations & Field Deployment)**: NDMA rescue CONOPS (Concept of Operations), disaster scenario profiles (Kedarnath flood / landslide search), field deployment SOPs, pre-flight safety checklists, and operational rescue storytelling. *(Led by Rohith Kumar)*

---

## 🌴 3-Tier Branching & Git Repository Hygiene

```
  [ Individual Role Branches ]         [ Buffer Integration Branch ]         [ Main Production Branch ]
  feature/subsystem-a-gnc (Nikhil) ──┐
  feature/subsystem-b-comms (Nikhil) ┼──► dev (Buffer Integration) ────────► main (Final Releases)
  feature/subsystem-c-perception ────┤   (Full 6-Subsystem Integration
  feature/subsystem-d-gcs (Siva) ────┤    Suites & Real Verification)
  feature/subsystem-e-docs (Harika) ─┤
  feature/subsystem-f-ops (Rohith) ──┘
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
5. **Mandatory Subsystem `DOCS.md` Synchronization Protocol**: Whenever an agent modifies, refactors, or prepares a commit for ANY subsystem (`sutra_ws/src/sutra_<subsystem>/` or `docs/conops/`), it MUST update the corresponding `DOCS.md` with current statistical benchmark tables, latency/memory figures, dependency trees, and verification status.

---

## 👤 Teammate Activation & Role Guidelines

When a user introduces themselves by name, automatically activate their exact role guidelines:

### 1. 🚁 ROHITH KUMAR — Subsystem F Lead (Tactical Operations & Field Deployment)
- **Folder**: `docs/conops/` ONLY | **Branch**: `feature/subsystem-f-ops` ONLY | **Doc**: `docs/conops/DOCS.md`
- **Subsystem Status**: ✅ **OFFICIALLY ASSIGNED & SPECIFIED (100% Non-Coding Operational Scope)**
- **Strict Access Scope & Repository Isolation Policy**:
  - 🔒 **STRICT SUBSYSTEM SCOPE LOCK**: Rohith and any AI agent operating for Rohith are **STRICTLY RESTRICTED TO `docs/conops/` ONLY**.
  - 🚫 **ZERO WRITE / COMMIT ACCESS OUTSIDE SUBSYSTEM F**: Rohith has **ZERO ACCESS** to modify, inspect, or commit to Subsystem A (`sutra_gnc`), Subsystem B (`sutra_comms`), Subsystem C (`sutra_perception`), Subsystem D (`sutra_gcs`), Subsystem E (`docs/`), `dev`, or `main`.
  - 🎯 **MANDATORY EFFORT FOCUS DIRECTIVE**: Rohith and his AI agents MUST focus 100% of their operational effort on Subsystem F deliverables:
    1. **Module F1 (NDMA Rescue CONOPS)**: Kedarnath flood & Wayanad landslide search corridor profiles.
    2. **Module F2 (Field Deployment SOP)**: Pre-flight physical & telemetry checklists, ground safety boundaries, emergency field abort procedures.
    3. **Module F3 (Tactical Rescue Storytelling)**: Operational mission narrative for jury defense & presentation.
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev --no-edit`).

### 2. 📡 NIKHIL — Tech Architect & Subsystem A + B Lead (GNC, Comms & Sim) ⚡ **[TECH LEAD]**
- **Folder**: `sutra_ws/src/sutra_gnc/`, `sutra_ws/src/sutra_comms/`, & `sutra_ws/src/sutra_sim/` | **Branch**: `feature/subsystem-a-gnc` & `feature/subsystem-b-comms` | **Docs**: `sutra_ws/src/sutra_gnc/DOCS.md`, `sutra_ws/src/sutra_comms/DOCS.md`
- **Cross-Branch Access**: ✅ **UNRESTRICTED** — As Tech Lead, Nikhil has direct takeover authority over Subsystem A (GNC & Flight Control) and unrestricted access across ALL branches (`feature/*`, `dev`, `main`).
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: Autonomous PX4 offboard navigation, 50Hz setpoints, VIO localization, ORCA 3D collision avoidance, 802.11s mesh routing, SwarmRAFT consensus, Deep JSCC encoder/decoder, and Gazebo Sim 8 digital twin worlds.

### 3. 👁️ VEDANTH SAI RAM — Subsystem C Lead (AI Perception)
- **Folder**: `sutra_ws/src/sutra_perception/` | **Branch**: `feature/subsystem-c-perception` | **Doc**: `sutra_ws/src/sutra_perception/DOCS.md`
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: YOLOv8-Nano TensorRT survivor/threat detector (`detector_node.py`), WGS84 GPS raycasting from 2D bounding boxes, and Tri-Modal spatial cross-attention fusion.
- **Inter-Subsystem Interfaces**:
  - Consumes `/sutra/gnc/{drone_id}/pose_stamped` from Subsystem A for DEM terrain raycasting.
  - Streams target classifications (`Survivor`, `Threat/Fire`, `Safe Corridor`) aligned with Subsystem F NDMA rescue categories.
  - Feeds bounding box telemetry to Subsystem B (`mesh_node`) for Deep JSCC neural transmission.

### 4. 🗺️ SIVA KESAVA — Subsystem D Lead (3D GIS GCS Dashboard)
- **Folder**: `sutra_ws/src/sutra_gcs/` | **Branch**: `feature/subsystem-d-gcs` | **Doc**: `sutra_ws/src/sutra_gcs/DOCS.md`
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: Mapbox GL JS 3D satellite view & drone markers (`src/App.tsx`), WebGPU real-time telemetry HUD widgets, ATAK/WinTAK Cursor-on-Target XML streamer, survivor alert stream, and 1-click Emergency RTL button.
- **Inter-Subsystem Interfaces**:
  - Renders Subsystem F search corridor polygons and NDMA staging geofence overlays on 3D Mapbox viewer.
  - Displays Pre-Flight SOP checklist verification badges on WebGPU HUD.
  - Connects to Subsystem B WebSocket gateway (`ws_port: 9090`) maintaining 60.0 FPS HUD performance under 5 UAV streams.

### 5. 📑 HARIKA — Subsystem E Lead (Docs, Verification Audits & Presentation Design)
- **Folder**: `docs/` & `scripts/` | **Branch**: `feature/subsystem-e-docs`
- **Pre-Work Action**: Run Rule 0 (`git status`, `git branch --show-current`, `git fetch origin dev && git merge origin/dev`).
- **Tasks**: Gate Audits G1–G6 verification, system whitepapers, roadmaps, flight logs, Master Pitch Deck formatting, presentation slide deck design, and visual media creation.
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


