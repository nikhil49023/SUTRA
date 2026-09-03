# ⚡ Project SUTRA — Grand Finale 48-Hour Master Sprint Plan & Gap Remediation Roadmap

> **Event:** Smart Horizon: 48-Hour International Hackathon Grand Finale (NHCE Bengaluru)  
> **Dates:** September 3 – 5, 2026 | **Team ID:** `SHIH26-TID-361` | **Track:** Defence & SpaceTech (Library)  
> **Problem Statement:** **SH-DST-05** (*Autonomous Drone Swarm System for Search, Rescue & Reconnaissance in GPS-Denied / RF-Jammed Environments*)  
> **Scoring Architecture:** **300 Total Marks** across 3 Evaluative Stages (Eval 1 @ 100m, Eval 2 @ 100m, Eval 3 @ 100m)  
> **Directive from Tech Architect (Nikhil):** Since every teammate is equipped with autonomous AI coding tools, there will be **zero idle time, zero uncommitted work, and maximum high-velocity output**. Every subsystem must systematically resolve its assigned items from the **32 Architectural Gaps** while delivering 100% on evaluation milestones.

---

## 🕒 Master 48-Hour Sprint Schedule & Gap Remediation Blocks

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DAY 1 (03-SEP): ARCHITECTURE BASELINE, CRITICAL GAP SUPPRESSION & EVALUATION 1 (100 MARKS)       │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 12:00 – 16:30 │ SPRINT BLOCK 1: Critical Blockers & Quick Wins (Gaps 1, 2, 3, 6, 7, 8, 9, 15, 18)│
│ 16:30 – 17:00 │ Pre-Flight Verification Gate: 232/232 Tests & Zero Git Diffs Check               │
│ 17:00 – 19:30 │ 🟢 EVALUATION 1 (100 MARKS): Architecture Defense, Live Tests, 5-UAV Flight Demo │
│ 20:00 – 02:00 │ SPRINT BLOCK 2: GCS Mapbox, RTL Confirmation & Night Sprint (Gaps 4, 13, 14, 31)│
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ DAY 2 (04-SEP): DISTURBANCE HARDENING, COMMS MOAT & EVALUATION 2 (100 MARKS)                     │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 08:00 – 13:30 │ SPRINT BLOCK 3: Comms Moat, Consensus & Refactoring (Gaps 10, 11, 12, 16, 17, 25)│
│ 13:30 – 14:00 │ Pre-Flight Verification Gate: 100% Closure of Eval 1 Jury Feedback (Rule 6.1)   │
│ 14:00 – 16:30 │ 🟡 EVALUATION 2 (100 MARKS): 18 m/s Wind Rejection, -5 dB Jamming, Motor Recovery│
│ 17:00 – 23:00 │ SPRINT BLOCK 4: WebGPU Shaders, GCS Test Suite & TS Strict Mode (Gaps 5, 19-24)  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ DAY 3 (05-SEP): GRAND FINALE DEMONSTRATION, UNIT ECONOMICS & VALEDICTORY (100 MARKS)            │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 06:00 – 08:15 │ SPRINT BLOCK 5: 5-UAV Ring Crossing Rehearsal, BOM Lock & Pitch Dry Runs         │
│ 08:30 – 11:00 │ 🔴 EVALUATION 3 (100 MARKS): Final Live Ring Crossing Demo, Geolocation & Pitch │
│ 11:00 – 16:00 │ Jury Deliberation & Academic Integrity Audit (Rule 6.4.1 Tool Transparency)      │
│ 16:00 – 18:00 │ Valedictory & Prize Distribution Ceremony                                        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 Subsystem Workload, Gap Assignments & Technical Invariants

### 1. ⚡ NIKHIL — Tech Architect & Subsystem A + B Lead (GNC, Comms & Sim)
* **Workspace:** `sutra_ws/src/sutra_gnc/`, `sutra_ws/src/sutra_comms/`, `sutra_ws/src/sutra_sim/`  
* **Branches:** `feature/subsystem-a-gnc`, `feature/subsystem-b-comms` | **Permission:** Unrestricted Cross-Branch
* **Jury Defense Ownership:** 🛡️ **GNC Control Laws, Collision Avoidance & Comms Moat**

