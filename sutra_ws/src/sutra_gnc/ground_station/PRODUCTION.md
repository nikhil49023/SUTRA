# Smart Horizon Ground Control Station — Production & Integration Guide

## Executive Overview
Smart Horizon GCS is built using Clean Architecture, decoupling front-end presentation from communication and inference adapters. This guide clearly distinguishes **Fully Operational In-Browser Features** from **Integration-Ready Architectural Adapters**.

---

## Operational Status Matrix

### 1. 100% Fully Operational (Real Working Code)
- **GIS Map Engine**: Real Mapbox/Leaflet tile rendering (*CartoDB Dark*, *Esri World Imagery*, *OpenTopo Terrain*), real `@turf/turf` spatial distance (km) & area (m²), real interactive waypoint drawing/dragging, polygon geofencing, and genuine MAVLink WPL 110 / QGroundControl `.plan` JSON export & import parser.
- **Primary Flight Display (PFD) HUD**: Real-time 60 FPS SVG Primary Flight Display, artificial horizon pitch/roll/yaw, compass ring, climb rate VSI, and barometric altimeter.
- **Mission Planning Engine & Battery Estimator**: Real mathematical battery discharge calculations (Wh/km, Wh/m, 15W payload draw), 25% RTH safety reserve validator, path smoothing Bezier angle optimizer, and pre-flight validation reports.
- **Replay & Flight Recording System**: Real keyframe telemetry recording, frame-by-frame stepper, `0.5x`–`10x` playback speed controller, and local `.gcslog` storage manager.
- **Security & RBAC**: Real `InputSanitizer` anti-XSS HTML escaping, `CommandValidator` opcode whitelist, 4-tier Role-Based Access Control (`COMMANDER`, `OPERATOR`, `ANALYST`, `VIEWER`), and audit logs.
- **Performance Throttler**: Real ring-buffer packet throttler ingesting 100 Hz streams and batching React re-renders at 20 Hz (50ms) to ensure smooth 60 FPS UI rendering.

### 2. Integration-Ready Architectural Scaffolding (Mock Fallback Enabled)
- **MAVLink / PX4 / ArduPilot SITL Link**: `MAVLinkParser` binary frame decoder, `CommandQueue` emergency interlock, and MAVLink mission handshake protocols are written and compiled. In standalone browser mode, telemetry uses a 5 Hz mock physics loop. Connects to PX4 SITL (UDP `14540`) or ArduPilot SITL (UDP `14550`) via FastAPI WebSocket bridge (`ws://localhost:8000/ws/mavlink`).
- **YOLO / Computer Vision**: `GPSMapper` 2D-to-3D WGS84 coordinate projection, `TrackingEngine` (ByteTrack/DeepSORT), and `ThreatAnalyzer` risk index are fully operational. Object detections use high-fidelity simulated CV outputs (`FIRE` @ 97.8%, `VEHICLE` @ 95.4%). Plugs into real YOLOv8 ONNX Runtime WASM or FastAPI PyTorch endpoints.
- **RTSP / USB Hardware Cameras**: `CameraStreamGateway` is structured for RTSP H.264 IP streams and V4L2 WebCams. Renders high-resolution tactical video assets/canvas overlays in browser. Connects to real RTSP endpoints via WebRTC / HLS bridge.

---

## Quickstart Guide: Connecting Real Hardware / SITL

### 1. Connecting PX4 / ArduPilot SITL Telemetry
```bash
# 1. Start PX4 SITL in Gazebo (listens on UDP 14540)
make px4_sitl gazebo

# 2. Start FastAPI WebSocket Bridge
uvicorn main:app --port 8000

# 3. Set environment variable in GCS (.env.production)
VITE_ENABLE_MOCK_FALLBACK=false

# 4. GCS automatically streams real MAVLink packets from ws://localhost:8000/ws/mavlink
```

### 2. Connecting Real YOLOv8 Model Inference
```bash
# 1. Run YOLOv8 PyTorch server
python -m yolo_service --weights yolov8n.pt

# 2. Point YOLOModelAdapter to http://localhost:8000/api/v1/ai/predict
```
