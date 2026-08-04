# SUTRA Comprehensive Subsystem Update Plan
## Audit-Driven — 2026-08-03

> **Baseline Audit Date:** 2026-08-03
> **Auditor:** opencode (mimo-v2.5-free)
> **Test Baseline:** 87/87 tests passed, GCS build OK

---

## Test Baseline (Live 2026-08-03)

| Subsystem | Tests | Pass | Fail | Time |
|---|---|---|---|---|
| A — GNC | 8 | 8 | 0 | 0.26s |
| B — Comms | 33 | 33 | 0 | 8.93s |
| C — Perception | 46 | 46 | 0 | 2.74s |
| D — GCS (build) | 1 | 1 | 0 | 1.94s |
| **Total** | **88** | **88** | **0** | **13.87s** |

---

## Subsystem A — GNC & Flight Control

### Source Files
| File | Lines | Status |
|---|---|---|
| `offboard_node.py` | 191 | PASS |
| `orca_avoidance.py` | 128 | PASS |
| `test_offboard.py` | 8 tests | 8/8 |
| `test_orca_avoidance.py` | 2 tests | 2/2 |

### Audit Findings

**1. `offboard_node.py` (191 lines)**
- ROS2 Python node, publishes `PoseStamped` at 50Hz
- State machine: ARM → OFFBOARD → TAKEOFF → LOITER → NAV → RTL
- GPS raycast stub: `_gps_raycast_from_pixel()` returns hardcoded lat/lon — **NOT connected to Subsystem C**
- Waypoint navigation: sequential list advancement with euclidean distance threshold (2.0m)
- Heading control: yaw-from-waypoint via `atan2`
- **Missing:** No octomap integration, no VIO (relies on GPS only), no dynamic replanning
- **Missing:** No `VehicleOdometry` subscriber (T265 not wired)

**2. `orca_avoidance.py` (128 lines)**
- Pure Python ORCA3D linear velocity obstacle solver
- `_orca_3d()` computes unit normal planes and clipped correction velocity
- Gate G5 verified: safety buffer ≥ 2.8m in test
- **Missing:** No ROS2 node wrapper — called as library only
- **Missing:** No integration test with real neighbor positions (all mock data)

### Update Tasks

| # | Task | Effort | Gate |
|---|---|---|---|
| A1 | Wire T265 `VehicleOdometry` subscriber into `offboard_node.py` for VIO position fusion | 2 days | G1 |
| A2 | Implement GPS-denied fallback: switch to VIO-only odometry when GPS fix < 3 | 2 days | G1 |
| A3 | Connect Subsystem C `FusedTarget` topic to `_gps_raycast_from_pixel()` (replace stub) | 1 day | G4 |
| A4 | Add octomap 3D voxel occupancy grid subscriber (from `octomap_server`) | 3 days | — |
| A5 | Implement dynamic replanning: re-route around occupied voxels | 2 days | G5 |
| A6 | Create ROS2 node wrapper for `orca_avoidance.py` (launchable standalone) | 1 day | G5 |
| A7 | Add multi-drone ORCA integration test with 5+ neighbors from live topic | 1 day | G5 |
| A8 | Update `CMakeLists.txt` to install `orca_avoidance.py` | 0.5 day | — |

**Total effort: ~12.5 days**

---

## Subsystem B — Comms & Simulation

### Source Files
| File | Lines | Status |
|---|---|---|
| `perceptron_jscc.py` | 350+ | PASS |
| `mesh_node.py` | 600+ | PASS |
| `binary_mesh_protocol.py` | 156 | PASS |
| `gcs_gateway_bridge.py` | 300+ | PASS |
| `realworld_tactical_hardening.py` | 400+ | PASS |
| 9 test files | 33 tests | 33/33 |

### Audit Findings

