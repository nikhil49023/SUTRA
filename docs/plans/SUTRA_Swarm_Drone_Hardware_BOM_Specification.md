# 🚁 SUTRA Swarm-Compatible Tactical Drone: Final Hardware Specification & Bill of Materials (BOM)

**Author & Tech Architect:** Nikhil  
**System:** Project SUTRA (Autonomous Multi-Drone Swarm System for SAR & Recon in GPS-Denied Environments)  
**Active Branch:** `feature/subsystem-b-comms`

---

## 🎯 Architectural Requirements for Swarm Compatibility

To operate as a robust, fully autonomous member of the Project SUTRA drone swarm, each physical drone MUST meet four non-negotiable hardware criteria:

1. **Onboard Compute**: Must carry an AI-capable companion computer (NVIDIA Jetson / ESP32-S3) running ROS 2 nodes, TensorRT edge AI, and ORCA 3D collision avoidance.
2. **PX4 Offboard Autopilot Interface**: Must use a PX4-compatible flight controller running Micro-XRCE-DDS over UART @ 921600 baud.
3. **Dual-Band Wireless Infrastructure**: 802.11s Wi-Fi mesh for short-range semantic tensor exchange + 433MHz LoRa Ra-02 for 5km SwarmRAFT consensus backhaul.
4. **GPS-Denied Sensor Suite**: Optical flow / Visual-Inertial Odometry (VIO) + Micro LiDAR for 3D position hold in forests and indoor structures.

---

## 🛒 Complete Bill of Materials (BOM) per Swarm Drone

### Section 1: Flight Control & Autopilot (Subsystem A - GNC)

| Component | Recommended Model | Qty | Function & Swarm Compatibility | Approx Cost |
| :--- | :--- | :---: | :--- | :---: |
| **Flight Controller** | **Pixhawk 6C** (or Pixhawk 4 / Cube Orange) | 1 | Runs PX4 Autopilot firmware, 500Hz EKF3 state estimation, Micro-XRCE-DDS ROS 2 bridge. | ₹18,500 |
| **Power Module** | **PM02D Power Management Board** | 1 | Current/voltage sensing, provides clean 5.2V power to Pixhawk and telemetry modules. | ₹2,200 |
| **Safety Switch & Buzzer**| PX4 Arming Safety Switch + Buzzer | 1 | Pre-flight hardware arming safety & audible status indication. | ₹650 |

---

### Section 2: Onboard Companion Compute & AI (Subsystems A & C)

| Component | Recommended Model | Qty | Function & Swarm Compatibility | Approx Cost |
| :--- | :--- | :---: | :--- | :---: |
| **Edge AI Companion Computer** | **NVIDIA Jetson Orin Nano (8GB)** | 1 | Executes ROS 2 (Jazzy), YOLOv8 TensorRT survivor detection (60 FPS), ORCA 3D avoidance, VIO. | ₹24,500 |
| **AI Vision Camera (Visual)** | **DFRobot ESP32-S3 AI CAM** *(Already Owned)* | 1 | Night vision visual capture, 16-dim semantic feature vector extraction. | **₹0** (Owned) |
| **Thermal Sensor (FLIR)** | **FLIR Lepton 3.5** (with Radiometric breakout) | 1 | 160x120 thermal infrared imaging for victim detection under forest canopy. | ₹19,000 |
| **GPS-Denied VIO Camera** | **Intel RealSense T265** (or PX4FLOW + Distance) | 1 | Dual fisheye Visual-Inertial Odometry for position tracking without GPS. | ₹16,500 |
| **3D Altitude / Obstacle LiDAR** | **TFmini Plus Micro LiDAR** (0.1m - 12m) | 1 | 100Hz laser rangefinder for precision altitude hold and terrain following. | ₹3,800 |

---

### Section 3: Swarm Communication & Mesh Infrastructure (Subsystem B)

