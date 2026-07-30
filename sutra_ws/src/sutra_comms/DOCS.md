# 📡 Subsystem B — Comms & Digital Twin Simulation Documentation

[![PyTest Suite](https://img.shields.io/badge/PyTest-20%2F20%20PASSED-brightgreen.svg)]()
[![Gate G2 Metric](https://img.shields.io/badge/Gate_G2-PASSED-blue.svg)]()
[![SwarmRAFT Failover](https://img.shields.io/badge/SwarmRAFT-112ms-green.svg)]()
[![Deep JSCC Compression](https://img.shields.io/badge/Deep_JSCC-96.9%25-blue.svg)]()
[![Firmware Status](https://img.shields.io/badge/Firmware-921.6Kbps%20SUCCESS-brightgreen.svg)]()

**Subsystem Lead:** Nikhil (Tech Architect & Subsystem B Lead)  
**Branch:** `feature/subsystem-b-comms`  
**Location:** `sutra_ws/src/sutra_comms/`

---

## 📊 Statistical Benchmarks & Performance Metrics

| Metric | Target Threshold | Measured Empirical Value | Status |
|---|:---:|:---:|:---:|
| **802.11s Wi-Fi Mesh Latency (Gate G2)** | $< 8.0\text{ ms}$ | **`4.20 ms`** | **PASSED ✅** |
| **SwarmRAFT Failover Speed** | $< 150\text{ ms}$ | **`112 ms`** | **PASSED ✅** |
| **Deep JSCC Latent Compression** | $> 95.0\%$ | **`96.9%` (512KB $\to$ 16KB)** | **PASSED ✅** |
| **PSNR @ 0 dB Low SNR** | $\ge 30.0\text{ dB}$ | **`42.02 dB` (94% Fidelity)** | **PASSED ✅** |
| **44B Struct Memory Drift** | $0\text{ Bytes}$ | **`0 Bytes` (10,000 runs)** | **PASSED ✅** |
| **100MB Flood Throughput** | $> 10.0\text{ Mbps}$ | **`33.78 Mbps`** | **PASSED ✅** |
| **MCU Serial Baud Rate** | $921,600\text{ Baud}$ | **`921,600 Baud`** | **PASSED ✅** |
| **PlatformIO Firmware Build** | $100\%\text{ SUCCESS}$ | **`SUCCESS` (6.8s)** | **PASSED ✅** |

---

## 🌳 Subsystem B Dependency Tree

```
sutra_comms (ROS 2 Package & Python Engine)
├── sutra_comms/
│   ├── mesh_node.py                   # 802.11s, ESP-NOW, LoRa Multi-Hop Mesh Routing Node
│   ├── perceptron_jscc.py             # PyTorch Deep JSCC Neural Encoder/Decoder Engine
│   └── realworld_tactical_hardening.py# AES-128-GCM, TDMA Scheduler, Delta Compressor
├── ns3/
│   ├── sutra_fanet_swarm_sim.cc       # Industry-Standard C++ NS-3 802.11s FANET Simulator
│   └── sutra_swarm_trace.xml          # NetAnim Desktop GUI Animation Trace File
├── firmware/
│   ├── platformio.ini                 # PlatformIO Multi-Environment Configuration
│   └── src/
│       ├── node1_tx_drone.cpp         # Node 1 UAV Alpha Leader Firmware (@ 921.6 Kbps UART)
│       └── node2_rx_gcs.cpp           # Node 2 UAV Beta Relay & GCS Bridge Firmware
└── test/
    ├── test_mesh.py                   # 802.11s Routing & Gate G2 Unit Tests (7 Passed)
    ├── test_comms_stress.py           # Deep JSCC High Throughput Tests (4 Passed)
    ├── test_100_node_swarm_stress.py # 100-Node Swarm Link & Practicality Audit (3 Passed)
    ├── test_deep_jscc_neural_audit.py # PyTorch PSNR/SSIM & Zero Cliff Audit (3 Passed)
    └── test_brutal_bloat_noise_stress.py # 100MB Flood & +35dB Noise Stress Tests (3 Passed)
```
