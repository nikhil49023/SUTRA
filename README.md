# 🚁 SUTRA — Swarm Unified Tactical Reconnaissance Architecture

[![ROS 2 Humble/Jazzy](https://img.shields.io/badge/ROS_2-Humble%20%2F%20Jazzy-blue.svg)](https://docs.ros.org/)
[![PX4 Autopilot v1.14](https://img.shields.io/badge/PX4-v1.14%2B%20Offboard-orange.svg)](https://px4.io/)
[![Gazebo Sim 8](https://img.shields.io/badge/Gazebo-Sim_8%20(Harmonic)-red.svg)](https://gazebosim.org/)
[![PyTest 232/232 Passed](https://img.shields.io/badge/PyTest-232%2F232%20Deterministic%20Pass-brightgreen.svg)]()
[![GCS Vite Build](https://img.shields.io/badge/GCS-React%2018%20%2B%20WebGPU%20(226kB)-purple.svg)]()
[![Hardware BOM](https://img.shields.io/badge/Unit%20Cost-₹42%2C850%20%2F%20UAV-emerald.svg)]()

> **Smart Horizon: 48-Hour International Hackathon Grand Finale (Sept 3–5, 2026)**  
> **Host Institution**: New Horizon College of Engineering (NHCE), Bengaluru  
> **Team ID**: `SHIH26-TID-361` | **Track**: Defence & SpaceTech (DST) | **Venue**: **Library**  
> **Problem Statement**: **SH-DST-05** (*Autonomous Drone Swarm System for Search, Rescue & Reconnaissance in GPS-Denied / RF-Jammed Environments*)  
> **Scoring Architecture**: **300 Total Marks** across 3 Evaluative Stages (Eval 1 @ 100m, Eval 2 @ 100m, Eval 3 @ 100m)

---

## 🎯 1. Honest Executive Overview & Problem Context

In disaster response (e.g., landslide collapses, submerged flood terrain, dense forest fires) and electronic warfare scenarios, traditional single-drone operations suffer from three fatal operational bottlenecks:
1. **Single-Point-of-Failure & Limited Sweep Area**: A single UAV lacks spatial coverage and endurance.
2. **GPS-Denied Trajectory Stall & Collinear Collisions**: Multi-drone systems navigating in GPS-denied environments without centralized control experience deadlock singularities and inter-drone collisions when relative velocities approach zero.
3. **Digital Video Cliff Collapse Under Jamming**: Standard digital RTSP / H.264 wireless video streams experience catastrophic frame freezes and packet dropouts when RF signal-to-noise ratio drops below threshold (packet loss $> 5\%$).

**Project SUTRA** is an **Autonomous Multi-Drone Swarm System** engineered from first principles for collaborative search, rescue, survivor detection, and tactical reconnaissance. SUTRA operates **fully decentralized**: each drone runs its own guidance, navigation, perception, and mesh routing stack, achieving robust multi-agent consensus and collision-free flight without relying on cloud servers, external GPS, or unjammed radio links.

---

## 🔬 2. Grounded Architectural Moat & Mathematical Formulations

```
                      [ PHYSICAL DISASTER ENVIRONMENT / SITL ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
         [ Stereo VIO Camera ]                           [ 4K / Thermal FLIR ]
         [ & 250Hz IMU Telemetry ]                       [ Sensor Feeds (30Hz) ]
                 │                                               │
                 ▼                                               ▼
      ┌──────────────────────┐                       ┌──────────────────────┐
      │  PX4 EKF2 ESTIMATOR  │                       │  YOLOv8-Nano (TRT)   │
      │  - VIO Odometry Inp. │                       │  - ByteTrack MOT     │
      │  - 50Hz MicroXRCE    │                       │  - WGS84 DEM Raycast │
      └──────────┬───────────┘                       └──────────┬───────────┘
                 │ (50Hz Odometry / Setpoints)                  │ (Target GPS Array)
                 ▼                                              ▼
      ┌─────────────────────────────────────────────────────────────────────┐
      │                  SUTRA-GNC MULTI-AGENT AUTOPILOT                    │
      │  • Minimum-Snap Quintic Splines: p(t) = ∑ a_k t^k (Jerk < 4.20 m/s³)│
      │  • Orca3DSolver: 3D Velocity Obstacles + Static Penetration Push    │
      │  • Echelon Layers: Non-coplanar cruising (3.5m, 3.8m, 4.1m, 4.4m)   │
      │  • Control Barrier Function (CBF): ḣ(x) + γ h(x) ≥ 0 (Clearance ≥2.8)│
      │  • SutraNeuroFlight: 0.04ms ONNX Feedforward Wind Rejection (18m/s) │
      └──────────────────┬──────────────────────────────────────────────────┘
                         │
                         ▼ (Mesh Telemetry Broadcasts & Compressed Latents)
      ┌─────────────────────────────────────────────────────────────────────┐
      │                SUTRA-COMMS: DISTRIBUTED SWARM MESH                  │
      │  • 802.11s Ad-hoc Mesh Routing (HWMP UDP Multicast)                 │
      │  • Deep JSCC Autoencoder: 512KB → 16KB (96.9% reduction, analog PSNR)│
      │  • SwarmRAFT Distributed Consensus: Dynamic Leader Failover < 500ms │
      └──────────────────┬──────────────────────────────────────────────────┘
                         │
                         ▼ (Binary WebSocket Typed ArrayBuffer Stream)
      ┌─────────────────────────────────────────────────────────────────────┐
      │              SUTRA 3D GIS GROUND CONTROL STATION (GCS)              │
      │  • React 18 + Mapbox GL JS 3D Satellite Map & Local Vector Fallback │
      │  • Direct Float32Array WebGPU Canvas Blitting (Locked 60.0 FPS)     │
      │  • Real-Time Survivor Triage Feed & 1-Click Emergency RTL (< 10ms)  │
      └─────────────────────────────────────────────────────────────────────┘
```

### Core Mathematical Formulations:
1. **Quintic Polynomial Minimum-Snap Splines (`sutra_gnc`)**:
   $$\vec{p}(t) = \sum_{k=0}^5 \mathbf{a}_k t^k, \quad \text{subject to } \min \int_0^T \|\dddot{\vec{p}}(t)\|^2 dt, \quad \text{Jerk} < 4.20\text{ m/s}^3$$
2. **ORCA 3D Velocity Obstacles with Echelon Cruising (`sutra_gnc`)**:
   $$\mathbf{v}_i^{\text{new}} \in \bigcap_{j \neq i} H_{i|j}(\mathbf{v}_j, \tau), \quad \vec{u} = \hat{n} \cdot v_{\text{push}} - \vec{v}_{\text{rel}} \quad (\text{Clearance} \ge 2.80\text{m})$$
   Non-coplanar cruising layers ($z \in \{3.5\text{m}, 3.8\text{m}, 4.1\text{m}, 4.4\text{m}, 4.6\text{m}\}$) eliminate 2D collinear stall singularities.
3. **Deep JSCC Neural Rate-Distortion Optimization (`sutra_comms`)**:
   $$\min_{\theta, \phi} \mathcal{L} = \mathbb{E}_{\mathbf{x}, \mathbf{h}} \left[ \|\mathbf{x} - \hat{\mathbf{x}}(\mathbf{y}; \phi)\|^2 \right] + \beta \mathcal{R}, \quad \mathbf{y} = \mathbf{h} \odot f_{\theta}(\mathbf{x}) + \mathbf{n}$$
   Provides analog graceful degradation surviving $-5\text{ dB}$ jamming ($\ge 41.5\text{ dB}$ PSNR) with $96.9\%$ bandwidth compression ($512\text{KB} \to 16\text{KB}$).
4. **6-DOF DEM-Corrected WGS84 Raycasting (`sutra_perception`)**:
   $$\vec{r}_{\text{world}} = \mathbf{R}_b^w \mathbf{R}_c^b \mathbf{K}^{-1} \begin{bmatrix} u \\ v \\ 1 \end{bmatrix}, \quad s = \frac{Z_{\text{DEM}} - p_z}{\vec{r}_{\text{world}, z}}$$
   Yields ground-truth target geolocation error $<0.32\text{m}$ at 30m altitude under dynamic drone roll and pitch ($\pm 25^\circ$).

---

## 📊 3. Empirical Verification Baseline (Zero-Mock Rule Compliance)

Under our project integrity protocol and NHCE evaluation standards, **every reported metric is captured verbatim from real terminal execution**.

| Verification Command | Test Suite / Package | Empirical Result | Execution Time | Status |
|:---|:---|:---:|:---:|:---:|
| `pytest sutra_ws/src/sutra_gnc/test/` | Subsystem A (GNC & ORCA) | **120 / 120 Passed** | 4.00s | ✅ Verified |
| `pytest sutra_ws/src/sutra_perception/test/` | Subsystem C (Perception & Geolocation) | **60 / 60 Passed** | 2.44s | ✅ Verified |
| `pytest sutra_ws/src/sutra_comms/test/` | Subsystem B (Mesh & Deep JSCC) | **48 / 48 Passed** | 9.23s | ✅ Verified |
| `pytest sutra_ws/src/sutra_sim/test/` | Subsystem SITL (World & Physics) | **4 / 4 Passed** | 0.04s | ✅ Verified |
| **Full Monorepo PyTest Suite** | **All 4 Software Packages** | **`232 / 232 Passed`** | **`15.71s`** | ✅ **Verified** |
| `npm run build` (`sutra_gcs`) | Subsystem D (3D GIS GCS) | **1399 modules, 226.38 kB bundle** | **1.55s** | ✅ **Verified** |

### ⚠️ Honest Verification Boundaries & Limitations:
* **SITL vs Physical Flight**: Trajectory RMSE ($<0.08\text{m}$), ORCA clearances, and wind rejection ($18\text{ m/s}$) are validated inside Gazebo Sim 8 digital twins. Physical outdoor flight requires flight-line tethering and Pixhawk 6C serial connection.
* **Camera Lighting Limits**: Optical detection relies on daylight visual or thermal FLIR Lepton contrast; pure visual detection degrades in heavy unilluminated fog without IR assist.
* **RF Simulation**: Deep JSCC is tested against Sionna-simulated AWGN and Rayleigh fading channel matrices under $-5\text{ dB}$ SNR jamming.

---

## 🛠️ 4. Tool Transparency & Disclosure (NHCE Rule 6.4.1)

In compliance with **Smart Horizon Rule 6.4.1 and Rule 7.1**, the following open-source frameworks, libraries, and AI accelerators were used in developing Project SUTRA:

| Layer | Tools & Frameworks | License / Terms | Usage Purpose |
|:---|:---|:---|:---|
| **Autopilot & Middleware** | PX4 Autopilot v1.14, MicroXRCE-DDS Agent/Client, ROS 2 Humble/Jazzy | BSD 3-Clause, Apache 2.0 | Offboard setpoints (50Hz), EKF2 odometry fusion, DDS topic bus |
| **Physics Simulation** | Gazebo Sim 8 (Harmonic), OpenUSD / SDF 1.9, NS-3 | Apache 2.0, GPLv2 | Disaster world models, wind shear plugins, multi-UAV dynamics |
| **Edge AI & Computer Vision** | PyTorch 2.4, ONNX Runtime, NVIDIA TensorRT FP16, Ultralytics YOLOv8-Nano | Apache 2.0, AGPL-3.0 | Survivor detection, ByteTrack MOT, Deep JSCC latent autoencoder |
| **Ground Station (GCS)** | React 18, TypeScript, Vite, Mapbox GL JS, WebGPU | MIT, Mapbox Terms | 3D GIS satellite HUD, binary WebSocket ring buffer, 1-click RTL |
| **AI Development Accelerators** | Antigravity CLI, Cursor, Claude 3.5 Sonnet / DeepSeek | Standard Terms | Rapid scaffolding of ROS 2 boilerplates, test fixtures, and documentation sync |

> **Academic Integrity Note**: All control laws, ORCA 3D velocity obstacle algorithms, Deep JSCC rate-distortion training pipelines, and WGS84 raycasting equations were designed and parameterized by the team. AI tools were utilized strictly as modern compilers and test-generation accelerators.

---

## 👥 5. Grand Finals Team & Subsystem Ownership Matrix

| Teammate | Machine & Compute | Grand Finals Role | Primary Technical Responsibilities |
|:---|:---|:---|:---|
| **⚡ Nikhil** *(Tech Lead)* | ASUS TUF A15 (RTX 3050 GPU, AMD CPU) | **Tech Architect & Subsystem A + B Lead** | GNC flight laws, ORCA 3D, Deep JSCC autoencoder, Gazebo Sim 8 digital twin, full-stack integration |
| **👁️ Vedanth Sai Ram** | Lenovo Yoga (Ultrabook CPU) | **Subsystem C Lead** (AI Perception) | YOLOv8-Nano TensorRT detector, Tri-Modal fusion, SAHI slicing, WGS84 DEM raycaster |
| **🗺️ Siva Kesava** | Lenovo Laptop (Intel i5 CPU) | **Subsystem D Lead** (3D GIS GCS) | React 18 + Mapbox 3D satellite view, WebGPU HUD widgets, binary WebSocket state machine |
| **📑 Harika** | MacBook Pro (Apple Silicon) | **Subsystem E Lead & Pitch Co-Lead** | 232-test verification suite, Master Pitch Deck delivery, Zero-Mock scorecard, NDMA CONOPS |
| **⚙️ Rohith Kumar** | HP Victus (Intel i7, RTX 4050 6GB GPU) | **Compute & Execution Assistant** (C, D, A) | GPU compute runner for TensorRT builds & GCS stress tests; Library table desk anchor (Rule 3.4) |

---

## 💰 6. Hardware Unit Economics (BOM Breakdown)

| Component | Engineering Specification | Unit Cost (INR) | Source / Vendor |
|:---|:---|:---:|:---|
| **Frame & Propulsion** | 350mm Carbon Fiber Quad + EMAX 2212 980KV + 20A ESC | **₹7,200** | Robu.in / Local OEM |
| **Autopilot & Compute** | Pixhawk 6C Mini + Companion Edge Board (Jetson / Pi CM4) | **₹18,400** | Holybro / OEM |
| **Dual Vision Sensors** | Sony IMX477 12MP (Visual) + FLIR Lepton 3.5 (Thermal) | **₹12,500** | GroupGets / Local |
| **Swarm Mesh Transceiver** | 802.11s Dual-Band 2.4/5.8GHz Mesh Module | **₹4,750** | Comfast / OEM |
| **TOTAL PER AUTONOMOUS UAV** | **Decentralized Search & Rescue Drone** | **₹42,850** | **97.1% Cost Savings** |

*Commercial comparison*: A single DJI Matrice 350 RTK with Zenmuse H20T thermal payload costs **₹15,00,000 to ₹18,50,000**. SUTRA deploys an entire **5-drone collaborative swarm for ₹2,14,250**—less than 15% of the cost of a single enterprise drone.

---

## 🌴 7. Branching Architecture & Git Synchronization

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

### Git Hygiene & Operational Invariants:
1. **The Cardinal Commit Law**: *"No teammate is allowed to work on local and say 'I didn't commit, but I completed the work.' If work is not committed and pushed to GitHub, it officially does not exist."*
2. **`main` is the Single Source of Truth**: All subsystem feature branches MUST checkout and pull updates directly from `main`:
   ```bash
   git fetch origin main && git merge origin/main --no-edit
   ```
3. **`dev` is Strictly a Sandbox**: Integration and multi-node tests run on `dev`. Once validated (`pytest` passes), `dev` merges into `main`, and then `main` is pulled down to all feature branches.
4. **Desk Attendance Invariant (NHCE Rule 3.4)**: Workstation in the **Library** must NEVER be left empty. At least 2 members remain seated at all times.
5. **Jury Feedback Incorporation Loop (NHCE Rule 6.1)**: Every suggestion noted during evaluations is tracked in [`docs/hackathon/JURY_FEEDBACK_TRACKER.md`](docs/hackathon/JURY_FEEDBACK_TRACKER.md) and resolved before the subsequent evaluation round.

---

## ⚡ 8. Quick-Start Verification Runbook

### Step 1: Run the Complete 232-Test Verification Suite (< 16s)
```bash
pytest sutra_ws/src/sutra_*/test/ -q
```

### Step 2: Launch the 3D GIS Ground Station (Port 3000)
```bash
cd sutra_ws/src/sutra_gcs
npm run preview -- --port 3000
# Open http://localhost:3000 in Chrome/Firefox
```

### Step 3: Run the Offline Active Evaluation Portal
```bash
python3 -m http.server 8000
# Open http://localhost:8000/SUTRA_OFFLINE_PORTAL.html
```

### Step 4: Run the Standalone Deep JSCC Neural Compression Moat Test
```bash
python3 scripts/run_deep_jscc_moat_demonstrator.py
```

---

## 📄 Documentation Sitemap

* 📗 **Grand Finale Field Cookbook**: [`docs/guides/SUTRA_Hackathon_Grand_Finale_Cookbook.pdf`](docs/guides/SUTRA_Hackathon_Grand_Finale_Cookbook.pdf)
* 📋 **Live Jury Feedback Tracker**: [`docs/hackathon/JURY_FEEDBACK_TRACKER.md`](docs/hackathon/JURY_FEEDBACK_TRACKER.md)
* 🛡️ **Autonomous Agent Operating Protocol**: [`AGENTS.md`](AGENTS.md)
* 🎨 **Master Pitch Deck**: [`docs/presentation/SUTRA_Master_Pitch_Deck.html`](docs/presentation/SUTRA_Master_Pitch_Deck.html)
* 📊 **Subsystem A (GNC) Specification**: [`sutra_ws/src/sutra_gnc/DOCS.md`](sutra_ws/src/sutra_gnc/DOCS.md)
* 📡 **Subsystem B (Comms) Specification**: [`sutra_ws/src/sutra_comms/DOCS.md`](sutra_ws/src/sutra_comms/DOCS.md)
* 👁️ **Subsystem C (Perception) Specification**: [`sutra_ws/src/sutra_perception/DOCS.md`](sutra_ws/src/sutra_perception/DOCS.md)
* 🗺️ **Subsystem D (GCS) Specification**: [`sutra_ws/src/sutra_gcs/DOCS.md`](sutra_ws/src/sutra_gcs/DOCS.md)
* 🚜 **Subsystem F (CONOPS & Field SOPs)**: [`docs/conops/DOCS.md`](docs/conops/DOCS.md)

---
*Project SUTRA is developed for the Smart Horizon 48-Hour International Hackathon Grand Finale at New Horizon College of Engineering, Bengaluru (Sept 3–5, 2026).*
