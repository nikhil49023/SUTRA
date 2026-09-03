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

## 🎯 System Scope & Smart Horizon Grand Finale Mission (Sept 3–5, 2026)

### Grand Finale Operational Context:
- **Event**: Smart Horizon: 48-Hour International Hackathon (NHCE Bengaluru)
- **Team ID**: `SHIH26-TID-361` | **Assigned Venue**: **Library** (Defence & SpaceTech Track)
- **Problem Statement**: **SH-DST-05** (*Autonomous Drone Swarm System for Search, Rescue & Reconnaissance in GPS-Denied / RF-Jammed Environments*)
- **Competitors**: Exactly 4 Teams registered in SH-DST-05 (`TID-090`, `TID-361`, `TID-424`, `TID-504`)
- **Scoring Architecture**: **300 Total Marks** across 3 Evaluative Stages:
  * 🟢 **Evaluation 1 (100 Marks)**: Day 1 (03-Sep) 05:00 PM onwards — System Architecture, Baseline Prototype, SH-DST-05 Problem Mapping.
  * 🟡 **Evaluation 2 (100 Marks)**: Day 2 (04-Sep) 02:00 PM onwards — Subsystem Integration, 100% Closure of Eval 1 Jury Feedback (Rule 6.1), Disturbance Hardening (GPS loss, RF noise, wind shear).
  * 🔴 **Evaluation 3 (100 Marks)**: Day 3 (05-Sep) 08:30 AM – 11:00 AM — Live 5-UAV Ring Crossing Demo, Sub-0.32m WGS84 Raycasting, Unit Economics (₹42,850/drone), Grand Finals Pitch.

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
6. **Mandatory Jury Feedback Incorporation Loop (NHCE Rule 6.1)**: Any feedback requested by jury members during Evaluation 1 or 2 must be immediately logged into `docs/hackathon/JURY_FEEDBACK_TRACKER.md`. Code changes resolving jury items must be accompanied by dedicated test assertions and committed with tags before the subsequent evaluation.
7. **24/7 Workstation Attendance Invariant (NHCE Rule 3.4 & General Rule 7)**: The allocated desk in the Library must NEVER be left empty. At least 2 team members must remain at the table at all times, including all meal and high-tea shifts.
8. **Tool Transparency & Disclosure Protocol (NHCE Rule 6.4.1)**: All AI accelerators, compilers, and third-party frameworks must be explicitly cited in `README.md` and submission manifests. Never obscure the toolchain.

---

## 👥 48-Hour Grand Finals Team Architecture & Hardware Compute Matrix

To guarantee maximum building speed, 24/7 sprint endurance, and zero-risk jury defense during the 48-Hour Grand Finals, the team operates in a **Lead + Pair Assistant** model based on pre-hackathon commit performance and compute power:

| Teammate | Machine & Compute Specs | Grand Finals Role | Primary Responsibilities | Jury Defense Ownership |
|---|---|---|---|---|
| **⚡ Nikhil** | **ASUS TUF A15** (RTX 3050 GPU, AMD CPU) | **Tech Architect & Subsystem A + B Lead** | Autonomous GNC, 50Hz offboard setpoints, ORCA 3D, Deep JSCC codec, Gazebo Sim 8 digital twin, full-stack integration | 🛡️ **Architecture & Moat Defense** |
| **👁️ Vedanth Sai Ram** | **Lenovo Yoga** (Ultrabook CPU) | **Subsystem C Lead** (AI Perception) | YOLOv8-Nano TensorRT detector, Tri-Modal fusion, SAHI slicing, WGS84 DEM raycasting *(Offloads heavy GPU training/TRT builds to Rohith)* | 🛡️ **Edge AI & Geolocation Defense** |
| **🗺️ Siva Kesava** | **Lenovo Laptop** (Intel i5 CPU) | **Subsystem D Lead** (3D GIS GCS) | React 18 + Mapbox 3D satellite view, WebGPU HUD widgets, WebSocket state machine, MAVLink router *(Offloads multi-stream load tests to Rohith)* | 🛡️ **GCS & Operator HUD Defense** |
| **📑 Harika** | **MacBook Pro** (Apple Silicon) | **Subsystem E Lead & Field CONOPS Co-Lead** | Automated test verification suites, Master Pitch Deck delivery, Zero-Mock scorecard, NDMA disaster search profiles & unit economics | 🛡️ **Presentation Delivery & Verification Defense** |
| **⚙️ Rohith Kumar** | **HP Victus** (Intel i7, NVIDIA RTX 4050 6GB VRAM) | **Compute & Execution Assistant** (C & D, A auxiliary) | Dedicated GPU compute runner for TensorRT builds & GCS stress tests; secondary screen GCS flight telemetry monitor | 🔒 **Zero Independent Q&A Risk** (Backline Support) |

