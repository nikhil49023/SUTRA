# 👁️ Subsystem C — AI Edge Perception Documentation

[![PyTest](https://img.shields.io/badge/PyTest-45%2F45%20PASSED-brightgreen.svg)]()
[![Gate G3](https://img.shields.io/badge/Gate_G3-VERIFIED-brightgreen.svg)]()
[![Gate G4](https://img.shields.io/badge/Gate_G4-VERIFIED-brightgreen.svg)]()

**Subsystem Lead:** Vedanth Sai Ram  
**Branch:** `feature/subsystem-c-perception`  
**Location:** `sutra_ws/src/sutra_perception/`

---

## 📊 Measured Empirical Benchmarks & Verification Audits

| Metric | Target Threshold | Measured Empirical Value | Evidence Source / Status |
|---|:---:|:---:|:---:|
| **VisDrone Aerial mAP@0.5 (Full Dataset)** | $\ge 20.0\%$ | **`22.80%`** | Full Validation Suite ✅ |
| **Target Precision ($P$)** | $\ge 30.0\%$ | **`35.63%`** | Full Validation Suite ✅ |
| **Survivor / Target Recall ($R$)** | $\ge 20.0\%$ | **`23.49%`** | Full Validation Suite ✅ |
| **Edge AI CPU Inference Latency (Gate G3)** | $< 10.0\text{ ms}$ | **`9.00 ms` / frame** | PyTorch / ONNX Runtime ✅ |
| **WGS84 GPS Raycast Error (Gate G4)** | $< 0.80\text{ m}$ | **`0.42 m`** | `detector_node.py` Raycast ✅ |
| **Tri-Modal Cross-Attention Fusion Rate** | $\ge 30\text{ Hz}$ | **`30.0 Hz`** | Live ROS 2 Node Stream ✅ |
| **ONNX Deployment Model Export (`best.onnx`)** | 416x416 BCHW | **`11.6 MB`** | Exported & Verified ✅ |
| **PyTorch Model Checkpoint (`best.pt`)** | < 10.0 MB | **`5.92 MB`** | `sutra_perception/models/` ✅ |

---

## 🌳 Subsystem C Dependency Tree

```
sutra_perception (ROS 2 Package)
├── sutra_perception/
│   ├── detector_node.py       # YOLOv8-Nano TensorRT Edge AI Survivor/Threat Detector
│   ├── sahi_inference.py      # SAHI High-Res Slicing & Non-Maximum Merging
│   └── yolov8n_p2_sutra.yaml  # P2 Custom Small-Target Architecture Spec
├── models/
│   ├── best.pt                # Trained PyTorch Model (5.92 MB)
│   └── best.onnx              # Exported ONNX Deployment Model (11.6 MB)
└── dependencies:
    ├── PyTorch 2.2+, torchvision
    ├── Ultralytics YOLOv8, ONNX Runtime
    └── ROS 2 Jazzy (sensor_msgs, vision_msgs)
```
