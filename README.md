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
│       ├── sutra_gnc/             # Subsystem A: Autonomous Navigation, GNC & PX4 (Rohith)
│       ├── sutra_comms/           # Subsystem B: Swarm Mesh & Deep JSCC Neural Encoders (Nikhil)
│       ├── sutra_perception/      # Subsystem C: Tri-Modal AI Perception & Sensor Fusion (Vedanth)
│       ├── sutra_gcs/             # Subsystem D: 3D GIS Ground Control Station & HSI HUD (Siva Kesava)
│       └── sutra_sim/             # Subsystem B & E: Gazebo SITL Simulation & World Models
├── docs/                           # Subsystem E: System Specs, Verification Audits, Guides (Harika)
├── scripts/                        # Automated Rehearsal & Integration Test Scripts
├── .github/                        # CI/CD Workflows, Issue & PR Templates
├── docker-compose.yml              # Containerized Local Development Setup
└── Dockerfile                      # Standardized Build Container
```

---

| Subsystem | Scope / Responsibilities | Lead Engineer | Target Stack & Status |
| :--- | :--- | :--- | :--- |
| **Subsystem A** | Autonomous Navigation, GNC, PX4 Offboard Mode, ORCA Avoidance | **Rohith Kumar** | ROS 2, PX4 Autopilot, MicroXRCE-DDS |
| **Subsystem B** | Swarm Mesh, Deep JSCC Neural Encoders, NS-3 & Gazebo Sim | **Nikhil** | [Subsystem B README](sutra_ws/src/sutra_comms/README.md) \| PyTorch, NS-3 NetAnim, 802.11s **(100% Ready)** |
| **Subsystem C** | Tri-Modal AI Perception, YOLOv8 TensorRT, Target Geolocation | **Vedanth Sai Ram** | OpenCV, TensorRT, YOLOv8-Nano, ONNX |
| **Subsystem D** | 3D GIS Ground Control Station, React + Mapbox GL JS, WebGPU HUD | **Siva Kesava** | React, TypeScript, Mapbox GL JS, WebGPU |
| **Subsystem E** | Technical Documentation, Gate Metric Audits (G1-G6), Flight Logs | **Harika** | Markdown, Verification Metric Suite, Latex |

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

### 3. Execute 5-Subsystem Integration Rehearsal
```bash
python3 scripts/SUTRA_48Hr_Hackathon_Master_Suite.py
```

---

## 📚 Subsystem Role Documentation

Each subsystem maintains a dedicated, statistically detailed `DOCS.md` file authored and kept up-to-date by its lead engineer. These files contain benchmark tables, latency/memory figures, dependency trees, and Gate verification status.

| Subsystem | Lead | Dedicated DOCS |
|:---|:---|:---|
| **A — GNC & Flight Control** | Rohith Kumar | [SUBSYSTEM_A_GNC.md](docs/subsystems/SUBSYSTEM_A_GNC.md) |
| **B — Comms & Simulation** | Nikhil | [SUBSYSTEM_B_COMMS.md](docs/subsystems/SUBSYSTEM_B_COMMS.md) |
| **C — AI Edge Perception** | Vedanth Sai Ram | [SUBSYSTEM_C_PERCEPTION.md](docs/subsystems/SUBSYSTEM_C_PERCEPTION.md) |
| **D — 3D GIS GCS Dashboard** | Siva Kesava | [SUBSYSTEM_D_GCS.md](docs/subsystems/SUBSYSTEM_D_GCS.md) |
| **E — Docs & Verification Audits** | Harika | [SUBSYSTEM_E_SIM.md](docs/subsystems/SUBSYSTEM_E_SIM.md) |

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