---

## 👤 Teammate Activation & Role Guidelines

When a user introduces themselves by name, automatically activate their exact role guidelines:

### 1. ⚙️ ROHITH KUMAR — Compute & Execution Assistant (Assisting Subsystems C & D)
- **Role Scope**: **Execution & Compute Support ONLY** under direction of Subsystem Leads Vedanth (C), Siva (D), or Nikhil (A).
- **Assigned Tasks**:
  - Running GPU-heavy PyTorch batch inferences and TensorRT FP16 engine compilations for Vedanth on his RTX 4050.
  - Running multi-stream GCS load tests and WebGPU telemetry capture for Siva.
  - Ground telemetry and mission flight log logging during live demonstration.
- **Jury Defense & Q&A Protocol**: **ZERO independent technical Q&A exposure**. All architectural, algorithmic, and operational questions are fielded by Nikhil, Vedanth, Siva, or Harika.

### 2. 📡 NIKHIL — Tech Architect & Subsystem A + B Lead (GNC, Comms & Sim) ⚡ **[TECH LEAD]**
- **Folder**: `sutra_ws/src/sutra_gnc/`, `sutra_ws/src/sutra_comms/`, & `sutra_ws/src/sutra_sim/` | **Branch**: `feature/subsystem-a-gnc` & `feature/subsystem-b-comms` | **Docs**: `sutra_ws/src/sutra_gnc/DOCS.md`, `sutra_ws/src/sutra_comms/DOCS.md`
- **Cross-Branch Access**: ✅ **UNRESTRICTED** — Unrestricted takeover authority and push access across ALL branches (`feature/*`, `dev`, `main`).
- **Tasks**: Autonomous PX4 offboard navigation, 50Hz setpoints, VIO localization, ORCA 3D collision avoidance, 802.11s mesh routing, SwarmRAFT consensus, Deep JSCC encoder/decoder, and Gazebo Sim 8 digital twin worlds.

### 3. 👁️ VEDANTH SAI RAM — Subsystem C Lead (AI Perception & Geolocation)
- **Folder**: `sutra_ws/src/sutra_perception/` | **Branch**: `feature/subsystem-c-perception` | **Doc**: `sutra_ws/src/sutra_perception/DOCS.md`
- **Pair Assistant**: Rohith Kumar (provides RTX 4050 GPU compute for model conversion & stress benchmarking).
- **Tasks**: YOLOv8-Nano TensorRT survivor/threat detector (`detector_node.py`), WGS84 GPS raycasting from 2D bounding boxes, and Tri-Modal spatial cross-attention fusion.

### 4. 🗺️ SIVA KESAVA — Subsystem D Lead (3D GIS GCS Dashboard)
- **Folder**: `sutra_ws/src/sutra_gcs/` | **Branch**: `feature/subsystem-d-gcs` | **Doc**: `sutra_ws/src/sutra_gcs/DOCS.md`
- **Pair Assistant**: Rohith Kumar (provides multi-stream client testing & HUD rendering verification).
- **Tasks**: Mapbox GL JS 3D satellite view & drone markers (`src/App.tsx`), WebGPU real-time telemetry HUD widgets, ATAK/WinTAK Cursor-on-Target XML streamer, survivor alert stream, and 1-click Emergency RTL button.

