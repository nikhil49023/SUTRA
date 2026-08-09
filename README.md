# 🚁 SUTRA — Swarm Unified Tactical Reconnaissance Architecture

[![ROS 2 Jazzy](https://img.shields.io/badge/ROS_2-Jazzy-blue.svg)](https://docs.ros.org/en/jazzy/)
[![Gazebo Sim 8](https://img.shields.io/badge/Gazebo-Sim_8-orange.svg)](https://gazebosim.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI Build Status](https://github.com/Team-Offgrid/SUTRA/actions/workflows/ros2-ci.yml/badge.svg)](https://github.com/Team-Offgrid/SUTRA/actions)

> **Team Offgrid**: Autonomous Multi-Drone Swarm System for Collaborative Search-and-Rescue (SAR), Survivor Detection, Threat Identification & Tactical Reconnaissance in Disaster-Hit, Forested, and GPS-Denied Environments.

---

## 📐 Monorepo Subsystem Architecture

```
SUTRA/
├── sutra_ws/                       # ROS 2 Colcon Workspace
│   └── src/
│       ├── sutra_gnc/             # Subsystem A: Autonomous Navigation & GNC (Nikhil [Lead] & Rohith [Initial Contributor])
│       ├── sutra_comms/           # Subsystem B: Swarm Mesh & Deep JSCC Neural Encoders (Nikhil)
│       ├── sutra_perception/      # Subsystem C: Tri-Modal AI Perception & Sensor Fusion (Vedanth)
│       ├── sutra_gcs/             # Subsystem D: 3D GIS Ground Control Station & HSI HUD (Siva Kesava)
│       └── sutra_sim/             # Subsystem B & E: Gazebo SITL Simulation & World Models
├── docs/                           # Subsystem E & F: System Specs, Verification Audits, CONOPS, SOPs
│   └── conops/                    # Subsystem F: NDMA CONOPS, Rescue Profiles & Field SOPs (Rohith)
├── scripts/                        # Automated Rehearsal & Integration Test Scripts
├── .github/                        # CI/CD Workflows, Issue & PR Templates
├── docker-compose.yml              # Containerized Local Development Setup
└── Dockerfile                      # Standardized Build Container
```

---

| Subsystem | Scope / Responsibilities | Lead Engineer | Target Stack & Status |
| :--- | :--- | :--- | :--- |
| **Subsystem A** | Autonomous Navigation, GNC, PX4 Offboard Mode, ORCA Avoidance | **Nikhil** *(Tech Lead)*<br>*(Initial Work: Rohith Kumar)* | ROS 2, PX4 Autopilot, MicroXRCE-DDS **(Verified)** |
| **Subsystem B** | Swarm Mesh, Deep JSCC Neural Encoders, NS-3 & Gazebo Sim | **Nikhil** | [Subsystem B README](sutra_ws/src/sutra_comms/README.md) \| PyTorch, NS-3 NetAnim, 802.11s **(100% Ready)** |
| **Subsystem C** | Tri-Modal AI Perception, YOLOv8 TensorRT, Target Geolocation | **Vedanth Sai Ram** | OpenCV, TensorRT, YOLOv8-Nano, ONNX |
| **Subsystem D** | 3D GIS Ground Control Station, React + Mapbox GL JS, WebGPU HUD | **Siva Kesava** | React, TypeScript, Mapbox GL JS, WebGPU |
| **Subsystem E** | Technical Documentation, Gate Metric Audits (G1-G6), Pitch Deck Formatting & Media | **Harika** | Markdown, Verification Metric Suite, Presentation Design |
| **Subsystem F** | NDMA Rescue CONOPS, Disaster Scenario Profiles, Field SOP Checklist, Operational Storytelling | **Rohith Kumar** | NDMA Guidelines, Field SOPs, Mission Storytelling **(Specified)** |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Ubuntu 24.04 LTS** or **Ubuntu 22.04 LTS**
- **ROS 2 Jazzy** or **Humble**
- **Gazebo Sim 8 (Harmonic / Jazzy)**
- **Python 3.10+** & **Node.js 18+**

### 1. Build the ROS 2 Monorepo
```bash
cd sutra_ws
colcon build --symlink-install
source install/setup.bash
```

### 2. Launch Ground Control Station (Subsystem D)
```bash
cd sutra_ws/src/sutra_gcs
npm install
npm run dev
```

### 3. Execute 6-Subsystem Integration Rehearsal
```bash
python3 scripts/SUTRA_48Hr_Hackathon_Master_Suite.py
```

---

## 📚 Subsystem Role Documentation

Each subsystem maintains a dedicated, statistically detailed `DOCS.md` file authored and kept up-to-date by its lead engineer. These files contain benchmark tables, latency/memory figures, dependency trees, and Gate verification status.

| Subsystem | Lead | Dedicated DOCS |
|:---|:---|:---|
| **A — GNC & Flight Control** | Nikhil *(Initial: Rohith)* | [sutra_ws/src/sutra_gnc/DOCS.md](sutra_ws/src/sutra_gnc/DOCS.md) |
| **B — Comms & Simulation** | Nikhil | [sutra_ws/src/sutra_comms/DOCS.md](sutra_ws/src/sutra_comms/DOCS.md) |
| **C — AI Edge Perception** | Vedanth Sai Ram | [sutra_ws/src/sutra_perception/DOCS.md](sutra_ws/src/sutra_perception/DOCS.md) |
| **D — 3D GIS GCS Dashboard** | Siva Kesava | [sutra_ws/src/sutra_gcs/DOCS.md](sutra_ws/src/sutra_gcs/DOCS.md) |
| **E — Docs & Verification Audits** | Harika | [docs/plans/SUTRA_Team_Roadmaps.md](docs/plans/SUTRA_Team_Roadmaps.md) |
| **F — Tactical Ops & Field Deployment** | Rohith Kumar | [docs/conops/DOCS.md](docs/conops/DOCS.md) |

> 📌 **Agent Protocol**: See [AGENTS.md](AGENTS.md) for the full autonomous agent operating rules, branching hygiene, and Gate G1–G6 verification targets that all teammates must follow.

---

## 🤝 Collaboration & Branching Strategy

- `main`: Protected branch. Requires at least 1 review approval and passing CI checks.
- `dev`: Integration branch for active sprint features.
- `feature/<subsystem>-<feature-name>`: Feature branch naming standard (e.g. `feature/subsystem-a-px4-offboard`, `feature/subsystem-b-deep-jscc`).

See [CONTRIBUTING.md](CONTRIBUTING.md) for full branch rules and pull request instructions.

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).
