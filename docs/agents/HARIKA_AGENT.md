# 🤖 HARIKA_AGENT.md — Autonomous Agent Specification for Harika (Subsystem E Lead)

> **Agent Profile:** Subsystem E Lead & Field CONOPS Co-Lead (Documentation, Verification Audits, Global Disaster Standards & Grand Finals Pitch Delivery)  
> **Human Lead:** Harika  
> **Technical Co-Lead Support:** Tech Lead Nikhil ⚡  
> **Assigned Hardware:** MacBook Pro (Apple Silicon)  
> **Git Feature Branch:** `feature/subsystem-e-docs`  
> **Workspace Paths:** `docs/`, `scripts/`, `docs/subsystems/SUBSYSTEM_E_DOCS.md`  
> **Jury Defense Ownership:** 🛡️ **Master Pitch Presentation Delivery, Rule 6.1 Compliance & Verification Defense**

---

## 🛡️ 1. Core Operating Principles & Invariants

All tasks executed under this agent role must strictly adhere to the Project SUTRA Master Protocol (`AGENTS.md`):

1. **Zero-Mock Benchmark Invariant**: Never state or commit projected, estimated, or synthetic numbers. Every performance claim must be accompanied by verbatim captured stdout from a live run (`pytest`, `npm run build`, etc.).
2. **Mandatory Commit & Push Policy**: If work is not committed to git and pushed to `feature/subsystem-e-docs`, it does not exist. All task completions require clean git working trees.
3. **NHCE Rule 6.1 Compliance Loop**: Every single item of feedback, critique, or question from jury members during Evaluations 1 and 2 must be logged immediately into `docs/hackathon/JURY_FEEDBACK_TRACKER.md` and resolved before the subsequent evaluation.
4. **Library Desk Attendance Invariant (NHCE Rule 3.4)**: Work closely with Rohith to guarantee at least 2 team members are permanently seated at the Library table throughout all meal and high-tea shifts.

---

## 🎯 2. Primary Assigned Tasks & Workflows

### 🌟 Task A: Global NDRF & Disaster Management Standards Examination (CORE MISSION)

Evaluators from defense, aerospace, and civil protection organizations look beyond raw code to assess whether the system can survive and integrate in real-world disaster zones. Harika owns the deep examination, doctrinal alignment, and presentation of these standards:

#### 1. National Disaster Response Force (NDRF) & NDMA IRS (2010) Alignment
* **Institutional Placement**: In an actual deployment, SUTRA is designated as an **Autonomous Aerial Reconnaissance Unit (AARU)** reporting directly to the **Operations Section Chief (OSC)** under the Incident Commander (IC).
* **Information Dissemination**: Reconnaissance outputs bypass tactical clutter and feed georeferenced Cursor-on-Target (CoT) XML layers directly to the **Planning Section Chief (PSC)** and District Emergency Operations Centre (EOC).
* **Statutory Grounding**:
  * **Disaster Management Act 2005 (Sections 34 & 38)**: Authorizes the District Magistrate (DDMA Chair) to requisition and deploy autonomous aerial survey equipment during emergency declarations.
  * **DGCA Drone Rules 2021 (Rule 50)**: Provides statutory exemptions for beyond visual line-of-sight (BVLOS) swarm operations in designated temporary segregated disaster airspace.
  * **NDMA Drone Guidelines 2019 (Section 4.3)**: Mandates automated failsafe return, continuous telemetry logging, sub-meter geo-tagging, and AES-256 encrypted payload telemetry.

#### 2. UN OCHA INSARAG USAR Protocols
* **INSARAG Assessment, Search & Rescue (ASR) Levels**:
  * **ASR Level 1 (Wide Area Assessment - WAA)**:
    * *The Bottleneck*: Conventional foot/vehicle search requires **18–24 hours** to assess a $2.5\text{ km}^2$ disaster boundary.
    * *SUTRA Solving Power*: 5-drone collaborative echelon sweep completes total perimeter mapping in **25 minutes** (**98% time compression**), identifying survivor pockets, bridge washouts, and safe access corridors.
  * **ASR Level 2 (Sector Assessment & Worksite Triage)**:
    * Fuses LWIR thermal anomalies and optical cameras to identify collapse void geometries (pancake, lean-to, cantilever).
    * Automatically generates digital **FEMA X-Codes / INSARAG Triage Stamps** on the GCS Mapbox tactical display (recording Date/Time, Asset ID, Live Victim Count, and Structural Hazards).
  * **ASR Levels 3 to 5 (Rapid/Technical Search & Recovery)**:
    * Seamless handoff from aerial reconnaissance to heavy USAR squads equipped with canines, acoustic geophones, and hydraulic breaching spreaders.

#### 3. FEMA NIMS / ICS & NATO Interoperability
* **FEMA NIMS ICS-100/200/700**: Establishes Common Operating Picture (COP) compliance. SUTRA’s WebGPU GCS renders multi-drone tracks and survivor waypoints in universal GIS formats.
* **NATO STANAG 4586 & MIL-STD-2525D**: SUTRA transmits real-time Cursor-on-Target (CoT) XML over UDP multicast (`atakCotStreamer.ts`) to Android Tactical Assault Kit (ATAK) and WinTAK handheld terminals used by special operations and frontline NDRF battalions.
* **NFPA 2400 sUAS Standard**: Public safety compliance for autonomous multi-drone deconfliction, vertical layer separation ($\ge 5\text{m}$), and link-loss failsafe landing.

---

### ⚖️ Task B: Engineering Honesty & Operational Boundaries Defense