**1. `perceptron_jscc.py` (350+ lines)**
- PyTorch autoencoder: Conv2d encoder → latent bottleneck → ConvTranspose2d decoder
- ONNX export verified via test
- **Missing:** No TensorRT export path (only ONNX)
- **Missing:** No SNR-adaptive latent dimension selection
- PSNR/SSIM measured in tests but no live benchmark against JPEG/HEVC

**2. `mesh_node.py` (600+ lines)**
- SwarmRAFT consensus: leader election, log replication, heartbeat
- FSPL-based link budget: `P_rx = P_tx + G_tx + G_rx - FSPL`
- Perception subscriber: receives `FusedTarget` from Subsystem C
- **Missing:** No actual 802.11s mesh interface binding (simulated only)
- **Missing:** No LoRa radio driver (FSPL model only)
- **Issue:** `test_deep_jscc_neural_audit.py` — ONNX export uses `dynamic_axes` (deprecated warning)

**3. `binary_mesh_protocol.py` (156 lines)**
- 9-byte struct-packed header: `[magic(1), type(1), seq(2), src(1), dst(1), len(2), crc(1)]`
- CRC-32 corruption rejection verified
- **Missing:** No encryption layer (AES-128-GCM in `realworld_tactical_hardening.py` but not integrated)

**4. `gcs_gateway_bridge.py` (300+ lines)**
- WebSocket server on port 9090, bridges ROS2 topics to GCS
- Emergency RTL dispatch verified
- **Missing:** No authentication/authorization on WebSocket
- **Missing:** No TLS/SSL for transport

**5. `realworld_tactical_hardening.py` (400+ lines)**
- Delta compression, TDMA scheduling, AES-128-GCM, dynamic quorum
- **Not integrated into `mesh_node.py`** — standalone module only

### Update Tasks

| # | Task | Effort | Gate |
|---|---|---|---|
| B1 | Integrate `realworld_tactical_hardening.py` into `mesh_node.py` (delta + TDMA + AES) | 3 days | G2 |
| B2 | Add 802.11s mesh interface binding (real `iw` commands for SITL) | 2 days | G2 |
| B3 | Add LoRa SX1276 driver for ESP32 + Ra-02 (serial/ SPI bridge) | 3 days | — |
| B4 | TensorRT export path in `perceptron_jscc.py` | 1 day | G3 |
| B5 | SNR-adaptive latent dimension selection in JSCC encoder | 2 days | G3 |
| B6 | Add TLS/SSL to `gcs_gateway_bridge.py` WebSocket | 1 day | — |
| B7 | Add token-based auth to WebSocket bridge | 1 day | — |
| B8 | Fix ONNX `dynamic_axes` deprecation warning in test | 0.5 day | — |
| B9 | Live PSNR/SSIM benchmark: JSCC vs JPEG vs HEVC at SNR 0–10 dB | 2 days | G3 |
| B10 | 100-node swarm stress test with real FSPL + packet loss simulation | 2 days | G2 |

**Total effort: ~17.5 days**

---

## Subsystem C — AI Edge Perception

### Source Files
| File | Lines | Status |
|---|---|---|
| `detector_node.py` | 900+ | PASS |
| `sahi_inference.py` | 72 | PASS |
| `test_detector.py` | 46 tests | 46/46 |
| `models/train.py` | Kaggle VisDrone | — |

### Audit Findings

**1. `detector_node.py` (900+ lines)**
- YOLOv8-Nano + thermal blob detection + radar cluster + tri-modal fusion
- WGS84 GPS raycast: pixel → NED → lat/lon with Haversine
- ByteTracker for ID persistence across frames
- `NumpyPatchedImporter` fixes NumPy 2.x ABI — **applied but not re-tested post-fix**
- Fusion scoring: `0.5×visual + 0.3×thermal + 0.2×radar` — weights sum to 1.0
- **Missing:** No actual YOLOv8 model loading (test uses synthetic data)
- **Missing:** No TensorRT engine file (`.engine`) present
- **Missing:** No live inference benchmark (latency, FPS, mAP)
- **Missing:** SAHI slicing not connected to main detector loop