### 5. 📑 HARIKA — Subsystem E Lead & Field CONOPS Co-Lead (Docs, Audits & Pitch Delivery)
- **Folder**: `docs/` & `scripts/` | **Branch**: `feature/subsystem-e-docs`
- **Co-Lead Support**: Tech Lead Nikhil.
- **Tasks**: Gate Audits G1–G6 verification, Master Pitch Deck delivery & formatting, Zero-Mock benchmark scorecards, NDMA Kedarnath/Wayanad operational profiles, and presentation leadership.

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

## 🎯 Verification Gates G1–G6 Metric Reference (Simulation & Production Readiness — Tightened Industry Standard)
| Gate | Subsystem & Area | Legacy Target Metric | Tightened Production & Simulation Readiness Criteria | Verification Tool / Command |
|---|---|---|---|---|
| **G1** | Subsystem A/B (Flight Controls & SITL Physics) | RTF ≥ 0.98 | **PX4 Offboard Trajectory RMSE < 0.08m (Horiz) / < 0.05m (Vert)** @ 50Hz setpoint rate; **Gazebo Sim 8 RTF ≥ 0.99** with 5 active UAV dynamics & dynamic wind shear (≥ 10 m/s) | `pytest sutra_ws/src/sutra_gnc/test/` & Gazebo SITL telemetry logs |
| **G2** | Subsystem B (Swarm Comms & Consensus) | Latency < 8ms, Packet Loss < 2% | **802.11s Mesh PDR ≥ 98% under 30% node churn & -85 dBm NLOS RF path loss**; **SwarmRAFT Leader failover < 100ms** with 0 log corruption; **Deep JSCC Compression ≥ 95% with PSNR ≥ 38.0 dB** under -5 dB jamming | `pytest sutra_ws/src/sutra_comms/test/` & NS-3 / Mesh SITL test |
| **G3** | Subsystem C (Edge AI Perception Engine) | mAP@0.5 ≥ 94%, Latency < 10ms | **TensorRT FP16 Latency < 5.0ms (≥ 120 FPS pipeline throughput)**; **Tri-Modal mAP@0.5 ≥ 96.0%** across thermal blackout & dynamic payload noise; **ByteTrack MOT ID switches ≤ 1** across 50 frames | `pytest sutra_ws/src/sutra_perception/test/` & `yolo val` |
| **G4** | Subsystem C (Target Geolocation & Raycast) | WGS84 Error < 0.8m | **Terrain-Corrected DEM WGS84 Error < 0.40m** under simulated drone tilt (±25° roll/pitch) & VIO altitude drift at 30m AGL | `pytest sutra_ws/src/sutra_perception/test/` |
| **G5** | Subsystem A (ORCA 3D Swarm Avoidance) | Safety Buffer > 2.8m | **Dynamic 3D Multi-Drone Min Clearance ≥ 3.50m (Hard Min ≥ 2.50m)** during 5-drone crossing trajectories under 3.0m/s² acceleration limits; **Avoidance computation < 1.0ms/UAV** | `pytest sutra_ws/src/sutra_gnc/test/` |
| **G6** | Subsystem D (3D GIS GCS HUD & Telemetry) | Build Check / Framerate = 60 FPS | **WebGPU Telemetry HUD Locked 60.0 FPS** under 10 live UAV streams; **Emergency RTL WebSocket Command-to-Execution delay < 10.0ms** under 20 concurrent GCS clients with 0 dropped frames | `cd sutra_ws/src/sutra_gcs && npm run build` & GCS performance bench |

---

## 🔬 MANDATORY DEEP TECHNICAL RIGOR PROTOCOL FOR ALL AGENTS

> **ABSOLUTE PROTOCOL REQUIREMENT FOR ALL CODING ASSISTANTS & SUBAGENTS:**
> Agents interacting with or developing for Project SUTRA must NEVER provide shallow, vague, hand-wavy, or purely marketing-level descriptions. Every agent response, code comment, commit message, and defense brief MUST articulate both:
> 1. **Individual Subsystem Depth**: The exact low-level mathematics, kinematics, neural network architectures, message schemas, and physical constraints governing that specific component.
> 2. **End-to-End System Integration**: Exactly how that subsystem interfaces across the 50Hz MicroXRCE-DDS bridge, ROS 2 topics, binary WebSocket buffers, and the WebGPU render loop.