#### 🎯 Assigned Gap Remediation Tasks:
1. **Gap 8 (High)**: Replace linear pressure formula `(p0 - p)/12.0` with standard hydrostatic barometric equation in `neuro_adaptive_flight_node.py`.
2. **Gap 9 (High)**: Fix GPS local ENU projection in `vio_localization.py` by subtracting local reference origin datum `(origin_lat, origin_lon)`.
3. **Gap 10 (High)**: Ground the Deep JSCC defense narrative: explain Semantic Latent Compression (512-dim) vs raw pixels, providing measured $64\times64$ patch PSNR benchmarks.
4. **Gap 11 & 12 (High)**: Implement asynchronous UDP multicast transport for SwarmRAFT consensus (`swarm_consensus.py`) and verify `scripts/setup_80211s_mesh.sh`.
5. **Gap 17 (Medium)**: Unify duplicate trajectory filters into single `BaseDifferentiableTrajectoryFilter`.
6. **Gap 18 (Medium)**: Add `from rclpy.executors import ExternalShutdownException` to `px4_offboard_controller.py`.
7. **Gap 25 (Medium)**: Add debug logging to `mesh_node.py` odometry callback.

---

### 2. 👁️ VEDANTH SAI RAM — Subsystem C Lead (AI Edge Perception)
* **Workspace:** `sutra_ws/src/sutra_perception/`  
* **Branch:** `feature/subsystem-c-perception`  
* **Pair Assistant:** Rohith Kumar (provides RTX 4050 GPU for TensorRT builds & inference runs)  
* **Jury Defense Ownership:** 🛡️ **Edge AI, Sensor Fusion & WGS84 Geolocation**

#### 🎯 Assigned Gap Remediation Tasks:
1. **Gap 1 (Critical)**: Fix `SAR_CLASS_IDS` in `detector_node.py` to seamlessly accept custom model IDs `{0: "person", 1: "survivor", 2: "debris", 3: "threat"}` and COCO IDs.
2. **Gap 6 (Critical)**: Wire configurable GPS reference origin (`SUTRA_ORIGIN_LAT`, `SUTRA_ORIGIN_LON`) defaulting to Bengaluru (`12.9344° N, 77.6917° E`).
3. **Gap 14 (High)**: Wire `_low_bandwidth_mode` inside `detector_node.py` to increase confidence threshold to 0.70 and drop framerate under jamming.
4. **Gap 15 (High)**: Wrap `_fusion_tick` in a top-level `try...except Exception as e:` block with throttled logging to prevent silent timer failure.
5. **Gap 16 & 26 (Medium/Low)**: Consolidate ByteTrack onto production `bytetrack.py` and delete dead legacy `bytetrack_tracker.py`.
6. **Gap 27 & 28 (Low)**: Remove hardcoded Kaggle path from `train.py`; link `yolov8n_p2_sutra.yaml` in documentation.

---

### 3. 🗺️ SIVA KESAVA — Subsystem D Lead (3D GIS GCS Dashboard)
* **Workspace:** `sutra_ws/src/sutra_gcs/`  
* **Branch:** `feature/subsystem-d-gcs`  
* **Pair Assistant:** Rohith Kumar (provides multi-stream client testing & WebGPU rendering verification)  
* **Jury Defense Ownership:** 🛡️ **GCS Dashboard, WebGPU HUD & Operator State Machine**

#### 🎯 Assigned Gap Remediation Tasks:
1. **Gap 4 (Critical)**: Initialize real Mapbox GL JS 3D satellite map container with offline raster fallback, retaining high-speed tactical radar grid as a switchable view.
2. **Gap 5 (Critical)**: Implement experimental WebGPU shader pipeline with Canvas 2D fallback, and honestly document rendering architecture in `DOCS.md`.
3. **Gap 13 (High)**: Implement bidirectional `EMERGENCY_RTL_REQUEST` $\to$ `EMERGENCY_RTL_ACK` handshake loop in `MissionControlConsole.tsx`.
4. **Gap 19 (Medium)**: Remove static mock numbers in `DeepJsccLiveVideoGrid.tsx` and wire dynamic WebSocket telemetry.
5. **Gap 20 & 21 (Medium)**: Clean up dead code (`telemetryBuffer.ts`) and unify CoT serialization via `atakCotStreamer.ts`.
6. **Gap 23 & 24 (Medium)**: Enable TypeScript strict mode and introduce Jest/Vitest unit test suite for GCS store logic.
7. **Gap 31 (Low)**: Add exponential backoff ($1\text{s}, 2\text{s}, 4\text{s}, \max 10\text{s}$) to WebSocket reconnect logic.

---

