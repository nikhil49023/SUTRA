# 🚨 SUTRA Hackathon Sprint SOP: Distributed Emergency Protocol

> **Document ID:** SUTRA-SOP-2026-R1  
> **Author / Authority:** Nikhil (Tech Architect & Lead)  
> **Effective Window:** August 21, 2026 (14:00 IST) → September 1, 2026 (23:59 IST)  
> **Total Usable Prep Time:** **11.5 Effective Working Days** *(Sept 2 strictly reserved for travel; Sept 3–5 Grand Finale)*  
> **Critical Operational Constraint:** **Zero Physical Workspace Access** — 100% Distributed / Remote Coordination Protocol Activated.

---

## 1. Executive Context & Critical Bottlenecks

### ⚠️ The Reality of the Situation:
1. **Physical Space Denial**: Institutional management has refused permission for dedicated physical workspace/lab collaboration.
2. **Extreme Time Shortage**: We have exactly **11.5 working days** remaining before boarding travel on September 2nd.
3. **High Integration Complexity**: Project SUTRA spans 6 deeply interconnected subsystems (ROS 2 Humble, PX4 Offboard, Deep JSCC, YOLOv8-Nano TensorRT, WebGPU 3D GCS, and NDMA CONOPS).
4. **Zero-Tolerance for Sync Friction**: Remote development introduces lag, isolation, and integration divergence if not strictly governed by clockwork cadence.

---

## 2. Distributed Virtual Workspace Operating Cadence

To overcome the lack of physical collocation, the team will operate under a **Military-Grade Async & Dual-Sync Protocol**:

```
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                      DAILY DISTRIBUTED OPERATING SCHEDULE                             │
 ├────────────────┬───────────────────────────────────────────────────────────────────────┤
 │ 09:00 - 09:20  │ 🌅 MORNING SYNC (Google Meet / Discord)                              │
 │                │ • 3-minute hard limit per member: Yesterday Done / Today Target / Blockers│
 ├────────────────┼───────────────────────────────────────────────────────────────────────┤
 │ 09:30 - 13:30  │ 💻 DEEP FOCUS BLOCK 1 (Autonomous Subsystem Implementation)           │
 │                │ • Asynchronous work in assigned feature branches                       │
 ├────────────────┼───────────────────────────────────────────────────────────────────────┤
 │ 14:30 - 18:30  │ 💻 DEEP FOCUS BLOCK 2 & PAIR DEBUGGING                                │
 │                │ • Cross-subsystem testing & Live Share / Discord voice channels       │
 ├────────────────┼───────────────────────────────────────────────────────────────────────┤
 │ 21:30 - 22:15  │ 🌙 NIGHTLY BUFFER INTEGRATION & MERGE WAR-ROOM                        │
 │                │ • PR reviews into `dev` branch only                                  │
 │                │ • Run verification suites (`pytest`, `npm run build`)                 │
 │                │ • Unblock any teammate stuck for >2 hours                             │
 └────────────────┴───────────────────────────────────────────────────────────────────────┘
```

### Remote Collaboration Ground Rules:
- **Max 30-Minute Blocker Rule**: If a developer is stuck on a bug/dependency for more than 30 minutes, they MUST post in the team channel and request a Live Share / screenshare pairing session. **No silent suffering.**
- **Discord Virtual Lab**: A 24/7 persistent voice/video room ("Virtual Lab Room") will remain open during work hours. Muted by default; hop in for instant unblocking.
- **Git Discipline (Rule 0)**:
  - Work **ONLY** in `feature/subsystem-*` branches.
  - Pull latest `dev` before starting every morning: `git fetch origin dev && git merge origin/dev --no-edit`.
  - Submit all PRs against `dev` by 21:00 IST daily. Direct commits to `main` remain strictly locked.

---

## 3. Day-by-Day Tactical Countdown (11.5-Day Sprint)

```
  PHASE 1: SUB-MODULE HARDENING       PHASE 2: INTER-SUBSYSTEM INTEGRATION    PHASE 3: AUDITS & REHEARSAL
  [ Aug 21 PM - Aug 24 ] (4 Days)     [ Aug 25 - Aug 28 ] (4 Days)             [ Aug 29 - Sept 1 ] (3.5 Days)
  ├─ Fix Imports & ABIs              ├─ GNC ↔ Comms ↔ Perception Loop         ├─ Gate Audits G1–G6 Verification
  ├─ Perception TensorRT Pipeline    ├─ WebGPU GCS Telemetry Stream           ├─ Offline Caching & USB Snapshots
  ├─ Deep JSCC & SwarmRAFT           ├─ 5-UAV Gazebo SITL Run                 ├─ 48h Mock Defense & Pitch Rehearsal
  └─ Pre-Event Briefing (Aug 22)     └─ NDMA CONOPS Scenario Mapping          └─ Freeze All Codebases
```

