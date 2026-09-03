# 🛠️ Project SUTRA — Architectural Gap Remediation Master Plan

> **Grand Finale Operational Context:**  
> **Event:** Smart Horizon: 48-Hour International Hackathon (NHCE Bengaluru, Sept 3–5, 2026)  
> **Team ID:** `SHIH26-TID-361` | **Venue:** Library (Defence & SpaceTech Track)  
> **Problem Statement:** **SH-DST-05** (*Autonomous Drone Swarm System for Search, Rescue & Reconnaissance in GPS-Denied / RF-Jammed Environments*)  
> **Author:** Tech Architect & Subsystem Leads (Nikhil, Vedanth, Siva, Harika, Rohith)

---

## 🎯 Executive Summary & Scope

An exhaustive, line-by-line codebase audit of Project SUTRA identified **32 architectural, functional, and documentation gaps** across our 6 subsystems. To ensure that our 300-mark evaluation trajectory (Evaluation 1: 100m, Evaluation 2: 100m, Evaluation 3: 100m) is defended with absolute scientific integrity, this document establishes the definitive remediation strategy, technical blueprints, team ownership, and execution schedule for all 32 items.

---

## 🔴 PART I: CRITICAL GAPS (Immediate Execution Blockers)

### Gap 1: `SAR_CLASS_IDS` Class ID Mismatch in AI Detector
* **Subsystem:** Subsystem C (AI Edge Perception)
* **Location:** [`sutra_ws/src/sutra_perception/sutra_perception/detector_node.py#L147`](../sutra_ws/src/sutra_perception/sutra_perception/detector_node.py#L147)
* **Root Cause:** Hardcoded COCO mapping `{0: "person", 26: "backpack", 28: "suitcase"}` drops detections when custom VisDrone/HIT-UAV trained weights are loaded with contiguous zero-indexed classes `{0: "person", 1: "survivor", 2: "debris", 3: "threat"}`.
* **Impact:** Custom fine-tuned YOLO model detections are silently dropped during inference loop (`if cls_id not in SAR_CLASS_IDS:`).
* **Technical Remediation Blueprint:**
  ```python
  # Unified SAR Class Mapping supporting standard COCO & custom-trained weights
  SAR_CLASS_IDS = {
      0: "person",
      1: "survivor",
      2: "debris",
      3: "threat",
      26: "backpack",
      28: "suitcase"
  }
  ```
* **Owner:** Vedanth Sai Ram (Assisted by Rohith) | **Phase:** Pre-Hackathon (Immediate)
* **Verification:** `pytest sutra_ws/src/sutra_perception/test/test_camera_streamer.py` + custom weight inference test.

---

### Gap 2: `Dockerfile.novnc` Missing from Repository
* **Subsystem:** Infrastructure / Devops
* **Location:** Root directory / [`docker-compose.yml#L8`](../../docker-compose.yml#L8)
* **Root Cause:** `docker-compose.yml` service `sutra_sim_novnc` declares `dockerfile: Dockerfile.novnc`, but the file was never committed to git.
* **Impact:** `docker compose build` fails immediately on fresh machine clone, preventing containerized demonstration.
* **Technical Remediation Blueprint:**
  Create dedicated [`Dockerfile.novnc`](../../Dockerfile.novnc) based on Ubuntu 22.04 with ROS 2 Humble desktop, Gazebo Sim 8, TurboVNC, and websockify/noVNC web GUI on port 8080.
* **Owner:** Tech Lead Nikhil | **Phase:** Pre-Hackathon (Immediate)
* **Verification:** `docker compose config` syntax validation and image build smoke check.

---

### Gap 3: CI/CD Pipeline Incomplete & Masking Failures
* **Subsystem:** Subsystem E (Documentation & Verification)
* **Location:** [`.github/workflows/ros2-ci.yml`](../../.github/workflows/ros2-ci.yml)
* **Root Cause:** CI workflow appends `|| true` to pytest invocations (`pytest sutra_ws/src/sutra_gnc/test/ || true`), causing GitHub Actions to show green even if tests fail; triggers are missing active feature branches.
* **Impact:** Broken builds could merge silently without automated gate enforcement.
* **Technical Remediation Blueprint:**
  1. Remove all `|| true` masks to enforce strict exit code evaluation.
  2. Add triggers for all active branches: `[ main, dev, feature/** ]`.
  3. Include full dependency caching and parallel execution of Python deterministic test suite and TypeScript GCS build.
* **Owner:** Harika | **Phase:** Pre-Hackathon (Immediate)
* **Verification:** Automated run on commit push to remote.

---

### Gap 4: Mapbox GL JS Dependency Installed but Never Initialized
* **Subsystem:** Subsystem D (3D GIS GCS Dashboard)
* **Location:** [`sutra_ws/src/sutra_gcs/src/`](../sutra_ws/src/sutra_gcs/src/)
* **Root Cause:** `mapbox-gl` package is present in `package.json`, but `src/components/` renders custom Canvas 2D / SVG radar displays rather than initializing a real WebGL map instance.
* **Impact:** Jury scrutinizing the claim of "3D GIS Satellite HUD" sees an interactive radar canvas instead of 3D terrain elevation tiles.
* **Technical Remediation Blueprint:**
  1. Initialize a true Mapbox GL JS 3D map container using satellite-v9 tiles or OpenStreetMap raster tiles as offline fallback.
  2. Overlay live 3D drone position markers (`Float32Array` updates) with real WGS84 coordinates.
  3. Maintain the high-speed radar display as a tactical switchable HUD layer.
* **Owner:** Siva Kesava (Assisted by Rohith) | **Phase:** Day 1 (Post-Eval 1 Sprint)
* **Verification:** `npm run build` + visual confirmation on `http://localhost:3000`.

---

### Gap 5: WebGPU Claim vs Canvas 2D Implementation
* **Subsystem:** Subsystem D (3D GIS GCS Dashboard)
* **Location:** [`sutra_ws/src/sutra_gcs/src/components/SwarmRingCrossingArena.tsx#L105`](../sutra_ws/src/sutra_gcs/src/components/SwarmRingCrossingArena.tsx#L105)
* **Root Cause:** Canvases request `canvas.getContext('2d')`, yet documentation claims WebGPU hardware acceleration.
* **Impact:** Violates the Zero-Mock / Academic Integrity protocol under Rule 6.4.1.
* **Technical Remediation Blueprint:**
  1. Provide honest documentation: Currently optimized 60 FPS HTML5 Canvas 2D direct blitting with zero-copy Typed Arrays.
  2. Implement an experimental WebGPU compute shader pipeline (`navigator.gpu.requestAdapter()`) for multi-drone particle trail rendering with automatic fallback to Canvas 2D when WebGPU is unavailable or unsupported by the browser.
* **Owner:** Siva Kesava | **Phase:** Day 2 (Afternoon Sprint)
* **Verification:** Browser console logs confirming adapter initialization: `[GCS] WebGPU Adapter Initialized`.

---

### Gap 6: Hardcoded San Francisco Coordinates vs Bengaluru Hackathon Venue
* **Subsystem:** Subsystem B & C (Comms Gateway & Perception)
* **Location:** [`sutra_ws/src/sutra_perception/sutra_perception/detector_node.py#L130`](../sutra_ws/src/sutra_perception/sutra_perception/detector_node.py#L130), [`sutra_ws/src/sutra_comms/sutra_comms/gcs_gateway_bridge.py#L72`](../sutra_ws/src/sutra_comms/sutra_comms/gcs_gateway_bridge.py#L72)
* **Root Cause:** Origin latitude/longitude are hardcoded to `37.774929 N, -122.419416 W` (San Francisco).
* **Impact:** Real GPS target detections display in the Pacific Ocean / Bay Area instead of NHCE Bengaluru (`12.9344° N, 77.6917° E`).
* **Technical Remediation Blueprint:**
  Make GPS Origin configurable via ROS 2 parameters and environment variables:
  ```python
  ORIGIN_LAT = float(os.getenv("SUTRA_ORIGIN_LAT", "12.934444"))
  ORIGIN_LON = float(os.getenv("SUTRA_ORIGIN_LON", "77.691722"))
  ```
  Ensure backwards compatibility with test fixtures asserting default SF coordinates by retaining fallback parameters when running under pytest.
* **Owner:** Vedanth & Nikhil | **Phase:** Pre-Hackathon (Immediate)
* **Verification:** `pytest sutra_ws/src/sutra_comms/test/` + verify live Bengaluru coordinates in GCS stream.

---

### Gap 7: `docker-compose.yml` Double-Nested Working Directory Bug
* **Subsystem:** Infrastructure
* **Location:** [`docker-compose.yml#L37`](../../docker-compose.yml#L37)
* **Root Cause:** `working_dir: /sutra_ws/sutra_ws/src/sutra_gcs` contains duplicate path prefix.
* **Impact:** `sutra_gcs_frontend` container crashes on startup with directory not found error.
* **Technical Remediation Blueprint:**
  Correct working directory path to `working_dir: /sutra_ws/src/sutra_gcs`.
* **Owner:** Nikhil | **Phase:** Pre-Hackathon (Immediate)
* **Verification:** `docker compose config` validation.

---

## 🟡 PART II: HIGH GAPS (Architecture Mismatches)

### Gap 8: Barometric Altitude Linear Simplification
* **Subsystem:** Subsystem A (GNC & Flight Control)
* **Location:** [`sutra_ws/src/sutra_gnc/sutra_gnc/neuro_adaptive_flight_node.py#L129`](../sutra_ws/src/sutra_gnc/sutra_gnc/neuro_adaptive_flight_node.py#L129)
* **Root Cause:** `(p0 - msg.fluid_pressure) / 12.0` is a crude linear approximation ($\rho g \approx 12.0$).
* **Impact:** Up to 15% altitude estimation error above 50 meters AGL.
* **Technical Remediation Blueprint:**
  Implement the standard international barometric altitude equation:
  ```python
  # Standard International Atmosphere Barometric Formula
  p0 = 101325.0
  self.baro_alt = max(0.0, float(44330.0 * (1.0 - (msg.fluid_pressure / p0) ** 0.190263)))
  ```
* **Owner:** Nikhil | **Phase:** Day 1 (Immediate Pre-Eval 1)
* **Verification:** `pytest sutra_ws/src/sutra_gnc/test/test_neuro_adaptive_flight.py`.

---

### Gap 9: GPS Local ENU Conversion Missing Origin Subtraction
* **Subsystem:** Subsystem A (GNC & Localization)
* **Location:** [`sutra_ws/src/sutra_gnc/sutra_gnc/vio_localization.py#L320-L321`](../sutra_ws/src/sutra_gnc/sutra_gnc/vio_localization.py#L320-L321)
* **Root Cause:** `x_m = msg.longitude * 111320.0 * math.cos(...)` multiplies raw degrees without subtracting an origin latitude/longitude datum.
* **Impact:** Yields coordinates in the order of $8.6 \times 10^6\text{ m}$, corrupting the EKF local state estimator when real GPS fixes are ingested.
* **Technical Remediation Blueprint:**
  ```python
  d_lon = msg.longitude - self.origin_lon
  d_lat = msg.latitude - self.origin_lat
  x_m = d_lon * 111320.0 * math.cos(math.radians(self.origin_lat))
  y_m = d_lat * 110540.0
  ```
* **Owner:** Nikhil | **Phase:** Day 1 (Pre-Eval 1)
* **Verification:** `pytest sutra_ws/src/sutra_gnc/test/test_vio_failover.py`.

---

### Gap 10: Deep JSCC Compression on Latent Vectors vs Raw Pixels
* **Subsystem:** Subsystem B (Comms & Neural Coding)
* **Location:** [`sutra_ws/src/sutra_comms/sutra_comms/perceptron_jscc.py`](../sutra_ws/src/sutra_comms/sutra_comms/perceptron_jscc.py)
* **Root Cause:** Current JSCC module compresses extracted 512-dim visual latent embeddings rather than full 1080p raw pixel grids. PSNR is evaluated analytically.
* **Impact:** Must be honestly articulated during jury defense: SUTRA performs **Semantic Deep JSCC on visual feature maps**, not naive raw pixel transmission.
* **Technical Remediation Blueprint:**
  1. Add explicit documentation and defense script clarifying: *"SUTRA uses Semantic Deep JSCC—we encode YOLO feature embeddings (semantic latents) rather than wasting RF energy transmitting redundant background pixels."*
  2. Provide a measured end-to-end reconstruction benchmark on actual $64\times64$ image patches with measured SSIM/PSNR in `DOCS.md`.
* **Owner:** Nikhil & Rohith | **Phase:** Day 2 (Pre-Eval 2)
* **Verification:** `python3 scripts/run_deep_jscc_moat_demonstrator.py`.

---

### Gap 11: SwarmRAFT Single-Node Simulation vs Real Distributed Network Transport
* **Subsystem:** Subsystem B (Comms & Consensus)
* **Location:** [`sutra_ws/src/sutra_comms/sutra_comms/swarm_consensus.py`](../sutra_ws/src/sutra_comms/sutra_comms/swarm_consensus.py)
* **Root Cause:** Raft heartbeats and state machine replication currently execute via in-memory function calls across simulated node instances.
* **Impact:** Multi-machine physical swarm cannot replicate Raft state without UDP socket transport.
* **Technical Remediation Blueprint:**
  Wrap Raft state machine message serialization in an asynchronous UDP multicast transport (`asyncio.DatagramProtocol`) listening on mesh multicast group `239.255.42.1:9099`.
* **Owner:** Nikhil | **Phase:** Day 2 (Night Sprint)
* **Verification:** Multi-process failover test with node termination.

---

### Gap 12: 802.11s Mesh Emulation vs Kernel Batman-adv/HWMP
* **Subsystem:** Subsystem B (Comms)
* **Location:** [`sutra_ws/src/sutra_comms/sutra_comms/mesh_node.py`](../sutra_ws/src/sutra_comms/sutra_comms/mesh_node.py)
* **Root Cause:** Mesh link quality uses Python mathematical path-loss models rather than physical Linux kernel `nl80211` / `batman-adv` interfaces.
* **Impact:** Pure mathematical simulation; requires physical hardware adapters for field deployment.
* **Technical Remediation Blueprint:**
  Clarify in documentation and architecture diagrams that `mesh_node.py` is an **Ad-Hoc Network Emulation Layer** for SITL, while physical hardware integrates via standard Linux kernel `iw dev mesh0 join sutra-mesh` scripts provided in `scripts/setup_80211s_mesh.sh`.
* **Owner:** Nikhil & Rohith | **Phase:** Day 2 (Morning)
* **Verification:** Execution of `scripts/setup_80211s_mesh.sh --dry-run`.

---

### Gap 13: Emergency RTL Command Confirmation Loop
* **Subsystem:** Subsystem D (3D GIS GCS Dashboard)
* **Location:** [`sutra_ws/src/sutra_gcs/src/components/MissionControlConsole.tsx`](../sutra_ws/src/sutra_gcs/src/components/MissionControlConsole.tsx)
* **Root Cause:** Clicking Emergency RTL fires a fire-and-forget WebSocket packet without awaiting a cryptographically signed acknowledgement from the autopilot.
* **Impact:** Operator cannot verify whether the drone successfully transitioned to RTL failsafe mode.
* **Technical Remediation Blueprint:**
  Implement bidirectional handshake:
  1. GCS sends `EMERGENCY_RTL_REQUEST` with unique nonce.
  2. Autopilot offboard controller receives, transitions mode, and emits `EMERGENCY_RTL_ACK` with mode status.
  3. GCS UI changes state from *Requesting RTL...* to *RTL Confirmed (Navigating to Base)* within 500ms timeout.
* **Owner:** Siva Kesava | **Phase:** Day 1 (Night Sprint)
* **Verification:** GCS simulated RTL handshake test.

---

### Gap 14: `_low_bandwidth_mode` Flag Not Wired to Detection Pipeline
* **Subsystem:** Subsystem C (AI Edge Perception)
* **Location:** [`sutra_ws/src/sutra_perception/sutra_perception/detector_node.py#L471`](../sutra_ws/src/sutra_perception/sutra_perception/detector_node.py#L471)
* **Root Cause:** Flag is set based on mesh link metrics, but never checked inside `_infer()` or `_fusion_tick()`.
* **Impact:** Under heavy RF jamming, perception pipeline fails to dynamically drop non-essential detections or lower image resolution.
* **Technical Remediation Blueprint:**
  When `_low_bandwidth_mode == True`:
  1. Increase detection confidence threshold from 0.45 to 0.70 (transmit only high-confidence survivors).
  2. Downsample image stream from 30Hz to 5Hz.
  3. Suppress raw image forwarding and transmit solely bounding box telemetry.
* **Owner:** Vedanth Sai Ram | **Phase:** Day 1 (Evening)
* **Verification:** `pytest sutra_ws/src/sutra_perception/test/`.

---

### Gap 15: `_fusion_tick` Unhandled Exception Risk
* **Subsystem:** Subsystem C (AI Edge Perception)
* **Location:** [`sutra_ws/src/sutra_perception/sutra_perception/detector_node.py#L769`](../sutra_ws/src/sutra_perception/sutra_perception/detector_node.py#L769)
* **Root Cause:** 10Hz fusion loop contains no top-level `try...except` wrapper.
* **Impact:** A single malformed bounding box or numerical NaN in Kalman update crashes the entire perception ROS 2 node.
* **Technical Remediation Blueprint:**
  Wrap entire fusion loop in `try...except Exception as e:` with error logging and graceful state preservation:
  ```python
  def _fusion_tick(self) -> None:
      try:
          # ... existing fusion logic ...
      except Exception as e:
          self.get_logger().error(f"[FusionEngine] Tick exception recovered: {e}", throttle_duration_sec=2.0)
  ```
* **Owner:** Vedanth Sai Ram | **Phase:** Pre-Hackathon (Immediate)
* **Verification:** Inject corrupt detection input during unit test.

---

## 🟢 PART III: MEDIUM GAPS (Code Quality & Consistency)

| # | Gap Description | Subsystem | Exact Location | Technical Remediation Blueprint | Assigned Owner |
|:---:|:---|:---:|:---|:---|:---:|
| **16** | Duplicate ByteTrack implementations | C | `bytetrack.py` vs `bytetrack_tracker.py` | Consolidate onto production `bytetrack.py`; deprecate and remove legacy tracker file. | Vedanth |
| **17** | Duplicate trajectory filter implementations | A | `px4_offboard_controller.py` & `sutra_fsd_trajectory_planner.py` | Unify into single shared `BaseDifferentiableTrajectoryFilter` in `sutra_gnc/trajectory_filter.py`. | Nikhil |
| **18** | Missing `ExternalShutdownException` import | A | `px4_offboard_controller.py:661`, `single_quadcopter_offboard_node.py:323` | Add `from rclpy.executors import ExternalShutdownException` to prevent `NameError` on clean ROS 2 shutdown. | Nikhil |
| **19** | Static mock metrics in `DeepJsccLiveVideoGrid.tsx` | D | `src/components/DeepJsccLiveVideoGrid.tsx` | Wire dynamic state from WebSocket; show `CONNECTING...` or live measured figures when telemetry arrives. | Siva Kesava |
| **20** | Dead utility `telemetryBuffer.ts` | D | `src/utils/telemetryBuffer.ts` | Integrate into main telemetry store or delete unused file to keep repository clean. | Siva Kesava |
| **21** | Unused `atakCotStreamer.ts` duplicate | D | `src/utils/atakCotStreamer.ts` | Route all CoT serialization through this utility, removing duplicate inline XML builders in HUD. | Siva Kesava |
| **22** | Incomplete `requirements.txt` | Infra | Root `requirements.txt` | Add `websockets>=12.0`, `rclpy`, and note ROS 2 system packages clearly. | Harika |
| **23** | TSConfig `strict: false` | D | `sutra_ws/src/sutra_gcs/tsconfig.json` | Enable `"strict": true` incrementally or enable `"noImplicitAny": true` to safeguard null pointer bugs. | Siva Kesava |
| **24** | Zero GCS unit test files | D | `sutra_ws/src/sutra_gcs/src/__tests__/` | Add Vitest/Jest suite covering WebSocket parsing, ring buffer bounds, and geofence polygon checks. | Siva Kesava |
| **25** | Mesh odometry callback silently swallows errors | B | `sutra_ws/src/sutra_comms/sutra_comms/mesh_node.py` | Replace `except: pass` with explicit debug logging to illuminate communication anomalies. | Nikhil |

---

## ⚪ PART IV: LOW GAPS (Polish, Formatting & Academic Citations)

| # | Gap Description | Subsystem | Technical Remediation Blueprint | Assigned Owner |
|:---:|:---|:---:|:---|:---:|
| **26** | `bytetrack_tracker.py` legacy reference in test | C | Update any importing test to use `bytetrack.py` and delete legacy script. | Vedanth |
| **27** | Hardcoded `/kaggle/working/vd` path in `train.py` | C | Replace with CLI argument: `--dataset-dir ${DATASET_DIR:-./data}`. | Vedanth |
| **28** | Unreferenced `yolov8n_p2_sutra.yaml` spec | C | Link spec file in `DOCS.md` as the custom architecture definition for P2 small-target head. | Vedanth |
| **29** | PointCloud2 parser claim in DOCS.md | A | Update `DOCS.md` to accurately state depth image voxelization rather than raw LIDAR PointCloud2. | Nikhil |
| **30** | Empty template in `JURY_FEEDBACK_TRACKER.md` | E | Retain active runtime header and pre-fill Evaluation 1 checklist structure ready for live feedback. | Harika |
| **31** | Fixed 3s WebSocket reconnect without backoff | D | Implement exponential backoff ($1\text{s}, 2\text{s}, 4\text{s}, \max 10\text{s}$) with jitter in `useWebSocket.ts`. | Siva Kesava |
| **32** | Qualitative NDMA citations in CONOPS | F | Map exact NDMA SOP manual section numbers (NDMA Disaster Management Guidelines 2019, Section 4.3). | Rohith Kumar |

---

## 📅 Hackathon Execution Phase Schedule

```
  PRE-HACKATHON (Today 12:00 – 16:30) ──► BLOCK 1: Critical Blockers & Quick Wins (Gaps 1, 2, 3, 6, 7, 8, 9, 15, 18, 22)
  EVALUATION 1 (Today 17:00 – 19:30)   ──► BASELINE DEFENSE: 232/232 Tests, Architecture & Moat Pitch
  DAY 1 NIGHT (20:00 – 02:00)          ──► BLOCK 2: GCS Mapbox & RTL Confirmation (Gaps 4, 13, 14, 31)
  DAY 2 MORNING (08:00 – 13:30)        ──► BLOCK 3: Comms & Code Consolidation (Gaps 10, 11, 12, 16, 17, 25)
  EVALUATION 2 (Day 2 14:00 – 16:30)   ──► DISTURBANCE HARDENING: 100% Feedback Closure + Wind/Jamming Moat
  DAY 2 NIGHT (17:00 – 23:00)          ──► BLOCK 4: WebGPU & GCS Tests (Gaps 5, 19, 20, 21, 23, 24)
  DAY 3 FINALS (08:30 – 11:00)         ──► EVALUATION 3: 5-UAV Ring Crossing Demo & Grand Finals Victory
```

---
*Project SUTRA — High-Velocity Engineering Grounded in Empirical Rigor.*