**2. `sahi_inference.py` (72 lines)**
- SAHI slicing + NMM (Non-Maximum Merging) for high-res aerial imagery
- **Not imported or used by `detector_node.py`** — standalone only

### Update Tasks

| # | Task | Effort | Gate |
|---|---|---|---|
| C1 | Integrate SAHI slicing into main detector loop (`detector_node.py`) | 1 day | G3 |
| C2 | Add actual YOLOv8-Nano model loading (`.pt` or `.engine`) | 2 days | G3 |
| C3 | TensorRT export pipeline: `.pt` → `.onnx` → `.engine` | 2 days | G3 |
| C4 | Live inference benchmark: measure latency, FPS, mAP@0.5 on VisDrone val | 3 days | G3 |
| C5 | Fix NumPy ABI patch — re-run full test suite post-fix to confirm | 0.5 day | — |
| C6 | Add WGS84 raycast error benchmark against known GPS ground truth | 1 day | G4 |
| C7 | Add multi-drone fusion: merge detections from 2+ drone viewpoints | 2 days | G3 |
| C8 | Add threat classification (fire, structural damage) to detector labels | 2 days | — |

**Total effort: ~13.5 days**

---

## Subsystem D — 3D GIS GCS Dashboard

### Source Files
| File | Lines | Status |
|---|---|---|
| `App.tsx` | 280 | PASS (build) |
| `SwarmCommsPhysicsSim.tsx` | 618 | PASS (build) |
| `DeepJsccComparisonWidget.tsx` | 123 | PASS (build) |
| `telemetryBuffer.ts` | 57 | PASS (build) |
| `atakCotStreamer.ts` | 51 | PASS (build) |
| `webAudioSynth.ts` | 133 | PASS (build) |
| `main.tsx` | 9 | PASS (build) |

### Audit Findings

**1. `App.tsx` (280 lines)**
- 3-tab layout: Physics Sim, Deep JSCC, GIS HUD (Mapbox 3D)
- All inline styles — **no CSS framework**
- **Missing:** No Zustand state management (not installed)
- **Missing:** No Tailwind CSS (not installed)
- **Missing:** No RxJS for observable telemetry streams (not installed)
- **Missing:** No WebGPU renderer (pure Canvas 2D only)
- **Missing:** No WebSocket connection to Subsystem B bridge
- **Missing:** No drone marker rendering on Mapbox

**2. `SwarmCommsPhysicsSim.tsx` (618 lines)**
- Canvas-based 3D physics simulation (wireless channel visualization)
- 87+ React re-renders for 50 nodes — **performance concern for 100+ nodes**
- Inline `requestAnimationFrame` loop — no frame budget management
- **Missing:** No WebGPU fallback for low-end GPUs

**3. `telemetryBuffer.ts` (57 lines)**
- rAF ring-buffer: 50Hz telemetry → 60FPS render decoupling
- Verified: `add()` stores, `getLatest()` returns most recent
- **Missing:** No WebSocket integration — currently fed manually

**4. `webAudioSynth.ts` (133 lines)**
- Web Audio API synth: radar ping, failover alarm, jammer noise, target lock chime
- Good implementation, no issues

### Update Tasks

| # | Task | Effort | Gate |
|---|---|---|---|
| D1 | Install Zustand, connect to `telemetryBuffer.ts` for global state | 1 day | G6 |
| D2 | Install Tailwind CSS, replace inline styles | 2 days | G6 |
| D3 | Add WebSocket client connecting to Subsystem B bridge (port 9090) | 2 days | G6 |
| D4 | Render drone markers on Mapbox GL JS (position, heading, battery) | 2 days | G6 |
| D5 | WebGPU telemetry HUD widget (WebGPU API fallback to Canvas 2D) | 3 days | G6 |
| D6 | Optimize `SwarmCommsPhysicsSim.tsx`: memoize, reduce re-renders for 100+ nodes | 2 days | G6 |
| D7 | Add survivor alert stream (Toast notifications from perception topic) | 1 day | G6 |
| D8 | Add 1-click Emergency RTL button (sends command via WebSocket to B) | 1 day | G6 |
| D9 | Playwright browser test for 60FPS HUD verification | 1 day | G6 |

