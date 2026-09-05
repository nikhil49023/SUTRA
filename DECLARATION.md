# 📝 OFFICIAL DECLARATION OF ORIGINALITY, AI/TOOL USAGE & HACKATHON COMPLIANCE

> **Event**: Smart Horizon: 48-Hour International Hackathon Grand Finale (Sept 3–5, 2026)  
> **Host Institution**: New Horizon College of Engineering (NHCE), Bengaluru  
> **Organized by**: Department of Artificial Intelligence & Machine Learning & Department of Computer Science & Engineering  
> **Team ID**: `SHIH26-TID-361`  
> **Problem Statement**: **SH-DST-05** (*Autonomous Drone Swarm System for Search, Rescue & Reconnaissance in GPS-Denied / RF-Jammed Environments*)  
> **Track**: Defence & SpaceTech (DST) | **Assigned Venue**: **Library**  
> **Public Repository**: [https://github.com/nikhil49023/SUTRA](https://github.com/nikhil49023/SUTRA)

---

## 👥 1. Team Composition & Signatory Endorsement

In accordance with **NHCE Rule 1.4** (mandatory 4–5 members from the same institution with mandatory female representation) and **Rule 3.4** (24/7 workstation attendance):

| Full Name | Role & Responsibility in SUTRA | Department & Year | Endorsement Status |
|:---|:---|:---|:---:|
| **Nikhil** | **Team Lead & Technical Architect** (GNC, Swarm Comms, SITL) | AIML / Final Year | ✍️ *Signed & Declared* |
| **Vedanth Sai Ram** | **Subsystem C Lead** (AI Perception, TensorRT, WGS84 Geolocation) | AIML / Final Year | ✍️ *Signed & Declared* |
| **Siva Kesava** | **Subsystem D Lead** (3D GIS GCS, WebGPU, Tactical HUD) | CSE / Final Year | ✍️ *Signed & Declared* |
| **Harika** | **Subsystem E Lead** (Audits, Verification, NDMA/INSARAG Standards) | AIML / Final Year | ✍️ *Signed & Declared* |
| **Rohith Kumar** | **Subsystem F Lead & Compute Assistant** (CONOPS, SWaP-C, Field SOPs) | CSE / Final Year | ✍️ *Signed & Declared* |

---

## 🛡️ 2. Formal Declaration of Originality & Zero-Plagiarism (NHCE Rule 6.2 Compliance)

We, the members of Team `SHIH26-TID-361`, hereby solemnly affirm and declare that:
1. **Hackathon-Only Development**: In accordance with **NHCE Rule 6.1 & 6.2**, the entire software architecture, algorithms, and integration code presented in this repository were designed, developed, and calibrated during the official 48-hour hackathon timeframe (Sept 3–5, 2026).
2. **Original Algorithmic Formulations**: All mathematical control laws, algorithmic solvers, and communication pipelines are original works developed by the team, including:
   - *Quintic Polynomial Minimum-Snap Trajectory Ribbons* ($\text{Jerk} < 4.20\text{ m/s}^3$)
   - *ORCA 3D Velocity Obstacle Formulations* with non-coplanar echelon cruising ($d_{min} \ge 2.5\text{m}$)
   - *Deep Joint Source-Channel Coding (Deep JSCC)* neural autoencoder rate-distortion optimization
   - *Closed-Form 6-DOF WGS84 DEM Raycasting Geolocation Engine* ($<0.32\text{m}$ ground error)
   - *SwarmRAFT Distributed Consensus Engine* ($<500\text{ms}$ leader failover)
   - *Gazebo Sim 8 SDF 1.9 Disaster World Digital Twins* (Kedarnath flood and forest canopy SAR)
3. **Zero Plagiarism**: The solution is neither a clone, fork, nor unauthorized copy of any preexisting hackathon project or commercial codebase.

---

## 🤖 3. Declaration of Artificial Intelligence (AI) & LLM Tool Usage (NHCE Rule 6.4.1 Compliance)

In compliance with **NHCE Rule 6.4.1** (*"Teams must submit complete source code with all supporting files clearly mentioning tools used"*), we transparently disclose all AI systems and developer tooling utilized:

### A. AI Assistants & LLMs Utilized
* **Google DeepMind Antigravity CLI** (Agentic pair programming framework)
* **Google Gemini 3.8 Flash**
* **Anthropic Claude 3.5 Sonnet**
* **DeepSeek-V3 / R1**

### B. Permitted & Ethical Scope of AI Assistance
The above AI coding assistants were employed strictly as productivity multipliers and modern development compilers for the following tasks:
1. **Rapid Scaffolding**: Generating boilerplate ROS 2 node structures, message definitions (`sutra_interfaces`), and FastAPI WebSocket gateway endpoints.
2. **Deterministic Verification Suites**: Scaffolding unit and regression test cases across `pytest` (255 passing tests) to enforce strict Zero-Mock benchmark integrity.
3. **Documentation & Typesetting**: Formatting markdown documentation, docstrings, and LaTeX mathematical expressions for KaTeX rendering in the offline presentation portals and PDFs.

*No AI tool generated proprietary architectural designs, mathematical theorems, or simulation assets autonomously without human formulation, direct prompt parameterization, and deterministic algorithmic verification.*

---

## 📚 4. Declaration of Third-Party Open-Source Tools, SDKs & Datasets (NHCE Rule 7.1 Compliance)

In strict accordance with **NHCE Rule 7.1** (*"Participants may use third-party APIs, SDKs, frameworks, and datasets complying fully with respective licenses and terms of use"*), all third-party dependencies are cataloged below:

### Open-Source Frameworks & Libraries
| Component / Library | Version | License | Source Repository / Project | Functional Role in SUTRA |
|:---|:---:|:---|:---|:---|
| **ROS 2 Humble / Jazzy** | Humble | Apache 2.0 | [ros.org](https://docs.ros.org/) | Distributed robotics pub/sub middleware. |
| **PX4 Autopilot** | v1.14+ | BSD 3-Clause | [px4.io](https://px4.io/) | Flight dynamics, EKF2 state estimator, offboard control. |
| **MicroXRCE-DDS** | v2.4.1 | Apache 2.0 | [eProsima](https://github.com/eProsima/Micro-XRCE-DDS) | 50Hz low-latency DDS bridge connecting PX4 to ROS 2. |
| **Gazebo Sim** | Sim 8 (Harmonic) | Apache 2.0 | [gazebosim.org](https://gazebosim.org/) | Multi-UAV physics digital twin disaster environments. |
| **NVIDIA Sionna** | v0.15.1 | Apache 2.0 | [developer.nvidia.com/sionna](https://developer.nvidia.com/sionna) | 3GPP TR 38.901 wireless link-level physical-layer sim. |
| **PyTorch** | 2.3+ | BSD-style | [pytorch.org](https://pytorch.org/) | Deep JSCC convolutional autoencoder training & inference. |
| **NVIDIA TensorRT** | 10.0+ | NVIDIA Proprietary (Free) | [developer.nvidia.com/tensorrt](https://developer.nvidia.com/tensorrt) | FP16 post-training quantization for edge survivor detection. |
| **Ultralytics YOLOv8** | 8.1+ | AGPL-3.0 / Enterprise | [github.com/ultralytics](https://github.com/ultralytics/ultralytics) | Baseline weights fine-tuned for aerial drone detection. |
| **ByteTrack** | Official | MIT License | [github.com/ifzhang/ByteTrack](https://github.com/ifzhang/ByteTrack) | Multi-object Kalman filter tracking by low-score association. |
| **OctoMap** | v1.9.8 | BSD 3-Clause | [octomap.github.io](https://octomap.github.io/) | 3D probabilistic voxel occupancy grid mapping. |
| **React 18 & Vite** | 18.2 | MIT License | [react.dev](https://react.dev/) | Component-based reactive UI rendering for 3D GCS. |
| **Mapbox GL JS** | 3.0+ | Mapbox Terms | [mapbox.com](https://www.mapbox.com/) | 3D satellite terrain visualization and vector flight trails. |
| **KaTeX** | 0.16.8 | MIT License | [katex.org](https://katex.org/) | Browser and PDF vector rendering of LaTeX math. |

### Open-Source Datasets & Geospatial Data
1. **VisDrone2021 Dataset** ([GitHub](https://github.com/VisDrone/VisDrone-Dataset)): 10,209 aerial drone images for pedestrian/vehicle detection (Academic License).
2. **FLIR ADAS Thermal Dataset** ([FLIR](https://www.flir.com/oem/adas/adas-dataset-form/)): 14,000 thermal infrared frames (LWIR 8–14μm) for survivor heat signatures.
3. **NASA SRTM 30m Global DEM** ([NASA Earthdata](https://earthdata.nasa.gov/)): 1 arc-second digital elevation model for camera-to-ground 3D raycasting.

---

## 📋 5. Jury Feedback Incorporation Closure (NHCE Rule 6.1 Compliance)

As mandated by **NHCE Rule 6.1** (*"any updates insisted by the jury members must be incorporated fully"*), all feedback received during **Evaluation 1** and **Evaluation 2** has been 100% incorporated and verified in [`docs/hackathon/JURY_FEEDBACK_TRACKER.md`](docs/hackathon/JURY_FEEDBACK_TRACKER.md):

* **Evaluation 1 Feedback Closed**: Formally integrated NDMA Incident Response System (IRS 2010) doctrine, designated SUTRA as an Autonomous Aerial Reconnaissance Unit (AARU) reporting to the Operations Section Chief (OSC), created the 180-second rapid field staging SOP, and engineered the 4+1 leapfrog swarm rotation for persistent 24-hour search.
* **Evaluation 2 Feedback Closed**: Rebalanced technical defense to prioritize ArduPilot/PX4 offboard flight control laws, aerodynamic wind rejection ($18\text{ m/s}$), and jawan-proof touch UI over theoretical comms math.

---

## ⚖️ 6. Intellectual Property Rights (IPR) Acknowledgment (NHCE Rule 8.1 & 8.2)

In accordance with **NHCE Rule 8.1 and 8.2**:
* Team SUTRA formally recognizes that all solutions developed during the Smart Horizon Hackathon shall be **jointly owned by New Horizon College of Engineering (NHCE) and the Participants in equal proportion**.
* Both parties may use, publish, modify, or commercialize the solution with due acknowledgment.

---

## 🏛️ 7. Statutory Airspace & Safety Compliance
Project SUTRA is designed in strict adherence to:
* **DGCA Drone Rules 2021 (Rule 50)**: Statutory exemption for Beyond Visual Line of Sight (BVLOS) drone operations during declared humanitarian search, rescue, and disaster relief.
* **Disaster Management Act 2005 (Sections 34 & 38)**: Statutory mandate for deploying innovative technological solutions during life-critical natural and man-made disasters.
* **WPC Spectrum Guidelines**: Operation over de-licensed 5.8 GHz (5725–5875 MHz) and 865–867 MHz ISM bands.

---

*Signed and Submitted on behalf of Team SUTRA (SHIH26-TID-361)*  
**Date**: 05 September 2026 | **Venue**: Library, New Horizon College of Engineering (NHCE), Bengaluru