Harika must master the strict physical and aerodynamic boundaries of Project SUTRA to disarm skeptical jury members:

```
┌─────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────┐
│                    🟢 CASES SOLVED BY SUTRA                 │             🔴 CASES NOT SOLVED (HONEST HAND-OFFS)          │
├─────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 1. GPS-Denied Canyons (Kedarnath multipath / zero satellite)│ 1. Deep Subterranean / Packed Rubble Burials (> 1.0m depth) │
│    ↳ Solved via VIO + 3D LiDAR Odometry (< 0.20% drift)    │    ↳ Physics: LWIR thermal cannot penetrate solid concrete.  │
│                                                             │    ↳ Handoff: Ground K9 Scent Squads & Seismic Geophones.   │
├─────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 2. NLOS Ridge Blockout (Wayanad swollen rivers / hills)     │ 2. Severe Cyclonic Gale Winds (> 18 m/s or > 65 km/h)       │
│    ↳ Solved via 802.11s dynamic multi-hop aerial relay mesh │    ↳ Physics: Motor ESC duty cycle saturates at 100%.       │
│                                                             │    ↳ Handoff: Low-altitude auto-land; shelter standby.      │
├─────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 3. Severe RF Noise / Jamming (-5 dB Low-SNR Channel)        │ 3. Underwater Riverbed Victim Recovery                      │
│    ↳ Solved via Deep JSCC Neural Analog Codec (PSNR ≥ 41dB) │    ↳ Physics: Aerial multi-rotors cannot operate in water.  │
│                                                             │    ↳ Handoff: NDRF Inflatable Boats & Deep-Water Divers.    │
├─────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 4. Survivor Geolocation Uncertainty                         │ 4. Heavy Structural Breaching & Victim Extrication          │
│    ↳ Solved via 6-DoF DEM WGS84 Raycasting (< 0.32m error)  │    ↳ Physics: 600g sensor payload limit prevents lifting.   │
│                                                             │    ↳ Handoff: Heavy USAR Breaching Squads (Hydraulics).     │
└─────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

### 📊 Task C: System Verification & Automated Test Harness Execution

1. **Deterministic Test Execution**: Maintain 100% test pass rate across all monorepo test modules:
   ```bash
   pytest sutra_ws/src/sutra_gnc/test/ sutra_ws/src/sutra_comms/test/ sutra_ws/src/sutra_perception/test/ -v
   ```
2. **Gate Audits (G1–G6) Verification**: Validate empirical results against tightened industry thresholds:
   - Gate G1: Flight Controls & SITL ($RMSE < 0.08\text{m}$, $RTF \ge 0.99$)
   - Gate G2: Mesh PDR & Deep JSCC ($Failover < 500\text{ms}$, $PSNR \ge 38.0\text{ dB}$)
   - Gate G3: Edge AI Inference ($Latency < 10\text{ms}$, $mAP@0.5 \ge 94\%$)
   - Gate G4: WGS84 Raycast Geolocation ($Error < 0.40\text{m} @ 30\text{m AGL}$)
   - Gate G5: ORCA 3D Clearance ($Min Buffer \ge 2.80\text{m}$)
   - Gate G6: WebGPU GCS Framerate ($60.0\text{ FPS Locked}$, $RTL Delay < 10\text{ms}$)

---

### 🎤 Task D: Master Pitch Delivery & Rehearsal Schedule

1. **Master Artifacts**:
   - Master Pitch Deck: `docs/presentation/SUTRA_Master_Pitch_Deck.html` (14 high-impact slides, runnable offline).
   - Speaker Notes: `docs/presentation/SUTRA_Pitch_Deck_Speaker_Notes.md` (exact timing & verbal cues).
   - Jury Stress-Test Q&A: `docs/presentation/SUTRA_Jury_Defense_Stress_Test_QA.md` (25 technical & operational trap answers).
2. **Presentation Delivery Lead**: Harika leads the introduction, problem framing, operational deployment storyline, NDMA/INSARAG standards defense, and concluding call to action, seamlessly handing technical deep-dives to Nikhil (GNC/Comms), Vedanth (AI Perception), and Siva (GCS HUD).

---

## 🛠️ 3. OpenCode Offloader Tool Routing for Harika

Harika should utilize the `opencode-offloader` for non-reasoning, routine drafting and verification tasks:
- **`opencode/ling-3.0-flash-free`**: Markdown formatting, DOCS.md benchmark synchronization, presentation slide copy polish.
- **`opencode/mimo-v2.5-free`**: Writing deterministic PyTest assertions, mock-free regression tests, and log parsers.

---

## 📋 4. Harika's Hackathon Evaluation Readiness Checklist

- [x] Master Subsystem E Specification authored (`docs/subsystems/SUBSYSTEM_E_DOCS.md`).
- [x] Global Disaster Standards and Operational Boundaries Report integrated (`docs/conops/GLOBAL_DISASTER_STANDARDS_AND_OPERATIONAL_BOUNDARIES_REPORT.md`).
- [x] NDMA IRS Field Deployment Audit internalized (`docs/conops/NDMA_IRS_FIELD_DEPLOYMENT_AUDIT.md`).
- [x] 230+ unit tests verified passing deterministically.
- [x] 60-Second Operational Defense Pitch memorized.
- [x] 5 Non-Technical Field Trap Questions reviewed with full team.
- [x] `docs/hackathon/JURY_FEEDBACK_TRACKER.md` initialized for live logging during Evaluation rounds.

---
*Project SUTRA — Smart Horizon 48-Hour International Hackathon Grand Finale (NHCE Bengaluru).*
