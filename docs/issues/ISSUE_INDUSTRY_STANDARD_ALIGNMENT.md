# 📢 ISSUE #104: Project SUTRA Mandatory Transition to 100% Industry-Standard Defense & Aerospace Software Stack

> **TO ALL TEAM LEADS (Rohith - Subsystem A, Nikhil - Subsystem B, Vedanth - Subsystem C, Siva Kesava - Subsystem D, Harika - Subsystem E):**
> 
> Per architectural directive, Project SUTRA is transitioning 100% to **defense and aerospace industry-standard software solutions** used by defense contractors (Shield AI, Anduril, Lockheed Martin), military tactical operators (USSOCOM ATAK/WinTAK), and autonomous robotics research labs.
>
> High-level custom mock scripts are prohibited. All subsystem implementations must adhere to the exact industry standards specified below:

---

## 📋 Subsystem Mandatory Industry Standards

### 🚁 Subsystem A (GNC & Flight Control) — Lead: Rohith Kumar
* **Branch**: `feature/subsystem-a-gnc` | **Folder**: `sutra_ws/src/sutra_gnc/`
* **Mandatory Standard**: **PX4 Autopilot Offboard Mode** (`px4_msgs`) + Gazebo Sim 8 SITL.
* **Directives**:
  1. Offboard dispatch MUST use standard `px4_msgs/msg/TrajectorySetpoint`, `OffboardControlMode`, and `VehicleCommand`.
  2. Integrate Visual-Inertial Odometry (VIO) pose estimation topics directly into PX4 EKF2.
  3. Wire ORCA 3D collision avoidance directly into PX4 offboard trajectory setpoints.

---

### 📡 Subsystem B (Comms & Digital Twin) — Lead: Nikhil *(IMPLEMENTED & PASSED ✅)*
* **Branch**: `feature/subsystem-b-comms` | **Folder**: `sutra_ws/src/sutra_comms/` & `scripts/`
* **Mandatory Standard**: **Linux `mac80211_hwsim` Kernel Mesh Simulation** + PyTorch Deep JSCC + PlatformIO ESP32/SX1262 LoRa C++ Firmware.
* **Directives**:
  1. Linux kernel wireless simulation script `scripts/setup_mac80211_hwsim_mesh.sh` created to initialize virtual 802.11s interfaces (`wlan0`...`wlan4`) running B.A.T.M.A.N.-adv.
  2. Hardened SwarmRAFT consensus engine with Pre-Vote phase and dynamic RTT/PER adaptive election timeouts (< 500ms failover).

---

### 👁️ Subsystem C (AI Edge Perception) — Lead: Vedanth Sai Ram
* **Branch**: `feature/subsystem-c-perception` | **Folder**: `sutra_ws/src/sutra_perception/`
* **Mandatory Standard**: **YOLOv8-Nano TensorRT Edge Engine** + WGS-84 Raycasting + Tri-Modal Sensor Fusion.
* **Directives**:
  1. Convert PyTorch `.pt` weights to TensorRT `.engine` for low-latency (< 15ms) edge inference.
  2. Compute real-world WGS-84 GPS coordinates from 2D bounding boxes using pinhole camera matrix & drone attitude EKF.
  3. Publish target payloads to `/sutra/perception/targets` for automatic SwarmRAFT consensus log replication.

---

### 🗺️ Subsystem D (3D Tactical COP GCS) — Lead: Siva Kesava
* **Branch**: `feature/subsystem-d-gcs` | **Folder**: `sutra_ws/src/sutra_gcs/`
* **Mandatory Standard**: **ATAK / WinTAK Cursor-on-Target (CoT) MIL-STD-2525 Protocol** + Mapbox GL JS / Cesium 3D Satellite COP View.
* **Directives**:
  1. Utilize `sutra_gcs/src/utils/atakCotStreamer.ts` to output MIL-STD-2525 CoT XML events (`a-f-G-U-C-F` civilian / `a-h-G-U-C-F` threat) for military ATAK/WinTAK ground station interoperability.
  2. Maintain 60 FPS visual telemetry HUD and 1-click Emergency Return-to-Launch (RTL).

---

### 📑 Subsystem E (Docs & Verification Audits) — Lead: Harika
* **Branch**: `feature/subsystem-e-docs` | **Folder**: `docs/` & `scripts/`
* **Mandatory Standard**: Automated Verification Gate Metric Audits G1–G6.
* **Directives**:
  1. Execute `python3 scripts/SUTRA_48Hr_Hackathon_Master_Suite.py` before requesting merges to `dev`.
  2. Verify all targets G1 (RTF ≥ 0.98), G2 (Latency < 12ms, Loss < 2%), G3 (mAP@0.5 ≥ 90%), G4 (WGS84 Error < 1.5m), G5 (ORCA Safety > 2.0m), G6 (Framerate = 60 FPS).