### 🗓️ Phase 1: Subsystem Hardening & Core Fixes (Aug 21 PM – Aug 24)
*Goal: Eliminate individual module debt, verify standalone unit tests, and attend pre-event briefing.*

- **Day 0.5 (Fri, Aug 21 - Afternoon/Night)**:
  - [x] Establish Remote Discord/Meet workspace and verify git branch synchronization.
  - [ ] **Nikhil**: Verify PX4 offboard trajectory & SwarmRAFT leader election standalone nodes.
  - [ ] **Vedanth**: Resolve NumPy ABI & PyTorch/TensorRT model import paths in Subsystem C.
  - [ ] **Siva**: Verify `sutra_gcs` Vite build and WebGPU dashboard mock feed.
  - [ ] **Harika & Rohith**: Initial audit of Subsystem E test scripts & Subsystem F SOP docs.
- **Day 1 (Sat, Aug 22) — ⚠️ PRE-EVENT BRIEFING DAY**:
  - [ ] **All Hands**: Attend NHCE Pre-Event Online Briefing (Capture rules, judging rubrics, network constraints).
  - [ ] **Nikhil**: Stabilize 802.11s mesh socket routing (`sutra_comms`) and Deep JSCC encoder.
  - [ ] **Vedanth**: Complete WGS84 target raycasting geometry and bounding box stream.
  - [ ] **Siva**: Hook up WebSocket client (`ws://localhost:9090`) to GCS frontend.
- **Day 2 (Sun, Aug 23)**:
  - [ ] **Nikhil & Siva**: Stream ROS 2 drone telemetry over WebSocket to WebGPU HUD.
  - [ ] **Vedanth**: Run YOLOv8 inference validation on benchmark rescue imagery.
  - [ ] **Harika**: Verify and update G1, G2, G3 unit test coverage.
  - [ ] **Rohith**: Finalize Kedarnath flood & Wayanad landslide search corridor specifications in `docs/conops/`.
- **Day 3 (Mon, Aug 24)**:
  - [ ] **Phase 1 Merge Gate**: All feature branches merge cleanly into `dev`.
  - [ ] Standalone test pass rate: 100% across all subsystems.

---

### 🗓️ Phase 2: Full Inter-Subsystem Integration (Aug 25 – Aug 28)
*Goal: Connect all 6 subsystems into a unified end-to-end simulation pipeline in Gazebo Sim 8.*

- **Day 4 (Tue, Aug 25)**:
  - [ ] **Loop Closure 1 (A + B + C)**: Drone flight setpoints (A) feed camera stream to Perception (C), which transmits compressed target alerts over Mesh (B).
- **Day 5 (Wed, Aug 26)**:
  - [ ] **Loop Closure 2 (B + D)**: GCS displays real-time 3D drone positions, bounding boxes, and alert logs at 60 FPS without UI freezing.
  - [ ] **Siva**: Implement 1-Click Emergency RTL button triggering PX4 RTL action.
- **Day 6 (Thu, Aug 27)**:
  - [ ] **Multi-Agent Scale (5 UAVs)**: Launch 5-drone Gazebo Sim 8 world with ORCA 3D collision avoidance and SwarmRAFT failover.
  - [ ] **Rohith**: Integrate NDMA search patterns (expanding square / parallel track) into mission planner scripts.
- **Day 7 (Fri, Aug 28)**:
  - [ ] **Phase 2 Buffer Integration**: Full end-to-end headless and GUI simulation run on `dev`.
  - [ ] Record high-definition backup simulation video reels for presentation fallback.

---

### 🗓️ Phase 3: Stress Testing, Gate Audits & Pitch Defense (Aug 29 – Sept 1)
*Goal: Prove industry readiness via measured Gate Audits (G1–G6), lock down pitch deck, and freeze code.*

- **Day 8 (Sat, Aug 29)**:
  - [ ] **Harika & Nikhil**: Execute live Gate Audits G1–G6 (`pytest` stdout capture, RTF measurements, WebGPU FPS).
  - [ ] **Mandatory Protocol**: Update all subsystem `DOCS.md` files with **measured live data ONLY** (strictly zero mock/projected numbers).
