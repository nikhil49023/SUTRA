# 🚀 Project SUTRA — 7-Day Complete Execution Blueprint (Role-Specific)
**Swarm Unified Tactical Reconnaissance Architecture**  
*Comprehensive "What to Build, How to Build, Git Tree & Daily Guide" starting Tomorrow*

---

> [!IMPORTANT]
> **Sprint Dates:** Tomorrow (Day 1) to Day 7  
> **Target:** 100% Locked, Fully Functional 5-Subsystem Baseline Prototype & Demo Video  
> **Methodology:** AI-Assisted Pair Programming + Git Flow + Automated Verification Gates (G1–G6)

---

## 📑 Table of Contents
1. [Git Branching Strategy & Complete Commit Tree](#1-git-branching-strategy--complete-commit-tree)
2. [Role-Specific Master Responsibilities](#2-role-specific-master-responsibilities)
3. [Day-by-Day Detailed Execution Plan (Days 1–7)](#3-day-by-day-detailed-execution-plan-days-17)
4. [What & How to Build: Code Schematics & AI Prompts](#4-what--how-to-build-code-schematics--ai-prompts)
   - [Subsystem A (Rohith): C++ PX4 Offboard Controller](#subsystem-a-rohith-c-px4-offboard-controller)
   - [Subsystem B (Nikhil): Python RF Mesh & Deep JSCC](#subsystem-b-nikhil-python-rf-mesh--deep-jscc)
   - [Subsystem C (Vedanth): YOLOv8 TensorRT Perception](#subsystem-c-vedanth-yolov8-tensorrt-perception)
   - [Subsystem D (Siva Kesava): React Mapbox 3D GCS](#subsystem-d-siva-kesava-react-mapbox-3d-gcs)
   - [Subsystem E (Harika): Verification Gate Audit Logs](#subsystem-e-harika-verification-gate-audit-logs)

---

## 1. Git Branching Strategy & Complete Commit Tree

```
(Tomorrow - Day 1) ------------------------------------------------------------------------------------> (Day 7)

[ main ] =====(v0.1-init)====================================================================(v1.0-release)
            \                                                                                    ^
             \                                                                                  /
  [ dev ] ----+======(Day 3 Merge)=============(Day 5 Merge)=============(Day 6 Freeze)--------+
               \         ^                         ^                         ^
                \       /                         /                         /
  [ feature/gnc ] -----+---(feat: px4_offboard)---+---(feat: orca_avoid)---+ (Rohith)
                \       \                         \                         \
  [ feature/comms ] ----+---(feat: mesh_socket)---+---(feat: deep_jscc)-----+ (Nikhil)
                \       \                         \                         \
  [ feature/vision ] ---+---(feat: yolo_trt)------+---(feat: raycast_gps)---+ (Vedanth)
                \       \                         \                         \
  [ feature/gcs ] ------+---(feat: mapbox_3d)-----+---(feat: webgpu_hud)----+ (Siva Kesava)
                \       \                         \                         \
  [ feature/docs ] -----+---(docs: encylopedia)---+---(docs: gate_logs)-----+ (Harika)
```

### Mandatory Git Workflow Rules:
1. **Branch Names**:
   - `feature/subsystem-a-gnc` (Rohith)
   - `feature/subsystem-b-comms` (Nikhil)
   - `feature/subsystem-c-perception` (Vedanth)
   - `feature/subsystem-d-gcs` (Siva Kesava)
   - `feature/subsystem-e-docs` (Harika)
2. **Commit Message Format**:
   - `feat(<subsystem>): <action>`
   - `fix(<subsystem>): <fix description>`
   - `docs(<audit>): <report title>`

---

## 2. Role-Specific Master Responsibilities

| Engineer | Subsystem & Role | Core Build Output | Primary Tech Stack |
| :--- | :--- | :--- | :--- |
| **Nikhil** | **Subsystem B Lead** & System Architect | RF Mesh Network, Deep JSCC Neural Image Compressor, Gazebo Sim Ops | Python, PyTorch, Sockets, ROS 2 |
| **Rohith Kumar** | **Subsystem A Lead**: GNC | PX4 Offboard Trajectory Node, ORCA Mid-Air Collision Avoidance | C++, ROS 2, Micro-XRCE-DDS, PX4 |
| **Vedanth** | **Subsystem C Lead**: Perception | YOLOv8-Nano TensorRT Detector, Thermal Fusion, GPS Raycaster | Python, TensorRT, OpenCV, ROS 2 |
| **Siva Kesava** | **Subsystem D Lead**: 3D GCS | React 3D Satellite Map, WebGPU Artificial Horizon HUD, RTL Overrides | React.js, Mapbox GL JS, WebGPU |
| **Harika** | **Subsystem E Lead**: Audit & Docs | Master SUTRA Encyclopedia, Gate G1–G6 Metrics, Demo Video Deck | Markdown, LaTeX, Mermaid, Python |

---

## 3. Day-by-Day Detailed Execution Plan (Days 1–7)

### 🌅 DAY 1 (TOMORROW): Environment Setup & AI Prompt Calibration

#### 👤 Nikhil (System Architect & Comms)
- [ ] Initialize `sutra_ws` git repository and push `main` and `dev` branches.
- [ ] Configure `ros_gz_bridge` for `/uav_alpha/odometry` and `/uav_beta/odometry`.
- [ ] Deliverable: Working ROS 2 workspace skeleton with passing build check.

#### 👤 Rohith Kumar (GNC)
- [ ] Install PX4 SITL toolchain (`make px4_sitl gz_x3`).
- [ ] Verify Micro-XRCE-DDS agent connection on port 8888.
- [ ] Deliverable: PX4 SITL spawning in Gazebo Sim 8.

#### 👤 Vedanth (Perception)
- [ ] Set up Python virtual environment with PyTorch, CUDA, and TensorRT / ONNX Runtime.
- [ ] Download YOLOv8-Nano target detection weights.
- [ ] Deliverable: Test image detection script outputting bounding boxes.

#### 👤 Siva Kesava (GCS)
- [ ] Create React app structure (`npx create-react-app sutra-gcs-ui`).
- [ ] Install `mapbox-gl` and configure Mapbox access token.
- [ ] Deliverable: React web server running with a basic 3D globe centered on SF.

#### 👤 Harika (Docs & Audit)
- [ ] Initialize `docs/SUTRA_Encyclopedia.md` and `docs/Gate_Audit_Template.md`.
- [ ] Set up Google Drive / Git media storage for test flight logs.
- [ ] Deliverable: Project SUTRA documentation structure pushed to `feature/subsystem-e-docs`.

---

### 🌅 DAY 2: Core AI Node Generation & Unit Testing

#### 👤 Nikhil
- [ ] Prompt AI to generate `sutra_comms/mesh_socket.py` (UDP 802.11s mesh socket + 868MHz LoRa simulation).
- [ ] Unit test signal attenuation calculation Friis path loss.
- [ ] Commit: `feat(comms): implement Friis RF path loss mesh socket`.

#### 👤 Rohith Kumar
- [ ] Prompt AI to generate C++ `px4_offboard_node.cpp` publishing `TrajectorySetpoint`.
- [ ] Test 10m square waypoint circuit in PX4 SITL.
- [ ] Commit: `feat(gnc): add C++ PX4 Offboard trajectory setpoint publisher`.

#### 👤 Vedanth
- [ ] Prompt AI to generate ROS 2 node `yolo_tensorrt_node.py` subscribing to `sensor_msgs/msg/Image`.
- [ ] Test bounding box extraction at 30+ FPS.
- [ ] Commit: `feat(vision): add ROS 2 YOLOv8 TensorRT image processing node`.

#### 👤 Siva Kesava
- [ ] Prompt AI to generate React component `Mapbox3D.jsx` displaying real-time drone markers from WebSocket.
- [ ] Install `rosbridge_server` to stream ROS 2 topic data to WebSockets.
- [ ] Commit: `feat(gcs): add Mapbox 3D real-time drone tracking component`.

#### 👤 Harika
- [ ] Audit **Verification Gate G1** (Single UAV Autonomous Takeoff & Waypoint Circuit).
- [ ] Log real-time factor, max lateral error ($<1.0\text{m}$), and publish report to `docs/Gate_G1_Log.md`.
- [ ] Commit: `docs(audit): publish Verification Gate G1 test report`.

---

### 🌅 DAY 3: Digital Twin Integration & First PR Merge Cycle

#### 👤 All Engineers
- [ ] Open Pull Requests from feature branches into `dev`.
- [ ] Perform peer review and merge into `dev` (Tag: `v0.1-alpha`).
- [ ] Run `sutra_sim` digital twin world ([`real_world_digital_twin_swarm.sdf`](file:///home/nikhil/real_world_digital_twin_swarm.sdf)).

#### 👤 Harika
- [ ] Audit **Verification Gate G2** (Swarm Leader Failover $< 500\text{ms}$).

---

### 🌅 DAY 4: Pairwise Subsystem Integration (Air + Ground)

#### 👥 Pair 1: Rohith & Nikhil (GNC + Comms)
- [ ] Link Boids velocity vectors from `swarm_controller.py` into PX4 Offboard Trajectory nodes under simulated $50\%$ packet loss.

#### 👥 Pair 2: Vedanth & Siva Kesava (Vision + GCS)
- [ ] Wire YOLOv8 victim detection centroid raycasting -> WGS84 GPS coordinate marker on Mapbox 3D GCS.

---

### 🌅 DAY 5: Full 5-Subsystem Master Suite Integration

#### 👤 All Engineers
- [ ] Execute `python3 /home/nikhil/Desktop/SUTRA/SUTRA_48Hr_Hackathon_Master_Suite.py`.
- [ ] Validate 5-subsystem loop: Takeoff -> RF Mesh -> YOLO Target Detection -> WGS84 Geolocation -> 3D GCS Display.
- [ ] **Harika**: Audit **Verification Gates G3 & G4** (Detection confidence $> 90\%$, PER under $60\%$ loss).

---

### 🌅 DAY 6: Stress Testing, GPS Denial & Failover Verification

#### 👤 All Engineers
- [ ] Inject simulated atmospheric wind shear ($3.5\text{m/s}$), building blockades, and 30-second GPS satellite dropouts.
- [ ] Confirm optical flow / VIO position hold fallback works seamlessly.
- [ ] **Harika**: Audit **Verification Gates G5 & G6** (End-to-End Mission Victory).

---

### 🌅 DAY 7: Baseline Freeze, Video Capture & Demo Lock

#### 👤 All Engineers
- [ ] Merge `dev` into `main` (Tag: `v1.0-release`).
- [ ] Record 2-minute high-definition screen video of live Gazebo Sim + React 3D Dashboard (`Sutra_Rescue_Mission.mp4`).
- [ ] **Harika**: Freeze master documentation and publish SUTRA Final Pitch Presentation Deck.

---

## 4. What & How to Build: Code Schematics & AI Prompts

### Subsystem A (Rohith): C++ PX4 Offboard Controller
- **File Location:** `sutra_ws/src/sutra_gnc/src/px4_offboard_node.cpp`
- **AI Generation Prompt:**
  > *"Write a ROS 2 C++ node for PX4 Offboard Mode using Micro-XRCE-DDS (`px4_msgs`). The node must publish `OffboardControlMode` and `TrajectorySetpoint` at 10Hz, perform an automated 10m takeoff, fly a 20m square waypoint circuit, and command Auto-Land."*

### Subsystem B (Nikhil): Python RF Mesh & Deep JSCC
- **File Location:** `sutra_ws/src/sutra_comms/sutra_comms/mesh_socket.py`
- **AI Generation Prompt:**
  > *"Write a Python class implementing Friis Free-Space Path Loss equation and 802.11s Wi-Fi mesh socket communication. Calculate signal strength in dBm given distance, calculate packet delivery rate, and thin diagnostic logs if PER exceeds 50%."*

### Subsystem C (Vedanth): YOLOv8 TensorRT Perception
- **File Location:** `sutra_ws/src/sutra_perception/sutra_perception/yolo_tensorrt_node.py`
- **AI Generation Prompt:**
  > *"Write a ROS 2 Python node using OpenCV and TensorRT to process `sensor_msgs/msg/Image`. Detect objects using YOLOv8-Nano, output bounding box centroids, and raycast target coordinates onto WGS84 GPS latitude/longitude."*

### Subsystem D (Siva Kesava): React Mapbox 3D GCS
- **File Location:** `sutra_ws/src/sutra_gcs/src/components/Mapbox3D.jsx`
- **AI Generation Prompt:**
  > *"Write a React.js component using Mapbox GL JS to render a 3D satellite terrain map with WebGL elevation. Connect to a WebSocket streaming ROS 2 `/odometry` messages and render animated 3D drone markers with altitude trails."*

### Subsystem E (Harika): Verification Gate Audit Logs
- **File Location:** `sutra_ws/docs/SUTRA_Verification_Gates_Log.md`
- **AI Generation Prompt:**
  > *"Write a markdown document summarizing Verification Gates G1 to G6 for Project SUTRA. Include GitHub-style alerts, comparison tables for Real-Time Factor, lateral position errors, detection precision, and RF link packet delivery rates."*
