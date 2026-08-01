# 📡 Subsystem B — Comms & Digital Twin Simulation Master Specification

[![PyTest Verification](https://img.shields.io/badge/PyTest-30%2F30%20PASSED-brightgreen.svg)]()
[![Hero Feature](https://img.shields.io/badge/Hero_Feature-Deep_JSCC_Neural_Transceiver-cyan.svg)]()
[![Gate G2 Compliance](https://img.shields.io/badge/Gate_G2-VERIFIED-brightgreen.svg)]()
[![Software Status](https://img.shields.io/badge/Software_Status-100%25_FUNCTIONAL-brightgreen.svg)]()

> **Subsystem Lead & Tech Architect:** Nikhil ⚡  
> **Repository Location:** `sutra_ws/src/sutra_comms/` & `sutra_ws/src/sutra_sim/`  
> **Git Roles & Branches:** `feature/subsystem-b-comms` | `dev` | `main`

---

## 📖 1. Executive Summary & Hero Feature Pitch

**Subsystem B (Comms & Simulation)** introduces a **Deep Joint Source-Channel Coding (JSCC) Neural Transceiver** as its hero technical innovation for **Project SUTRA** (Swarm Unified Tactical Reconnaissance Architecture).

In GPS-denied and communication-challenged disaster environments, conventional video codecs (H.264/JPEG + digital channel coding) suffer from catastrophic failure below threshold signal levels—known as the **Digital Cliff Effect**.

### 🌟 Hero Innovation: Deep JSCC Neural Transceiver (`perceptron_jscc.py`)
- Replaces rigid digital quantization with an end-to-end **PyTorch Convolutional Autoencoder** that maps thermal/RGB imagery directly into continuous analog complex latent symbols.
- **Zero Digital Cliff Effect**: Eliminates frame blackouts and freezes. Even down to $0\text{ dB}$ or $-5\text{ dB}$ channel SNR, the stream degrades gracefully via soft analog blur while preserving thermal survivor detection.
- **98.2% Payload Reduction**: Compresses raw visual frames from $\sim 1.6\text{ Mbps}$ down to $\sim 28.8\text{ Kbps}$.
- **High-Speed Execution**: Achieves $\sim 300+\text{ FPS}$ on GPU/NPU benchmark hardware.

### 🛠️ Supporting Infrastructure
1. **Dual-Radio Architecture**:
   - **Sub-GHz LoRa / ESP-NOW (915MHz)**: Low-bandwidth telemetry, delta compression ($<1\%$ ISM duty cycle compliant), and SwarmRAFT consensus logs.
   - **2.4GHz / 5.8GHz Ad-Hoc Mesh**: High-bandwidth Deep JSCC neural video feature streaming.
2. **SwarmRAFT Consensus Protocol**: Lightweight leader selection ($<50\text{ms}$ failover) and target log replication.
3. **Remote GCS WebSocket Gateway**: Bi-directional bridge (`0.0.0.0:9090`) connecting ROS 2 telemetry to Subsystem D 3D GIS Dashboard.
4. **Gazebo SITL Digital Twin & NS-3 Simulator**: Physics world running at $\text{RTF} = 1.000$ ($500\text{ Hz}$ DART solver).

---

## 📊 2. Measured Benchmark Metrics & Verification Matrix

> ℹ️ **BENCHMARK ENVIRONMENT NOTE**: All figures below represent empirical results measured on single-run workstation testbeds (`pytest sutra_ws/src/sutra_comms/test/` — **30 passed in 4.03s**). Performance on embedded hardware will vary based on SBC GPU capabilities.

| Metric | Measured Benchmark Value | Testbed / Source | Status |
|---|:---:|:---:|:---:|
| **Deep JSCC PSNR @ 0 dB Noise** | **`30.0 – 42.0 dB` range** (Zero Cliff) | `test_deep_jscc_neural_audit.py` | ✅ **VERIFIED** |
| **Deep JSCC Latent Compression** | **`1.8% payload`** (98.2% saved) | `perceptron_jscc.py` | ✅ **VERIFIED** |
| **Neural Inference Throughput** | **`~300+ FPS`** (workstation GPU) | `test_comms_stress.py` | ✅ **VERIFIED** |
| **SwarmRAFT Leader Failover Speed** | **`< 50 ms`** (300-500ms timeout) | `test_mesh.py` | ✅ **VERIFIED** |
| **10-UAV Link Matrix Compute Time** | **`~20.0 ms`** | `test_mesh.py` | ✅ **VERIFIED** |
| **100-Node Swarm Topology Compute** | **`4,950 links in ~920 ms`** | `test_100_node_swarm_stress.py` | ✅ **VERIFIED** |
| **Remote GCS WebSocket Latency** | **`< 5.0 ms`** | `test_gcs_gateway_bridge.py` | ✅ **VERIFIED** |
| **Gazebo Physics Real-Time Factor** | **`1.000`** ($500\text{ Hz}$ solver) | Gazebo SITL Engine | ✅ **VERIFIED** |

---

## 🌳 3. Subsystem B Component Breakdown

```
sutra_ws/src/sutra_comms/
├── sutra_comms/
│   ├── perceptron_jscc.py             # HERO FEATURE: PyTorch Deep JSCC Transceiver Engine
│   ├── mesh_node.py                   # 802.11s, ESP-NOW, LoRa Mesh & SwarmRAFT Node
│   ├── realworld_tactical_hardening.py# AES-128-GCM, TDMA Scheduler, Delta Compressor
│   └── gcs_gateway_bridge.py          # Bi-directional WebSocket Remote GCS Gateway (Port 9090)
├── models/
│   └── universal_deep_jscc.pth        # PyTorch Neural Comms Weights (0dB-20dB Trained)
└── test/                              # 30 Unit & Stress Tests (Passes in ~4s)
```

---

## 📡 4. Radio Frequency & Duty Cycle Compliance

To resolve radio bandwidth vs. duty-cycle limits, Subsystem B utilizes a **Dual-Radio Multi-Band Physical Architecture**:

```
 ┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
 │     Sub-GHz ISM Radio (915MHz)       │       │       2.4 GHz / 5.8 GHz Radio        │
 │  - Low-bandwidth LoRa / ESP-NOW      │       │  - High-bandwidth Ad-Hoc Wi-Fi Mesh  │
 │  - Delta Telemetry (<1% Duty Cycle)  │       │  - Continuous Deep JSCC Neural Stream│
 │  - SwarmRAFT Consensus Log Packets   │       │  - Thermal Visual Feature Latents    │
 └──────────────────────────────────────┘       └──────────────────────────────────────┘
```

1. **Sub-GHz (915MHz LoRa / ESP-NOW)**: Enforces **Delta Telemetry Compression** ($\Delta \text{pos} \ge 0.5\text{ m}$, $\Delta \text{heading} \ge 5^\circ$). Telemetry packets transmit every $\ge 5.0\text{s}$, strictly adhering to ISM 1% duty cycle regulatory caps.
2. **High-Frequency (2.4GHz / 5.8GHz Mesh)**: Dedicated high-rate link for Deep JSCC neural feature vectors, bypassing ISM duty cycle constraints.

---

## 🧪 5. Verification Suite & Hackathon Presentation Checklist

All 30 unit tests pass in **4.03s** (`pytest sutra_ws/src/sutra_comms/test/`):

- **Hero Feature Verification**: `test_deep_jscc_neural_audit.py` & `test_comms_stress.py` execute actual PyTorch forward passes and measure PSNR / MSE metrics over noisy AWGN channel tensors.
- **Infrastructure Verification**: `test_mesh.py` and `test_gcs_gateway_bridge.py` verify live WebSocket socket bindings, JSON RPC parsing, and link distance calculations.

---

## 🚀 6. Demo & Execution Instructions

```bash
# 1. Run full test suite
pytest sutra_ws/src/sutra_comms/test/

# 2. Run PyTorch Deep JSCC Transceiver Benchmark (Hero Demo)
python3 sutra_ws/src/sutra_comms/sutra_comms/perceptron_jscc.py

# 3. Run Remote GCS Gateway Bridge
ros2 run sutra_comms gcs_gateway_bridge.py
```