| Component | Recommended Model | Qty | Function & Swarm Compatibility | Approx Cost |
| :--- | :--- | :---: | :--- | :---: |
| **Mesh / Consensus Controller** | **ESP-WROOM-32 Dev Board** *(Already Owned)* | 1 | 802.11s / ESP-NOW short-range semantic mesh node + SwarmRAFT consensus. | **₹0** (Owned) |
| **Long-Range Telemetry Link** | **Ai-Thinker LoRa Ra-02 (433MHz)** *(Owned)* | 1 | 433MHz SX1278 transceiver with 17.3cm antenna for 5km SwarmRAFT GCS backhaul. | **₹0** (Owned) |
| **GCS Laptop Serial Bridge** | **CP2102 USB-to-TTL Converter** *(Already Owned)* | 1 | Bridges receiver ESP32 node to laptop Mapbox GL JS 3D GCS dashboard. | **₹0** (Owned) |

---

### Section 4: Frame, Propulsion & Power System

| Component | Recommended Model | Qty | Function & Swarm Compatibility | Approx Cost |
| :--- | :--- | :---: | :--- | :---: |
| **Frame** | **Mark4 7-inch Carbon Fiber Frame** | 1 | Ultra-durable 3K carbon fiber quadcopter frame with vibration isolation. | ₹2,400 |
| **Brushless Motors** | **BrotherHobby / EMAX 2806.5 1300KV** | 4 | High-torque motors optimized for 7-inch props and heavy payload capacity. | ₹6,800 |
| **Electronic Speed Control** | **T-Motor / Skystars 4-in-1 50A BLHeli_32 ESC** | 1 | 50A continuous current rating, DShot600 protocol support. | ₹4,500 |
| **Propellers** | **HQProp 7x4x3 3-Blade Polycarbonate Props** | 2 pr | Low-noise, high-thrust 7-inch propellers. | ₹450 |
| **Battery** | **6S 4500mAh 100C LiPo Battery** | 1 | Provides 18–22 minutes continuous swarm mission endurance. | ₹5,200 |

---

## 🛠️ Complete Swarm Drone Wiring Interconnect Diagram

```
                                    ┌──────────────────────────────┐
                                    │    NVIDIA JETSON ORIN NANO   │
                                    │   (Edge AI & ROS 2 Host)     │
                                    └──────────────┬───────────────┘
                                                   │
                          ┌────────────────────────┼────────────────────────┐
                          │ USB 3.0                │ UART (921600)          │ USB / CSI
                          ▼                        ▼                        ▼
                ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
                │ RealSense T265    │    │   PIXHAWK 6C      │    │ DFRobot ESP32-S3  │
                │ (VIO GPS-Denied)  │    │ (PX4 Autopilot)   │    │ (AI Night Vision) │
                └───────────────────┘    └─────────┬─────────┘    └─────────┬─────────┘
                                                   │                        │
                                            PWM / DShot600                  │ UART
                                                   ▼                        ▼
                                         ┌───────────────────┐    ┌───────────────────┐
                                         │  4-in-1 50A ESC   │    │  ESP-WROOM-32     │
                                         │  & 4x Motors      │    │  (Swarm Mesh)     │
                                         └───────────────────┘    └─────────┬─────────┘
                                                                            │ SPI
                                                                            ▼
                                                                  ┌───────────────────┐
                                                                  │ Ai-Thinker LoRa   │
                                                                  │ Ra-02 (433MHz)    │
                                                                  └───────────────────┘
```

---

## 📋 Summary Cost & Procurement Table

- **Existing Owned Inventory Used**: ESP32-S3 CAM, 2x ESP32 Dev Boards, 2x LoRa Ra-02 modules, CP2102, Breadboard, Jumpers.
- **Additional Hardware Required Per Drone**: ~₹64,000 ($770 USD).
- **2-Drone Physical Swarm Total Procurement**: ~₹1,28,000.
