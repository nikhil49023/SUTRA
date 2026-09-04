# 🛡️ SUTRA — Master Architectural Audit & Dual-Mode Grant Plan

> **Mission**: Swarm Unified Tactical Reconnaissance Architecture (Project SUTRA) — Autonomous Multi-Drone Swarm System for GPS-Denied & Comms-Challenged Disaster Environments.  
> **Core Strategy**: 100% Dual-Compatible Software & Simulation Stack (`sim_mode:=true / false`).  
> **Target Audience**: Grant Evaluators, Student Engineering Competitions & University Research Labs.  
> **Date**: August 03, 2026  
> **Author & Lead Architect**: Nikhil ⚡  
> **Document Version**: 4.0 (Dual-Mode Grant Ready)

---

## ⚡ 1. The Grant-Winning Strategy: Dual Hardware Readiness

Project SUTRA's master launch pipeline (`sutra_master_swarm_integration.launch.py`) is engineered to be **100% Dual-Compatible** out of the box. Whichever budget amount is granted, the software requires zero code modifications:

```bash
# 🔹 CASE A: Option A (1 Physical F450 Drone + Gazebo SITL Swarm Digital Twin - $269 / ₹22,450)
ros2 launch sutra_sim sutra_master_swarm_integration.launch.py sim_mode:=true

# 🔹 CASE B: Option B (3 Physical Micro ESP32-S3 Hardware Drones - $145 / ₹12,000)
ros2 launch sutra_sim sutra_master_swarm_integration.launch.py sim_mode:=false
```

---

## 💰 2. Budget Comparison Table

| Budget Option | Physical Hardware | Cost (INR) | Cost (USD) | Primary Showcase Output |
|---|---|:---:|:---:|---|
| **Option A (Hybrid SITL)** | 1x F450 Multi-Rotor Prototype (Pixhawk 2.4.8 + RPi 4/5 + LoRa) | **₹22,450** | **$269** | Real hardware video/flight + 10-UAV Gazebo SITL Swarm Digital Twin on 3D Map |
| **Option B (Micro Swarm)** | 3x ESP32-S3 CAM Micro Drones + LoRa modules | **₹12,000** | **$145** | 3 Real physical micro drones performing live battery-pull SwarmRAFT failover on stage |

---

## 📊 3. Verification & Build Integrity (Current Working State)

* **Python Unit & Integration Test Suites**: **87 passed in 9.45s** (`pytest sutra_ws/src/sutra_gnc/test/ sutra_ws/src/sutra_comms/test/ sutra_ws/src/sutra_perception/test/`)
* **3D GIS GCS Web App Production Build**: **Clean Build Passed in 1.35s** (1,396 modules transformed via Vite v5.4.21)
* **Gazebo Sim Physics Solver**: **RTF = 1.000** (500 Hz DART solver)

---

## 🎯 4. Verification Gates G1–G6 Alignment Matrix

| Gate | Focus | Target Metric | Verification Command / Tool | Status |
|---|---|---|---|:---:|
| **G1** | Physics & Telemetry Sync | Real-Time Factor (RTF) $\ge 0.98$ | Gazebo SITL Engine Stats | ✅ **PASSED** |
| **G2** | Swarm Mesh & Consensus | Latency $< 8\text{ ms}$, Failover $< 50\text{ ms}$ | `pytest sutra_ws/src/sutra_comms/test/` | ✅ **PASSED** |
| **G3** | Edge AI Perception | mAP@0.5 $\ge 20\%$, Latency $< 10\text{ ms}$ | `pytest sutra_ws/src/sutra_perception/test/` | ✅ **PASSED** |
| **G4** | Target Geolocation | WGS84 Error $< 0.8\text{ m}$ | `pytest sutra_ws/src/sutra_perception/test/` | ✅ **PASSED** |
| **G5** | ORCA 3D Avoidance | Safety Buffer $> 2.8\text{ m}$ | `pytest sutra_ws/src/sutra_gnc/test/` | ✅ **PASSED** |
| **G6** | Telemetry HUD | Framerate = 60 FPS Locked | `cd sutra_ws/src/sutra_gcs && npm run build` | ⚠️ **BUILD PASSED / RUNTIME UNTESTED** |
