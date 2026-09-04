# 🎓 SUTRA Student Hackathon Ultra-Low-Cost Swarm Drone Architecture

**Author & Tech Architect:** Nikhil  
**Target:** Maximize Hackathon Score under ₹10,000 ($120 USD) Total Budget  
**Active Branch:** `feature/subsystem-b-comms`

---

## 🎯 Strategic Optimization: 90.5% Cost Reduction

To make Project SUTRA 100% feasible for a student hackathon, we replace industrial hardware with **open-source, high-efficiency micro-avionics**. 

By leveraging your **already owned Robu.in inventory** (ESP32-S3 AI CAM, ESP-WROOM-32 dev boards, Ai-Thinker LoRa Ra-02 modules, CP2102, breadboard), we cut the cost per drone from **₹1,04,500 down to ₹9,900 ($119 USD)** while preserving all 5 core swarm capabilities:

1. **Autonomous Offboard Waypoints**: ESP32 sends MAVLink setpoints to an F4 flight controller over UART.
2. **Dual-Band Wireless Mesh**: 802.11s/ESP-NOW inter-drone mesh + 433MHz LoRa Ra-02 long-range GCS backhaul.
3. **SwarmRAFT Consensus**: Sub-500ms leader failover running on ESP32-WROOM-32.
4. **GPS-Denied Optical Flow Hold**: Optical flow sensor + VL53L1X LiDAR.
5. **Edge AI Perception**: ESP32-S3 onboard neural vector extraction & night vision survivor detection.

---

## 🛒 Student Hackathon Ultra-Low-Cost Bill of Materials (BOM)

| Component Category | Recommended Budget Component | Qty | Function & Swarm Compatibility | Cost (INR ₹) | Cost (USD $) |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **Flight Controller** | **SpeedyBee F405 V3 / F4 V3 FC** | 1 | Runs ArduPilot / INAV, EKF position hold, MAVLink telemetry serial port. | ₹2,500 | $30 |
| **Edge AI Companion Compute** | **DFRobot ESP32-S3 AI CAM** *(Owned)* | 1 | Micro-TFLite neural feature extraction, night vision, MAVLink offboard dispatcher. | **₹0** | **$0** |
| **Swarm Comms & Consensus** | **ESP32 + LoRa Ra-02 (433MHz)** *(Owned)* | 1 | ESP-NOW 2.4GHz semantic tensor mesh + 433MHz LoRa SwarmRAFT GCS link up to 5km. | **₹0** | **$0** |
| **GCS Serial Bridge** | **CP2102 USB-to-TTL Converter** *(Owned)* | 1 | Connects GCS receiver node to Mapbox GL JS 3D GCS dashboard over serial. | **₹0** | **$0** |
| **GPS-Denied Sensors** | **Matek / ThoneFlow 3901U Optical Flow + VL53L1X LiDAR** | 1 | Optical flow position hold + laser altitude hold in GPS-denied forests/indoors. | ₹2,350 | $28 |
| **Frame** | **F450 Frame (Multi-Rotor Prototype) / F550 Hexacopter** | 1 | Durable, easy to repair, integrated PCB power distribution board. | ₹850 | $10 |
| **Motors & ESCs** | **A2212 1400KV Motors + 30A ESCs (Combo Set of 4)** | 1 | High-thrust brushless motor & ESC combo kit. | ₹2,400 | $29 |
| **Propellers** | **1045 Nylon Propellers (2 Pairs)** | 1 | 10-inch propellers optimized for 3S 2212 motor setup. | ₹180 | $2 |
| **Power System** | **3S 2200mAh 35C LiPo Battery + 3A UBEC** | 1 | Provides 12–15 mins flight endurance + 5V regulated power to ESP32. | ₹1,620 | $20 |
| **TOTAL COST PER DRONE** | — | — | — | **₹9,900** | **$119** |

---

## ⚡ Power Budget & Weight Comparison (Ultra-Low-Cost vs Industrial)

### Power Consumption (3S 11.1V System):
- **Avionics & Sensors Power**: **3.4 Watts** (ESP32-S3 CAM: 1.5W, ESP32 + LoRa: 1.2W, Optical Flow: 0.7W).
- **Propulsion Power (Hover @ 900g AUW)**: **118 Watts** (4x 2212 Motors @ $7.6\text{ g/W}$).
- **Total Power Draw**: **121.4 Watts**.
- **Usable Battery Energy (3S 2200mAh @ 11.1V, 80% DoD)**: **19.5 Wh**.
- **Flight Time**: $\left(\frac{19.5\text{ Wh}}{121.4\text{ W}}\right) \times 60 = \mathbf{9.6\text{ to 12.0 Minutes}}$.

### Weight Breakdown (All-Up Weight - AUW):
- F450 Frame: 282 g
- 4x 2212 Motors + ESCs: 240 g
- 3S 2200mAh Battery: 178 g
- F4 FC + ESP32 Boards + Sensors: 85 g
- **TOTAL ALL-UP WEIGHT (AUW)**: **785 grams (0.785 kg)**.
- **Max Motor Thrust Output**: **3,300 grams (3.3 kg)**.
- **Thrust-to-Weight Ratio**: $\mathbf{4.20 : 1}$ (Extremely responsive & agile for quick flight tests!).

---

## 💰 Student Hackathon Budget Summary Table

| Swarm Configuration | Total Cost (INR ₹) | Total Cost (USD $) | Status |
| :--- | :---: | :---: | :--- |
| **Bench HITL Prototype (Using Owned Parts)** | **₹0** | **$0** | **Ready to Build NOW** |
| **1-Drone Flying Prototype** | **₹9,900** | **$119** | **Ultra-Low Student Budget** |
| **2-Drone Physical Swarm** | **₹19,800** | **$238** | **Full Hackathon Demonstration** |
