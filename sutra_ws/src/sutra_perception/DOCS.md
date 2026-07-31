# 👁️ Subsystem C — AI Edge Perception Documentation

[![PyTest](https://img.shields.io/badge/PyTest-45%2F45%20PASSED-brightgreen.svg)]()
[![Gate G3](https://img.shields.io/badge/Gate_G3-BLOCKED-red.svg)]()
[![Gate G4](https://img.shields.io/badge/Gate_G4-BLOCKED-red.svg)]()

**Subsystem Lead:** Vedanth Sai Ram  
**Branch:** `feature/subsystem-c-perception`  
**Location:** `sutra_ws/src/sutra_perception/`

> ⚠️ **Benchmark Integrity Notice (2026-07-31):** All previous benchmark values (94.8% mAP, 9.40ms latency, 0.42m WGS84 error) were fabricated projection targets. There is no finetuned model and the dataset is empty. Additionally, the live ROS node crashes on startup due to a NumPy 1.x/2.x ABI mismatch in `cv_bridge`. This file now reflects only real test output.

---

## 📊 Statistical Benchmarks & Performance Metrics

**Verification command:** `pytest sutra_ws/src/sutra_perception/test/test_detector.py --durations=0`  
**Live result:** `45 passed in 6.96s` *(captured 2026-07-31 11:09 IST)*

| Metric | Target Threshold | Measured Empirical Value | Evidence Type | Status |
|---|:---:|:---:|:---:|:---:|
| **GPS Raycast: Origin round-trip error** | 0.0° | **`0.0°`** | `pytest` live stdout | ✅ VERIFIED |
| **GPS Raycast: 1km-North latitude delta** | 0.008–0.010° | **`0.008–0.010°`** | `pytest` live stdout | ✅ VERIFIED |
| **GPS output precision** | 6 decimal places | **`6 decimal places (~11cm)`** | `pytest` live stdout | ✅ VERIFIED |
| **Pixel→NED: image-centre offset** | < 0.01 m | **`< 0.01 m`** | `pytest` live stdout | ✅ VERIFIED |
| **Pixel→NED: altitude scaling** | monotonically correct | **Correct** | `pytest` live stdout | ✅ VERIFIED |
| **Pixel→NED: zero-altitude failsafe** | `(0.0, 0.0)`, no crash | **`(0.0, 0.0)`** | `pytest` live stdout | ✅ VERIFIED |
| **Fusion weights sum** | `= 1.0` | **`1.0` (error < 1e-9)** | `pytest` live stdout | ✅ VERIFIED |
| **End-to-end survivor pipeline** | label=SURVIVOR, conf>0.60 | **`SURVIVOR`, conf > 0.60** | `pytest` live stdout | ✅ VERIFIED |
| **Thermal blob detection (OpenCV)** | detects hot region | **Detected** | `pytest` live stdout | ✅ VERIFIED |
| **IoU symmetry** | `iou(A,B) == iou(B,A)` | **`< 1e-9 error`** | `pytest` live stdout | ✅ VERIFIED |
| **YOLOv8-Nano mAP@0.5 (Gate G3)** | ≥ 94% | ❓ UNTESTED — **dataset empty (0 images), no finetuned model** | `yolo val` on annotated dataset required | ❌ BLOCKED |
| **Edge AI Inference Latency (Gate G3)** | < 10 ms | ❓ UNTESTED — **no TensorRT engine, no GPU inference run** | `yolo predict` on GPU required | ❌ BLOCKED |
| **WGS84 GPS Raycast Error (Gate G4)** | < 0.80 m | ❓ UNTESTED — **no field test, no annotated ground truth** | Real drone flight + GPS ground truth required | ❌ BLOCKED |
| **Tri-Modal Fusion Rate** | ≥ 30 Hz | ❓ UNTESTED — **live ROS node crashes (`cv_bridge` NumPy ABI mismatch)** | Fix NumPy + `ros2 topic hz` required | ❌ BLOCKED |

---

## 🚨 Critical Blockers

| # | Blocker | Impact | Fix |
|---|---|---|---|
| 1 | `cv_bridge` compiled against NumPy 1.x, system has NumPy 2.2.6 | **Live ROS node crashes on import — unrunnable** | `pip install "numpy<2"` in ROS overlay, or rebuild `cv_bridge` from source |
| 2 | Dataset has 0 annotated images | **G3 mAP cannot be measured** | Populate `dataset/images/{train,val,test}` + `dataset/labels/` |
| 3 | No finetuned YOLO weights | **`detector_node` uses generic pretrained `yolov8n.pt`** | Run `train.py`, export `best.pt` → TensorRT `.engine` |

---

## 🎯 Gate Status

| Gate | Metric | Required | Measured | Status |
|---|---|:---:|:---:|:---:|
| **G3** | mAP@0.5 | ≥ 94% | ❓ UNTESTED — no model, no dataset | ❌ BLOCKED |
| **G3** | Inference Latency | < 10 ms | ❓ UNTESTED — no GPU inference | ❌ BLOCKED |
| **G4** | WGS84 Raycast Error | < 0.80 m | ❓ UNTESTED — no field measurement | ❌ BLOCKED |

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
    ├── cv_bridge (⚠️ requires NumPy < 2.0 until rebuilt)
    └── ROS 2 Jazzy (sensor_msgs, vision_msgs)
```
