# 🔬 Subsystem A — Complete Audit & Skill-Driven Implementation Plan

> **Audit date:** 2026-08-09 · **Method:** full source review (13 modules + C++ node + launch files), live `pytest` run, cross-check against GNC deep research + skill arsenal.
> **Test baseline:** `58 passed in 0.53s` (live run, this audit).
> **Skills governed by:** `SUTRA_Skills_Context_Governance.md` (one skill per task phase; no context flooding).

---

## 1. Audit Results (severity-ranked)

### 🔴 CRITICAL — integration seams broken in the real ROS 2 flow

| # | Finding | Evidence | Impact |
|---|---|---|---|
| C1 | **VIO status topic namespace mismatch** — `vio_localization.py` publishes `/sutra/gnc/vio_status` (no drone_id) but `offboard_node.py` subscribes to `/sutra/gnc/{drone_id}/vio_status` | vio_localization.py:154 vs offboard_node.py:123 | VIO failsafe (LOST → emergency landing) **never fires** in a namespaced multi-drone deployment |
| C2 | **ORCA never activates** — `peer_drones` list is never populated by any subscription/callback in the ROS node | offboard_node.py:99,248 (only set in `__init__`) | Gate G5 avoidance is dead code in live flight; tests pass only because they set peers directly |
| C3 | **`orca_avoidance.py` has no ROS node** (`main`/Node class absent) yet `sutra_gnc_subsystem_a.launch.py:44-50` launches it as an executable | orca_avoidance.py (98 lines, no main) | Master launch fails at runtime: `No executable found` |
| C4 | **OctoMap node subscribes to hardcoded `/uav_alpha/depth_camera/points` and non-namespaced `/sutra/gnc/pose_stamped`** — subsystem_a launch applies no remaps | octomap_generator.py:270-280, launch:37-42 | OctoMap receives no point clouds / no pose in the swarm launch |
| C5 | **C++ node (`offboard_node.cpp`) is 4 generations behind**: hardcoded `/uav_alpha/*` topics, no drone_id param, no VIO subscription, no ORCA, no closed-loop pose feedback (dead-reckons internally), heartbeat "failsafe" measures loop delay (always < 0.1 s since it stamps every 50 Hz call) | offboard_node.cpp:45-52,132-139 | The "50Hz C++" flagship node is a demo stub vs the Python node |

### 🟠 HIGH — gaps vs. implemented research upgrades

| # | Finding | Evidence | Impact |
|---|---|---|---|
| H1 | **NMPC disturbance/wind rejection is never driven** — `update_disturbance_estimate()` is not called anywhere in the control loop; APACE `update_density()` likewise never called → feature map stays at defaults | trajectory_nmpc.py:202, apace_feature_cost.py:106 (no callers) | Wind compensation & perception-aware steering are inert |
| H2 | **SwarmFrameSolver / CILC security are library-only** — no ROS node subscribes to per-drone VIO poses or range measurements; `export_swarm_frame_json` has no topic | swarm_frame.py:152, cilc_security.py (no ROS) | CoVOR-SLAM Phase-2 research is not operational |
| H3 | **SemanticOctoMap not wired** — no `/sutra/perception/detections` subscriber exists anywhere in sutra_gnc | semantic_octomap.py (no Node class) | Semantic labels (NDMA categories) never enter the map |
| H4 | **C++ node waypoints/topics diverge from Python node** — two competing implementations of the same role | offboard_node.cpp vs offboard_node.py | Maintenance hazard; which one runs in SITL? |
| H5 | **`safety_buffer_m` parameter wiring mismatch in Python node** — `SutraOffboardControlNode.__init__` declares params on a non-Node class (dead code, lines 106-125), while the ROS subclass re-declares | offboard_node.py:106-125 vs 274-280 | Confusing; duplicate parameter paths |

### 🟡 MEDIUM — packaging, docs, robustness

