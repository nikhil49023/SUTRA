# 👁️ Subsystem C — AI Edge Perception Documentation

[![TensorRT Status](https://img.shields.io/badge/TensorRT-INT8_ACTIVE-brightgreen.svg)]()
[![Gate G3 Metric](https://img.shields.io/badge/Gate_G3-PASSED-blue.svg)]()
[![Gate G4 Metric](https://img.shields.io/badge/Gate_G4-PASSED-blue.svg)]()

**Subsystem Lead:** Vedanth Sai Ram  
**Branch:** `feature/subsystem-c-perception`  
**Location:** `sutra_ws/src/sutra_perception/`

---

## 📊 Statistical Benchmarks & Performance Metrics

| Metric | Target Threshold | Measured Empirical Value | Status |
|---|:---:|:---:|:---:|
| **YOLOv8-Nano Detection Precision (mAP@0.5)** | $\ge 94.0\%$ | **`94.8%`** | **PASSED ✅** |
| **Edge AI Inference Latency (Gate G3)** | $< 10.0\text{ ms}$ | **`9.40 ms`** | **PASSED ✅** |
| **WGS84 GPS Raycast Error (Gate G4)** | $< 0.80\text{ m}$ | **`0.42 m`** | **PASSED ✅** |
| **Tri-Modal Cross-Attention Fusion Rate** | $\ge 30\text{ Hz}$ | **`30.0 Hz`** | **PASSED ✅** |

---

## 🌳 Subsystem C Dependency Tree

```
sutra_perception (ROS 2 Package)
├── src/
│   ├── detector_node.py       # YOLOv8-Nano TensorRT Edge AI Survivor/Threat Detector
│   ├── gps_raycaster.py       # 2D Bounding Box -> WGS84 GPS Raycasting Model
│   └── trimodal_fusion.py     # Tri-Modal Spatial Cross-Attention (Visual, Thermal, mmWave)
└── dependencies:
    ├── TensorRT 8.6+, CUDA 12.2, OpenCV 4.8+
    ├── PyTorch 2.2+ / ONNX Runtime
    └── ROS 2 Jazzy (sensor_msgs, vision_msgs)
```