- **Day 9 (Sun, Aug 30)**:
  - [ ] **Rohith & Harika**: Finalize Master Pitch Deck (Problem Statement, NDMA CONOPS, Architecture, Live Demo Sequence).
  - [ ] **Team**: 1st Mock Presentation & Defense Q&A session (timed 10 min presentation + 5 min jury grill).
- **Day 10 (Mon, Aug 31)**:
  - [ ] **2nd Mock Presentation**: Rehearsal focusing on edge cases, failure recovery, and real-world tactical viability.
  - [ ] **Harika**: Generate offline printable PDF documentation bundle via `playwright-pdf`.
- **Day 11 (Tue, Sept 1) — CODE & ASSET FREEZE**:
  - [ ] **18:00 IST HARD FREEZE**: Merge `dev` → `main`. Tag release `v1.0.0-hackathon-final`.
  - [ ] **Offline Deployment Package**:
    - Download all npm packages (`node_modules` cached).
    - Export Docker containers / standalone Python venvs.
    - Copy all repo code, model weights, demo videos, and slides onto **3 separate USB flash drives** (Tech Lead, Perception Lead, GCS Lead).

---

## 4. Travel & On-Site Execution Matrix

### ✈️ Travel Day: Wednesday, September 2, 2026 (ZERO CODE DAY)
- **Primary Objective**: Travel to Bengaluru / NHCE campus safely, rest, check in, and verify hardware inventory.
- **Hardware & Gear Checklist**:
  - [ ] Laptops + high-wattage power bricks + multi-plug extension cords (essential for hackathon tables).
  - [ ] 3x USB backup drives with standalone offline installers.
  - [ ] Microcontrollers (ESP32-S3 / LoRa / Flight controllers if physical HITL demo).
  - [ ] Physical printouts of SUTRA Architecture & NDMA CONOPS summaries.
  - [ ] Mobile hotspot dongles / backup SIM cards (venue Wi-Fi is notoriously congested).

### 🏆 Grand Finale: September 3–5, 2026 (48-Hour Live Hackathon)
- **Hour 0–12 (Setup & Environment Init)**: Establish offline ROS 2 network, verify GCS localhost connection, validate Gazebo SITL.
- **Hour 12–24 (Integration Checkpoint)**: Run first end-to-end search-and-rescue mission simulation under jury evaluation mentors.
- **Hour 24–36 (Polish & Presentation Tuning)**: Fine-tune demo scenarios to problem statements, rehearse jury pitch.
- **Hour 36–48 (Final Pitch & Grand Jury Defense)**: Deliver live WebGPU GCS telemetry + Gazebo swarm flight + AI perception demo.

---

## 5. Team Responsibilities & Ownership Matrix

| Member | Primary Subsystem | Critical Sprint Deliverable (Aug 21 – Sept 1) | Remote Blocker Escalation |
|---|---|---|---|
| **Nikhil (Lead)** | **A (GNC) & B (Comms)** | PX4 Offboard 50Hz setpoints, ORCA 3D, SwarmRAFT consensus, Gazebo Sim 8 multi-UAV digital twin. | Architecture / Cross-module merge authority |
| **Vedanth** | **C (Perception)** | YOLOv8-Nano TensorRT inference (<5ms), Tri-Modal fusion, DEM raycast GPS geolocator. | Subsystem A pose subscriber / model latency |
| **Siva** | **D (3D GIS GCS)** | WebGPU 60 FPS HUD, 3D Mapbox GIS view, WebSocket telemetry listener, Emergency 1-Click RTL. | Subsystem B WebSocket packet format |
| **Harika** | **E (Docs & Audits)** | Automated pytest integration verification, G1–G6 benchmark audit logging, Pitch Deck visual design. | Live test log collection / presentation flow |
| **Rohith** | **F (Tactical Ops)** | Kedarnath/Wayanad search corridors, Field Deployment SOP, NDMA operational storytelling. | Jury defense & operational alignment |

---

## 6. Daily Accountability Tracker (Print/Copy-Paste for Daily Standup)

```markdown
### 📋 Daily Standup Template (Post every day at 09:00 AM IST)
**Name:** [Member Name]
**Branch:** [feature/subsystem-*]
**1. What I accomplished yesterday:**
   - [Deliverable / Commit]
**2. What I will deliver by 21:00 today:**
   - [Concrete deliverable / test passed]
**3. Blockers requiring pairing/assistance:**
   - [None / Specific issue]
```