### Technical Precision Standards by Subsystem:

1. **Subsystem A (`sutra_gnc`)**:
   - **Trajectories**: Must explain minimum-snap quintic polynomial splines $\vec{p}(t) = \sum_{k=0}^5 \mathbf{a}_k t^k$ with boundary constraints $(p_0, v_0, a_0)$ to $(p_1, v_1, a_1)$ minimizing jerk $\int \|\dddot{\vec{p}}(t)\|^2 dt < 4.20\text{ m/s}^3$.
   - **ORCA 3D**: Formulated as reciprocal 3D velocity obstacle half-planes $\mathbf{v}_i^{\text{new}} \in \bigcap_{j \neq i} H_{i|j}(\mathbf{v}_j, \tau)$, adding static penetration push $\vec{u} = \hat{n} \cdot v_{\text{push}} - \vec{v}_{\text{rel}}$ when distance $d < 2.80\text{m}$.
   - **Safety Shield (CBF)**: Control Barrier Function quadratic program enforcing $\dot{h}(\vec{x}) + \gamma h(\vec{x}) \ge 0$ where $h(\vec{x}) = \|\vec{p}_i - \vec{p}_j\|^2 - R_{\min}^2$.
   - **PX4 Flight Control**: MicroXRCE-DDS streaming `TrajectorySetpoint` at 50Hz, converting ENU (ROS 2) $\leftrightarrow$ NED (PX4) frames, injecting VIO odometry into PX4 EKF2.

2. **Subsystem B (`sutra_comms`)**:
   - **Deep JSCC Autoencoder**: Differentiable joint source-channel coding optimizing $\mathcal{L} = \|\mathbf{x} - \hat{\mathbf{x}}\|^2 + \beta \mathcal{R}$. Channel SNR modeled with AWGN and Rayleigh fading. Achieves $96.9\%$ compression ($512\text{KB} \to 16\text{KB}$) with analog graceful degradation surviving $-5\text{ dB}$ jamming ($\ge 41.5\text{ dB}$ PSNR).
   - **SwarmRAFT Distributed Consensus**: Raft leader election with randomized heartbeat timeouts ($150\text{ms}–300\text{ms}$), achieving failover $<500\text{ms}$ upon leader node crash or RF partitioning.
   - **Mesh Routing**: 802.11s ad-hoc mesh networking using HWMP protocol over UDP multicast.

3. **Subsystem C (`sutra_perception`)**:
   - **Detector**: YOLOv8-Nano TensorRT FP16 engine running at $<5.0\text{ms}$ latency.
   - **Multi-Object Tracking**: ByteTrack associating high- and low-score detection bounding boxes via Kalman filter state vectors $\mathbf{x} = [u, v, s, r, \dot{u}, \dot{v}, \dot{s}]^T$ and Hungarian matching with IoU distance matrix.
   - **WGS84 DEM Raycasting**: Intersecting 3D camera ray $\vec{r}_{\text{world}} = \mathbf{R}_b^w \mathbf{R}_c^b \mathbf{K}^{-1} [u, v, 1]^T$ with terrain elevation model $Z(X, Y)$ to achieve $<0.32\text{m}$ target geolocation error at 30m AGL under $\pm 25^\circ$ gimbal tilt.

4. **Subsystem D (`sutra_gcs`)**:
   - **High-Throughput Rendering**: React 18 frontend decoupled from high-frequency telemetry. WebSocket binary ArrayBuffers stream directly into WebGPU canvas draw buffers via `Float32Array` ring buffers, maintaining locked 60.0 FPS across 5 concurrent UAV streams.
   - **Emergency Control**: RTL dispatch message sent over low-latency binary WebSocket with $<10.0\text{ms}$ latency to execution.

5. **Subsystem E & F (`sutra_docs` & `sutra_ops`)**:
   - **Zero-Mock Verification**: 232/232 deterministic unit and integration tests with zero hardcoded/mock metrics.
   - **CONOPS & Unit Economics**: NDMA Kedarnath flood & Wayanad landslide search profiles; BOM breakdown at ₹42,850 per drone vs ₹15,00,000 for commercial defense UAVs.