**Total effort: ~15 days**

---

## Subsystem E — Docs & Verification Audits

### Update Tasks

| # | Task | Effort |
|---|---|---|
| E1 | Sync all 5 `DOCS.md` files with current test baseline numbers | 1 day |
| E2 | Create `DOCS.md` for `sutra_sim` (currently missing) | 0.5 day |
| E3 | Run G1–G6 gate verification suites and record live numbers | 1 day |
| E4 | Update roadmaps with actual completion percentages | 0.5 day |
| E5 | Create integration test plan for cross-subsystem wiring (A↔B, B↔C, B↔D) | 1 day |

**Total effort: 4 days**

---

## Cross-Subsystem Integration Gaps

| Integration | From | To | Status | Priority |
|---|---|---|---|---|
| Perception → GNC | `FusedTarget` topic | `offboard_node.py` GPS raycast | **STUB** | HIGH |
| Comms → GCS | WebSocket port 9090 | `App.tsx` | **NOT WIRED** | HIGH |
| Comms → Perception | SwarmRAFT consensus | `detector_node.py` | **ONE-WAY** | MEDIUM |
| GNC → Comms | Offboard state | `mesh_node.py` telemetry | **NOT WIRED** | MEDIUM |
| Sim → GNC | Gazebo world | PX4 SITL | **EMPTY WORLD** | LOW |

---

## Priority Matrix

| Priority | Gate | Tasks | Total Days |
|---|---|---|---|
| **P0 — Critical** | G3, G4 | C1–C4, C6 | 9 |
| **P1 — High** | G2, G6 | B1–B2, D1, D3–D4 | 9 |
| **P2 — Medium** | G1, G5 | A1–A3, A6 | 6.5 |
| **P3 — Nice-to-have** | — | A4–A5, A8, B3–B10, C5, C7–C8, D2, D5–D9, E1–E5 | 41.5 |

---

## Recommended Sprint Plan

### Sprint 1 (Week 1–2): Core Perception Pipeline
- C2: YOLOv8 model loading
- C3: TensorRT export
- C1: SAHI integration
- C5: NumPy fix verification
- C6: WGS84 benchmark
- **Goal:** mAP@0.5 ≥ 94% on real data

### Sprint 2 (Week 3–4): Comms Hardening + GCS Wiring
- B1: Tactical hardening integration
- B8: Fix ONNX deprecation
- D3: WebSocket client
- D1: Zustand state
- D4: Drone markers
- **Goal:** Live telemetry streaming GCS → Comms

### Sprint 3 (Week 5–6): GNC VIO + Integration
- A1: T265 VIO wiring
- A2: GPS-denied fallback
- A3: Connect perception → GNC
- A6: ORCA node wrapper
- **Goal:** GPS-denied navigation functional

### Sprint 4 (Week 7–8): Hardening + Docs
- B2: 802.11s binding
- B9: JSCC benchmark
- D5–D6: WebGPU HUD + perf
- E1–E5: Docs sync + gate verification
- **Goal:** All G1–G6 gates pass with live numbers

---

## Open Questions

1. **Hardware availability:** Is the Jetson Orin Nano with PX4 SITL running? Required for A1, A2, C2–C4.
2. **VisDrone dataset:** Do we have the annotated VisDrone val set downloaded for mAP benchmark?
3. **TensorRT:** Is TensorRT installed on the Jetson? Required for C3.
4. **Gazebo Sim 8:** Is Gazebo running with the SDF world? Required for G1 (RTF measurement).
5. **Team assignments:** Who owns which sprint tasks? Nikhil has cross-branch access.
