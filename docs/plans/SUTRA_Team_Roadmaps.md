# 🚀 Project SUTRA — Autonomous SAR & Reconnaissance Swarm Team Roadmaps

> **Grand Finale Operational Context:**  
> **Event:** Smart Horizon: 48-Hour International Hackathon (NHCE Bengaluru, Sept 3–5, 2026)  
> **Team ID:** `SHIH26-TID-361` | **Venue:** Library (Defence & SpaceTech Track)  
> **Problem Statement:** **SH-DST-05** (*Autonomous Drone Swarm System for Search, Rescue & Reconnaissance in GPS-Denied / RF-Jammed Environments*)  
> **Target Outcome:** 300/300 Marks across Evaluation 1 (100m), Evaluation 2 (100m), and Evaluation 3 (100m) with 100% resolution of the 32 Architectural Gaps.

---

## 🌴 3-Tier Branching & Git Repository Hygiene

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

1. **`main` is Sole Production Truth**: All subsystem feature branches MUST checkout and update directly from `main` (`git fetch origin main && git merge origin/main --no-edit`), NEVER directly from `dev`.
2. **`dev` is Strictly a Sandbox**: Cross-subsystem integration occurs on `dev`. Once validated (232 tests passing), `dev` merges to `main`, and all subsystems pull from `main`.
3. **The Cardinal Commit Law**: *"No teammate is allowed to work on local and say 'I didn't commit, but I completed the work.' If work is not committed and pushed to GitHub, it officially does not exist."*

---

## ⚡ 1. NIKHIL — Tech Architect & Subsystem A + B Lead (GNC, Comms & Sim)

* **Roles:** Tech Architect, Flight Controls & Swarm Comms Lead (Subsystem A & B)
* **Folders:** [`sutra_ws/src/sutra_gnc/`](sutra_ws/src/sutra_gnc/), [`sutra_ws/src/sutra_comms/`](sutra_ws/src/sutra_comms/), [`sutra_ws/src/sutra_sim/`](sutra_ws/src/sutra_sim/)
* **Branches:** `feature/subsystem-a-gnc`, `feature/subsystem-b-comms` (Unrestricted Takeover Authority across all branches)
* **Verification Suites:** `pytest sutra_ws/src/sutra_gnc/test/` & `pytest sutra_ws/src/sutra_comms/test/`
* **Jury Defense Ownership:** 🛡️ **GNC Flight Laws, ORCA 3D, PX4 Offboard & Deep JSCC Comms Moat**

### Assigned Gap Remediation Items:
* **Gap 8 (High)**: Replace linear pressure approximation `(p0 - p)/12.0` with standard hydrostatic barometric formula in `neuro_adaptive_flight_node.py:129`.
* **Gap 9 (High)**: Fix GPS local ENU projection in `vio_localization.py:320-321` by subtracting local reference datum coordinates.
* **Gap 10 (High)**: Ground the Deep JSCC defense: explain Semantic Latent Compression (512-dim) vs raw pixels, providing measured patch benchmarks.
* **Gap 11 & 12 (High)**: Implement asynchronous UDP multicast transport for SwarmRAFT consensus and verify Linux kernel 802.11s mesh setup scripts.
* **Gap 17 (Medium)**: Unify duplicate trajectory filters into single `BaseDifferentiableTrajectoryFilter`.
* **Gap 18 (Medium)**: Add `from rclpy.executors import ExternalShutdownException` to `px4_offboard_controller.py:661`.
* **Gap 25 (Medium)**: Add debug logging to `mesh_node.py` odometry callback to prevent swallowed exceptions.
* **Gap 29 (Low)**: Align `DOCS.md` OctoMap specification with depth image voxelization rather than PointCloud2 LiDAR.

---

## 👁️ 2. VEDANTH SAI RAM — Subsystem C Lead (AI Edge Perception)