| # | Finding | Evidence | Impact |
|---|---|---|---|
| M1 | **DOCS.md is stale** — claims "25/25 tests", lists 4 modules; actual: 58 tests, 13 modules. Violates AGENTS.md Mandatory DOCS.md Sync Protocol | DOCS.md vs commit 2a37949 | Team-wide confusion on Subsystem A status |
| M2 | CMakeLists installs only 4 of 13 modules as programs; new modules ride on `ament_python_install_package` — works but undocumented | CMakeLists.txt:13-21 | Fragile if package.xml switches build type |
| M3 | OctoMap JSON/Marker publishes full voxel list with `[:500]` truncation and re-runs full downsample on every point cloud (~25k points → O(n²) narrow-passage pair scan worst case) | octomap_generator.py:357-367, octomap_downsampler.py:78-99 | Potential 50 Hz jitter (test shows 19 ms burst cost; integration risk) |
| M4 | `LandingRiskMap._pos_to_cell` uses raw world coords — no coordinate-frame convention documented (NED vs ENU) | emergency_landing.py:168 | Silent frame bug risk when Subsystem C feeds GPS/raycast positions |
| M5 | Heartbeat/failsafe logic in Python node: `last_heartbeat` only updated by pose feedback — in sim-without-pose-feedback the RTL would trigger immediately | offboard_node.py:158-171,301-315 | Misconfigured default → spurious RTL at mission start |

### 🟢 VERIFIED HEALTHY (keep as-is)

- 58/58 unit tests pass (0.53 s) covering all 13 modules including stress test (25k point burst).
- VIO factor-graph adapter properly wraps covariance filter (drop-in API preserved).
- Emergency landing FSM has clean 4-state design + risk map with conservative max-risk merging.
- NMPC quintic minimum-snap closed-form with LinAlgError fallback; obstacle repulsion + v_max/a_max clamps.
- CILC HMAC-SHA256 signing with canonical JSON + constant-time compare + trust scoring.
- ORCA reciprocal split + deadlock repulsion perturbation implemented and tested.
- `git status` clean; audit produced no code changes.

---

## 2. Implementation Plan (work packages mapped to skills)

Each work package: **one skill at a time** (governance rule), verification command, target gate.

### WP-1 🔴 Fix multi-drone topic namespace + VIO failsafe wiring
- **Skill:** `sutra-ros2-node-patterns` (topic-pub-sub, namespaces) → one load
- **Actions:**
  1. Parameterize `vio_localization.py`: add `drone_id` param; publish `/sutra/gnc/{drone_id}/vio_status`, `/sutra/gnc/{drone_id}/vio_filtered_odom`, `/fmu/in/{drone_id}/vehicle_visual_odometry`.
  2. OctoMap node: subscribe `/sutra/gnc/{drone_id}/pose_stamped` + `/sutra/gnc/{drone_id}/depth_camera/points`.
  3. Launch file: pass `drone_id` to all three nodes; single place of truth.
  4. New integration test: two in-process nodes on namespaced topics assert delivery (no rclpy needed — use plain pub/sub socket test or pytest-ros).
- **Verify:** `pytest sutra_ws/src/sutra_gnc/test/` (baseline + new tests); `ros2 topic list` in SITL shows namespaced topics.

### WP-2 🔴 Make ORCA live — peer drone streaming + ORCA node
- **Skill:** `sutra-orca-avoidance` → one load
- **Actions:**
  1. Add `/sutra/gnc/{drone_id}/peer_states` publisher in offboard node (position+velocity of self, 10 Hz).
  2. Offboard node subscribes to all other drones' `peer_states`, feeds `self.peer_drones` (filter self by agent_id).
  3. Either give `orca_avoidance.py` a real ROS Node entry point (solver server) or remove it from the launch (solver runs in-process — preferred, matches current architecture).
- **Verify:** Gate G5 unit tests + new integration test: 2 drones crossing with live peer streams, min clearance ≥ 2.8 m.

### WP-3 🟠 Activate NMPC + APACE closed loop
- **Skill:** `sutra-nmpc-trajectory` → one load
- **Actions:**
  1. In `_control_loop`/`compute_control_step`: call `nmpc.update_disturbance_estimate(expected, actual_vel)` every 50 Hz tick (actual from pose feedback derivative).
  2. Call `apace.update_density(state_xyz, vio_quality)` in the VIO status callback.
  3. Feed `occupied_voxels` from OctoMap grid into `nmpc.plan()` (subscribe `/sutra/gnc/{drone_id}/octomap_voxels`).
- **Verify:** new unit test asserting disturbance estimate converges on simulated wind; SITL test with wind param in Gazebo.

