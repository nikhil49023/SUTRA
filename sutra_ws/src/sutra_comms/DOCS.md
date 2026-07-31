# 📡 Subsystem B — Comms & Digital Twin Simulation Documentation

[![PyTest](https://img.shields.io/badge/PyTest-27%2F27%20PASSED-brightgreen.svg)]()
[![Gate G2](https://img.shields.io/badge/Gate_G2-MODEL--SIMULATED-yellow.svg)]()

**Subsystem Lead:** Nikhil (Tech Architect & Subsystem B Lead)  
**Branch:** `feature/subsystem-b-comms`  
**Location:** `sutra_ws/src/sutra_comms/`

> ⚠️ **Benchmark Integrity Notice (2026-07-31):** Previous benchmark values mixed real test results with projected targets and hardware spec-sheet figures. This file now distinguishes three categories: ✅ `pytest` verified, ⚙️ Model-simulated (real code path, mock physics), and ❓ UNTESTED (no real hardware/RF measurement exists).

---

## 📊 Statistical Benchmarks & Performance Metrics

**Verification command:** `pytest sutra_ws/src/sutra_comms/test/ --durations=0`  
**Live result:** `27 passed in 8.25s` *(captured 2026-07-31 11:09 IST)*

| Metric | Target Threshold | Measured / Observed Value | Evidence Type | Status |
|---|:---:|:---:|:---:|:---:|
| **10-UAV Link Matrix Compute Time** | < 50 ms | **`20 ms`** | `pytest` live stdout (0.02s call) | ✅ VERIFIED |
| **SwarmRAFT State Transition Time** (failover detection loop) | < 500 ms | **`< 10 ms`** | `pytest` live stdout (0.01s call) | ✅ VERIFIED |
| **100MB Payload Flood Queue** | No crash / completes | **Passes in `170 ms`** | `pytest` live stdout (0.17s call) | ✅ VERIFIED |
| **RF Jamming Resilience Loop** (20 distance/fading combos) | No crash | **Passes in `120 ms`** | `pytest` live stdout (0.12s call) | ✅ VERIFIED |
| **100-Node Swarm Topology Compute** | < 4,950 links | **`4,950 links` in `920 ms`** | `pytest` live stdout (0.92s call) | ✅ VERIFIED |
| **44-Byte C++ Struct Alignment** (10,000 iterations) | 0 drift | **`0 Bytes drift`** | `pytest` live stdout | ✅ VERIFIED |
| **Deep JSCC Compression Ratio** | < 0.05 (>95%) | **`< 0.05`** — asserted by `PerceptronSemanticCommsPipeline` | ⚙️ Model-simulated (PyTorch mock) | ⚙️ MODEL |
| **PSNR @ 0 dB SNR** | ≥ 30 dB | **`≥ 28 dB`** — asserted inside mock pipeline | ⚙️ Model-simulated (not over-the-air) | ⚙️ MODEL |
| **60-FPS JSCC Frame Latency** | < 16.6 ms/frame | **`< 16.6 ms/frame`** — mock pipeline assertion | ⚙️ Model-simulated | ⚙️ MODEL |
| **802.11s Wi-Fi Mesh Latency** | < 8.0 ms | ❓ UNTESTED — no real 802.11s hardware in loop | `iw mesh` + `ping` on live mesh required | ❌ BLOCKED |
| **SwarmRAFT Failover End-to-End** | < 150 ms | ❓ UNTESTED — state transition tested, not full network round-trip | Multi-node SITL or real radios required | ❌ BLOCKED |
| **MCU Serial Baud Rate** | 921,600 Baud | ❓ UNTESTED — spec from `platformio.ini`, not measured from connected hardware | Serial port oscilloscope / `minicom` required | ❌ BLOCKED |
| **PlatformIO Firmware Build** | SUCCESS | ❓ UNTESTED — not run during this audit (build environment not verified) | `pio run` required | ❌ BLOCKED |

> **⚙️ MODEL-SIMULATED explained:** The Deep JSCC pipeline (`perceptron_jscc.py`) is a PyTorch MLP that models compression/PSNR via learned functions. Test assertions verify that the model's internal math is self-consistent. These are NOT over-the-air RF measurements. Real PSNR/compression must come from a trained JSCC encoder evaluated on actual images transmitted over a noisy channel.

---

## 🎯 Gate G2 Status

| Gate | Metric | Required | Measured | Status |
|---|---|:---:|:---:|:---:|
| **G2** | Mesh Latency | < 8 ms | ❓ UNTESTED (no real 802.11s hardware) | ❌ BLOCKED |
| **G2** | Packet Loss | < 2% | ❓ UNTESTED | ❌ BLOCKED |
| **G2** | RAFT Failover | < 150 ms | SwarmRAFT state transition `< 10ms` ✅ (full network round-trip UNTESTED) | ⚠️ PARTIAL |

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
    ├── test_100_node_swarm_stress.py  # 100-Node Swarm Link & Practicality Audit (3 Passed)
    ├── test_deep_jscc_neural_audit.py # PyTorch PSNR/SSIM & Zero Cliff Audit (3 Passed)
    ├── test_brutal_bloat_noise_stress.py # 100MB Flood & +35dB Noise Stress Tests (3 Passed)
    ├── test_brutal_hardware_multi_radio.py # Multi-Radio Switching (4 Passed)
    └── test_subsystem_b_c_wiring.py   # B↔C Cross-Subsystem Wiring (3 Passed)
```