* **Role:** Lead Engineer, Subsystem C (AI Perception, Sensor Fusion, Target Geolocation)
* **Folder:** [`sutra_ws/src/sutra_perception/`](sutra_ws/src/sutra_perception/)
* **Branch:** `feature/subsystem-c-perception`
* **Pair Assistant:** Rohith Kumar (provides RTX 4050 GPU for TensorRT builds & batch inference)
* **Verification Suite:** `pytest sutra_ws/src/sutra_perception/test/`
* **Jury Defense Ownership:** 🛡️ **Edge AI Detection, ByteTrack MOT & WGS84 Geolocation Raycasting**

### Assigned Gap Remediation Items:
* **Gap 1 (Critical)**: Update `SAR_CLASS_IDS` in `detector_node.py:147` to support `{0: "person", 1: "survivor", 2: "debris", 3: "threat", 26: "backpack", 28: "suitcase"}`.
* **Gap 6 (Critical)**: Wire configurable GPS reference origin (`SUTRA_ORIGIN_LAT`, `SUTRA_ORIGIN_LON`), defaulting to Bengaluru coordinates (`12.9344° N, 77.6917° E`).
* **Gap 14 (High)**: Wire `_low_bandwidth_mode` flag inside `detector_node.py` to dynamically increase confidence threshold to 0.70 and throttle framerate under jamming.
* **Gap 15 (High)**: Wrap `_fusion_tick` in `detector_node.py:769` in a top-level `try...except Exception as e:` block with throttled logging.
* **Gap 16 & 26 (Medium/Low)**: Consolidate ByteTrack onto production `bytetrack.py`; deprecate and remove legacy duplicate `bytetrack_tracker.py`.
* **Gap 27 & 28 (Low)**: Remove hardcoded Kaggle path from `train.py`; document `yolov8n_p2_sutra.yaml` in perception `DOCS.md`.

---

## 🗺️ 3. SIVA KESAVA — Subsystem D Lead (3D GIS GCS Dashboard)

* **Role:** Lead Engineer, Subsystem D (3D GIS Ground Control Station, React 18, Mapbox, WebGPU)
* **Folder:** [`sutra_ws/src/sutra_gcs/`](sutra_ws/src/sutra_gcs/)
* **Branch:** `feature/subsystem-d-gcs`
* **Pair Assistant:** Rohith Kumar (provides multi-stream client testing & WebGPU rendering verification)
* **Verification Suite:** `cd sutra_ws/src/sutra_gcs && npm run build` & browser console audit
* **Jury Defense Ownership:** 🛡️ **GCS Dashboard, WebGPU HUD, ATAK CoT & Operator State Machine**

### Assigned Gap Remediation Items:
* **Gap 4 (Critical)**: Initialize actual Mapbox GL JS 3D satellite map container with offline raster tiles, keeping radar grid as switchable overlay.
* **Gap 5 (Critical)**: Implement experimental WebGPU shader pipeline with Canvas 2D fallback, honestly documenting rendering engine in `DOCS.md`.
* **Gap 13 (High)**: Implement bidirectional `EMERGENCY_RTL_REQUEST` $\to$ `EMERGENCY_RTL_ACK` handshake loop in `MissionControlConsole.tsx`.
* **Gap 19 (Medium)**: Remove static mock metrics in `DeepJsccLiveVideoGrid.tsx` and wire dynamic WebSocket telemetry stream.
* **Gap 20 & 21 (Medium)**: Remove dead `telemetryBuffer.ts` and unify all CoT XML serialization through `atakCotStreamer.ts`.
* **Gap 23 & 24 (Medium)**: Enable TypeScript strict mode and introduce Jest/Vitest unit tests for GCS store logic.
* **Gap 31 (Low)**: Add exponential backoff reconnect logic ($1\text{s}, 2\text{s}, 4\text{s}, \max 10\text{s}$) in WebSocket client.

---