### WP-4 🟠 Swarm frame + CILC operational ROS layer
- **Skill:** `sutra-swarm-frame` → one load
- **Actions:**
  1. New `swarm_node.py`: subscribes to all `/sutra/gnc/*/pose` (local VIO poses) + `/sutra/gnc/ranges` (UWB/range stream, mocked in sim via `simulate_gazebo_ranges`), runs `SwarmFrameSolver.solve_swarm_frame()`, publishes `/sutra/gnc/swarm_frame` JSON.
  2. Sign swarm frame payloads with `CILCVerifier`; verifier enabled flag (sim vs field).
  3. Offboard node consumes corrected pose for its own position when VIO degraded (status 2).
- **Verify:** new unit tests for solver convergence (residuals < 0.1 m); SITL 5-drone with mocked ranges.

### WP-5 🟠 Semantic OctoMap wiring
- **Skill:** `sutra-octomap` → one load
- **Actions:**
  1. Subscriber in octomap node for `/sutra/perception/detections` (JSON String) → `SemanticOctoMap.update_from_detection_stream`.
  2. Extend `OctoMapGeneratorNode` to hold a `SemanticOctoMap` (subclass already exists) — swap `voxel_grid` type.
  3. Publish `/sutra/gnc/{drone_id}/semantic_voxels` (export_semantic_json) for Subsystem D HUD.
- **Verify:** unit test: detection stream labels voxels; SITL: inject fake detections, assert JSON.

### WP-6 🟠 Rebuild C++ offboard node to parity
- **Skill:** `sutra-ros2-node-patterns` (or cpp-node-boilerplate from pack) → one load
- **Actions:**
  1. Parameterize drone_id (topics + namespacing), read params like Python node.
  2. Subscribe pose feedback (closed-loop), VIO status → same failsafe FSM semantics.
  3. Remove self-stamping heartbeat (use a real link-loss timer vs last pose receipt).
  4. Add ORCA in C++ or delegate: keep ORCA in Python, publish peer_states for C++ node consumption.
- **Verify:** `colcon build --packages-select sutra_gnc`; SITL run with C++ node flag in launch.

### WP-7 🟡 Packaging, launch hygiene, DOCS.md sync
- **Skill:** `sutra-gazebo-sim` → one load
- **Actions:**
  1. Single master launch with `drone_id`, `sim_mode` (Gazebo twist vs PX4 setpoint), `use_cpp_node` switches; remove dead ORCA executable entry (WP-2).
  2. CMakeLists: declare entry points for new nodes (swarm_node etc.); add ament_lint targets.
  3. **Update DOCS.md**: 58/58 badge, 13-module dependency tree, benchmark table with live values from this audit's pytest run + SITL numbers when available. Mandatory per AGENTS.md.
- **Verify:** `colcon build` clean; launch file dry-run; DOCS.md updated.

### WP-8 🟢 Hardening & perf (optional, next sprint)
- **Skill:** `sutra-octomap` → one load
- **Actions:**
  1. OctoMap marker publish rate throttle (1 Hz) + dirty-flag JSON (only publish deltas).
  2. Downsampler: spatial-hash neighborhood cache to kill O(n²) pair scan.
  3. Coordinate-frame constants module (`sutra_gnc/frames.py`): NED/ENU conversion with unit tests — fixes M4 permanently.

---

## 3. Sequencing & Gates

| Sprint | WPs | Exit gate (measured, live) |
|---|---|---|
| Sprint 1 (this sprint) | WP-1, WP-2, WP-7-docs | All unit tests ≥ 58 pass; topic namespace verified via `ros2 topic list`; DOCS.md reflects reality |
| Sprint 2 | WP-3, WP-4 | Wind-rejection unit test; swarm frame residuals < 0.1 m; SITL 5-drone run |
| Sprint 3 | WP-5, WP-6 | Semantic voxel stream live; C++ node SITL parity run |
| Sprint 4 (optional) | WP-8 | OctoMap burst latency < 10 ms; clearance ≥ 2.8 m maintained |

> Per AGENTS.md ABSOLUTE RULE: every gate above must be evidenced with live terminal output (pytest summary lines, `ros2 topic hz`, Gazebo stats). No projected numbers.

---

## 4. Skill Usage Discipline (binding)

- Load ONE skill per WP (named in each WP above). Apply it, then drop it from context.
- Do not read the 209-pack wholesale; reference single files under `.firecrawl/skills-research/downloaded/community/ros2-copilot-skills/<name>/SKILL.md` only when the WP names it.
- Subagent for any pack-wide research (context isolation per governance doc §6).
