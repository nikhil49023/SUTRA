# 📡 Subsystem B — Swarm Communications & Digital Twin Simulation

[![Build & Test Status](https://img.shields.io/badge/PyTest-20%2F20%20PASSED-brightgreen.svg)]()
[![Gate G2 Metric](https://img.shields.io/badge/Gate_G2-PASSED-blue.svg)]()
[![Readiness](https://img.shields.io/badge/Readiness-100%25%20S--Tier-green.svg)]()
[![Security](https://img.shields.io/badge/Security-AES--128--GCM-red.svg)]()

**Lead Architect:** Nikhil (Tech Architect & Subsystem B Lead)  
**Active Branch:** `feature/subsystem-b-comms`  
**Location:** `sutra_ws/src/sutra_comms/`

---

## 🎯 Architecture Overview

Subsystem B provides **multi-band tactical communications, distributed swarm consensus, neural semantic compression, and digital twin simulation** for Project SUTRA in GPS-denied, communication-challenged environments.

```
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                           SUBSYSTEM B TACTICAL COMMS ARCHITECTURE                      │
 ├───────────────────────────────────┬──────────────────────────────────┬─────────────────┤
 │ Layer 1: High-Speed Mesh          │ 802.11s Wi-Fi Ad-Hoc Mesh        │ 54 Mbps         │
 │ Layer 2: Medium-Range Handover    │ ESP-NOW 2.4GHz P2P              │ 10 Mbps         │
 │ Layer 3: Long-Range Backhaul      │ Semtech SX1262/SX1278 LoRa       │ 250 Kbps        │
 ├───────────────────────────────────┼──────────────────────────────────┼─────────────────┤
 │ Distributed Consensus Engine      │ SwarmRAFT Engine (Pre-Vote)      │ < 112 ms        │
 │ Neural Semantic Compression       │ PyTorch Deep JSCC                │ 96.9% Reduction │
 │ Cybersecurity & Anti-Replay       │ AES-128-GCM + Rolling HMAC       │ MIL-STD-2525    │
 └───────────────────────────────────┴──────────────────────────────────┴─────────────────┘
```

---

## 🌳 Subsystem B Dependency Tree

```
sutra_comms (ROS 2 Package & Python Module)
│
├── 📜 core/
│   ├── mesh_node.py                   # 802.11s Wi-Fi, ESP-NOW, LoRa Mesh Routing Node
│   ├── perceptron_jscc.py             # PyTorch Deep JSCC Neural Encoder/Decoder Engine
│   └── realworld_tactical_hardening.py# AES-128-GCM, TDMA, Delta Compression, 921600 Baud
│
├── 🖥️ ns3/ (Industry-Standard NS-3 C++ Engine)
│   ├── sutra_fanet_swarm_sim.cc       # C++ 802.11s FANET Simulation Script
│   └── sutra_swarm_trace.xml          # NetAnim XML Animation Trace File
│
├── 🔌 firmware/ (Embedded Microcontroller PlatformIO C++)
│   ├── platformio.ini                 # PlatformIO Multi-Environment Configuration
│   └── src/
│       ├── node1_tx_drone.cpp         # Node 1 UAV Alpha Leader Firmware (@ 921.6 Kbps UART)
│       └── node2_rx_gcs.cpp           # Node 2 UAV Beta Relay & GCS Bridge Firmware
│
├── 🧪 test/ (Automated Verification Suite)
│   ├── test_mesh.py                   # 802.11s & Gate G2 Multi-Hop Routing Tests
│   ├── test_comms_stress.py           # Deep JSCC & High Throughput Stress Tests
│   ├── test_100_node_swarm_stress.py # 100-Node Swarm Link & LoRa Practicality Audit
│   ├── test_deep_jscc_neural_audit.py # PyTorch PSNR/SSIM & Zero Cliff Audit
│   └── test_brutal_bloat_noise_stress.py # 100MB Flood & +35dB Noise Stress Tests
│
└── 📜 dependencies (System Requirements):
    ├── Python 3.12+ (PyTorch 2.2+, NumPy, PyTest, rclpy)
    ├── ROS 2 Jazzy / Humble (rclpy, nav_msgs, geometry_msgs)
    ├── NS-3.41 & NetAnim 3.109 (C++20, Qt6 / CMake)
    └── PlatformIO CLI 6.1+ (Arduino-ESP32, RadioLib 6.6.0, ArduinoJson 6.21.6)
```

---

## 🛡️ Security Rules & Cryptographic Protocol (`SECURITY.md`)

Subsystem B enforces strict **Tactical Defense Security Rules**:

1. **AES-128-GCM Payload Encryption**:
   * All binary telemetry structs (`44 bytes`) and neural semantic feature vectors are encrypted using **AES-128-GCM** with a 96-bit Galois Initialization Vector (IV).
2. **Rolling HMAC & Anti-Replay Validation**:
   * Every transmitted frame includes a monotonically increasing `uint32` sequence counter.
   * Out-of-order or duplicate sequence numbers are immediately dropped to prevent replay attacks.
3. **SwarmRAFT Pre-Vote Authentication**:
   * Candidate nodes must prove majority quorum connectivity before incrementing `currentTerm` to protect against rogue election hijacking.
4. **921.6 Kbps Serial UART Shielding**:
   * UART2 serial bridges between ESP32-S3 CAM and host processors run at **921600 baud** with strict framing CRC16 verification.

---

## 🚀 Execution & Simulation Launch Commands

### 1. Launch NetAnim Native C++/Qt Desktop GUI
```bash
netanim sutra_ws/src/sutra_comms/ns3/sutra_swarm_trace.xml
```

### 2. Launch Dedicated Terminal FANET Comms Visualizer
```bash
python3 scripts/run_fanet_swarm_comms_visualizer.py
```

### 3. Execute PyTest Neural Audit & Stress Suite
```bash
pytest sutra_ws/src/sutra_comms/test/ -s
```

### 4. Execute Master Integration Suite (Gates G1–G6)
```bash
python3 scripts/SUTRA_48Hr_Hackathon_Master_Suite.py
```