### 4. 📑 HARIKA — Subsystem E Lead & Pitch Co-Lead (Docs, Audits, Disaster Standards & Presentation)
* **Dedicated Agent Guide:** [`docs/agents/HARIKA_AGENT.md`](../agents/HARIKA_AGENT.md)
* **Master Specification:** [`docs/subsystems/SUBSYSTEM_E_DOCS.md`](../subsystems/SUBSYSTEM_E_DOCS.md)
* **Workspace:** `docs/`, `scripts/`, `.github/`  
* **Branch:** `feature/subsystem-e-docs`  
* **Co-Lead Support:** Tech Lead Nikhil  
* **Jury Defense Ownership:** 🛡️ **Master Pitch Delivery, Disaster Standards, Rule 6.1 Compliance & Verification Defense**

#### 🎯 Assigned Gap Remediation & Strategic Tasks:
1. **Global NDRF & Disaster Standards Examination (High Priority)**: Audit and operational mapping of NDRF deployment SOPs, NDMA Incident Response System (IRS 2010), UN OCHA INSARAG ASR Levels 1–5, FEMA NIMS/ICS (ICS-100/200/700), NFPA 2400, and NATO STANAG 4586 CoT XML streaming.
2. **Engineering Honesty Boundaries**: Master and defend SUTRA's operational boundaries ("Cases Solved" vs. "Cases NOT Solved" requiring ground handoffs).
3. **Gap 3 (Critical)**: Fix `.github/workflows/ros2-ci.yml` by removing `|| true` masks and adding triggers for all active branches.
4. **Gap 22 (Medium)**: Update `requirements.txt` to include `websockets>=12.0` and all missing runtime dependencies.
5. **Gap 30 (Low)**: Maintain active runtime logging in `docs/hackathon/JURY_FEEDBACK_TRACKER.md` during Evaluation 1 and 2.
6. **Zero-Mock Scorecard**: Ensure all benchmark tables in documentation contain verbatim captured stdout numbers.
7. **Desk Anchor**: Coordinate with Rohith to ensure the Library desk is never unattended (NHCE Rule 3.4).

---

### 5. ⚙️ ROHITH KUMAR — Subsystem F Lead & Compute Runner (Field Ops & GPU Execution)
* **Workspace:** `docs/conops/`, root scripts  
* **Branch:** `feature/subsystem-f-ops`  
* **Assigned Role:** Dedicated compute runner (HP Victus RTX 4050 6GB) for TensorRT conversions and multi-stream GCS testing; ground telemetry logger.
* **Jury Defense Ownership:** 🔒 **Zero Independent Q&A Exposure** (Technical defense fielded by Nikhil, Vedanth, Siva, or Harika).

#### 🎯 Assigned Gap Remediation Tasks:
1. **Gap 2 & 7 (Critical)**: Verify `Dockerfile.novnc` and test containerized build with corrected working directory.
2. **Gap 32 (Low)**: Map NDMA Disaster Management Guidelines (2019, Section 4.3) into `docs/conops/DOCS.md`.
3. **Library Desk Anchor**: Maintain continuous physical presence at the Library table at all times (NHCE Rule 3.4).

---

## 🌴 The Mandatory Git Branching & Synchronization Lifecycle

```
  [ Subsystem Feature Branches ]       [ Sandbox Testing Branch ]          [ Production Master Truth ]
  feature/subsystem-a-gnc (Nikhil) ──┐
  feature/subsystem-b-comms (Nikhil) ┼──► dev (Sandbox Testing) ──[Verify]──► main (Verified Production)
  feature/subsystem-c-perception ────┤   (Cross-subsystem staging             ▲
  feature/subsystem-d-gcs (Siva) ────┤    & sandbox validation)               │
  feature/subsystem-e-docs (Harika) ─┤                                        │ (MANDATORY UPDATE SOURCE)
  feature/subsystem-f-ops (Rohith) ──┘                                        │
             ▲                                                                │
             └─────────────────────── Pull / Sync from main ──────────────────┘
```

1. **`main` is the Sole Production Truth**: All subsystem feature branches MUST checkout and update directly from `main` (`git fetch origin main && git merge origin/main --no-edit`), NEVER directly from `dev`.
2. **`dev` is Strictly a Sandbox**: Integration tests run on `dev`. Once `dev` passes all 232 tests, it merges into `main`.
3. **The Cardinal Commit Law**: *"No teammate is allowed to work on local and say 'I didn't commit, but I completed the work.' If work is not committed and pushed to GitHub, it officially does not exist."*

---
*Project SUTRA — Smart Horizon 48-Hour International Hackathon Grand Finale Plan.*