## 📑 4. HARIKA — Subsystem E Lead & Pitch Co-Lead (Docs, Audits & Presentation)

* **Role:** Lead Engineer, Subsystem E (Documentation, Automated Gate Audits, Pitch Deck Formatting & Delivery)
* **Dedicated Agent Guide:** [`docs/agents/HARIKA_AGENT.md`](../agents/HARIKA_AGENT.md)
* **Master Specification:** [`docs/subsystems/SUBSYSTEM_E_DOCS.md`](../subsystems/SUBSYSTEM_E_DOCS.md)
* **Folder:** [`docs/`](docs/), [`scripts/`](scripts/), [`.github/`](.github/)
* **Branch:** `feature/subsystem-e-docs`
* **Co-Lead Support:** Tech Lead Nikhil
* **Verification Suite:** Automated monorepo test suites & pitch deck rehearsal
* **Jury Defense Ownership:** 🛡️ **Master Pitch Presentation Delivery, Disaster Standards, Rule 6.1 Compliance & Verification Defense**

### Assigned Gap Remediation & Strategic Items:
* **Global NDRF & Disaster Standards Examination (Priority 1)**: Thorough audit and operational alignment with National Disaster Response Force (NDRF) field SOPs, NDMA Incident Response System (IRS 2010), UN OCHA INSARAG USAR Guidelines (ASR Levels 1–5), FEMA NIMS/ICS (ICS-100/200/700), NFPA 2400, and NATO STANAG 4586 CoT XML streaming.
* **Engineering Honesty & Boundaries Defense**: Defend the strict demarcation between solved capabilities (Golden 24h triage, NLOS mesh, Deep JSCC $-5\text{dB}$, sub-0.32m raycasting) vs. physical boundaries (deep buried $>1\text{m} \to$ K9/geophones, cyclonic winds $>18\text{m/s}$).
* **Gap 3 (Critical)**: Fix `.github/workflows/ros2-ci.yml` by removing `|| true` masks and ensuring all active branches trigger CI.
* **Gap 22 (Medium)**: Update root `requirements.txt` with `websockets>=12.0` and system library references.
* **Gap 30 (Low)**: Maintain active runtime logging in `docs/hackathon/JURY_FEEDBACK_TRACKER.md` across Evaluation 1 & 2.
* **Zero-Mock Scorecard**: Ensure all benchmark numbers in DOCS.md and pitch decks come verbatim from live captured stdout.
* **Desk Anchor**: Coordinate workstation presence at the Library table (NHCE Rule 3.4).

---

## ⚙️ 5. ROHITH KUMAR — Subsystem F Lead & Compute Runner (Field Ops & GPU Execution)

* **Role:** Field Ops Lead & Compute Execution Assistant (NDMA Rescue CONOPS, GPU Runner, Table Anchor)
* **Folder:** [`docs/conops/`](docs/conops/), root scripts
* **Branch:** `feature/subsystem-f-ops`
* **Assigned Hardware:** HP Victus (Intel i7, NVIDIA RTX 4050 6GB GPU)
* **Jury Defense Ownership:** 🔒 **Zero Independent Q&A Exposure** (Technical defense fielded by Nikhil, Vedanth, Siva, or Harika).

### Assigned Gap Remediation Items:
* **Gap 2 & 7 (Critical)**: Build and test `Dockerfile.novnc` and verify `docker-compose.yml` working directory paths.
* **Gap 32 (Low)**: Map exact NDMA Disaster Management Guidelines (2019, Section 4.3) into `docs/conops/DOCS.md`.
* **GPU Compute Assistance**: Run TensorRT FP16 model compilations for Vedanth; run multi-stream GCS load tests for Siva.
* **Library Desk Anchor**: Maintain continuous physical presence at the Library table at all times (NHCE Rule 3.4).

---
*Project SUTRA — Smart Horizon 48-Hour International Hackathon Grand Finale Roadmaps.*
