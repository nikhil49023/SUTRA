# ⚡ Power Budget, Weight Breakdown & Cost Approximation Analysis

**Author & Tech Architect:** Nikhil  
**System:** Project SUTRA Swarm-Compatible Tactical Drone  
**Active Branch:** `feature/subsystem-b-comms`

---

## ⚡ 1. Complete Power Budget & Flight Endurance Analysis

### A. Avionics & Onboard Electronics Consumption (5V / 12V Rail)

| Component | Nominal Operating Voltage | Average Current (A) | Power Consumption (W) | Peak Power (W) |
| :--- | :---: | :---: | :---: | :---: |
| **NVIDIA Jetson Orin Nano (8GB)** | 12V / 5V | 0.83 A | **10.0 W** | 15.0 W |
| **Pixhawk 6C Autopilot** | 5.2V | 0.50 A | **2.6 W** | 3.5 W |
| **DFRobot ESP32-S3 AI CAM** | 5.0V | 0.30 A | **1.5 W** | 2.5 W |
| **ESP-WROOM-32 + LoRa Ra-02** | 5.0V | 0.24 A | **1.2 W** | 2.0 W |
| **Intel RealSense T265 (VIO)** | 5.0V (USB 3.0) | 0.30 A | **1.5 W** | 2.5 W |
| **FLIR Lepton 3.5 Thermal** | 3.3V | 0.05 A | **0.16 W** | 0.25 W |
| **TFmini Plus LiDAR** | 5.0V | 0.14 A | **0.7 W** | 1.0 W |
| **Subtotal Avionics Power** | — | — | **17.66 W** | **26.75 W** |

---

### B. Propulsion Power Consumption (6S 22.2V LiPo Rail)

- **Hover Thrust Required**: Total All-Up Weight (AUW) $\approx 1,450\text{ grams}$ ($14.22\text{ N}$).
- **Hover Thrust Per Motor**: $1,450\text{ g} / 4 = 362.5\text{ grams per motor}$.
- **Motor Efficiency (BrotherHobby 2806.5 @ 7-inch props)**: $\approx 6.5\text{ grams/Watt}$.
- **Hover Power Per Motor**: $362.5\text{ g} / 6.5\text{ g/W} = 55.77\text{ Watts}$.
- **Total Propulsion Power (4 Motors at Hover)**: $55.77\text{ W} \times 4 = \mathbf{223.08\text{ Watts}}$.

---

### C. Total Power & Flight Endurance Calculation

- **Total Swarm Drone Power Draw (Hover + Avionics)**:
  $$\text{Total Hover Power} = 223.08\text{ W (Propulsion)} + 17.66\text{ W (Avionics)} = \mathbf{240.74\text{ Watts}}$$

- **Battery Energy Capacity (6S 4500mAh @ 22.2V)**:
  $$\text{Nominal Energy} = 4.5\text{ Ah} \times 22.2\text{ V} = \mathbf{99.9\text{ Watt-Hours (Wh)}}$$
  $$\text{Usable Energy (80% Depth of Discharge Safety Limit)} = 99.9\text{ Wh} \times 0.80 = \mathbf{79.92\text{ Wh}}$$

- **Calculated Swarm Flight Time (Endurance)**:
  $$\text{Flight Time} = \left(\frac{79.92\text{ Wh}}{240.74\text{ W}}\right) \times 60\text{ minutes} = \mathbf{19.91\text{ Minutes (\approx 20 Mins)}}$$

---

## ⚖️ 2. Mass & Weight Breakdown (All-Up Weight - AUW)

| Component Category | Item Description | Weight per Unit (g) | Qty | Total Mass (g) |
| :--- | :--- | :---: | :---: | :---: |
| **Airframe & Hardware** | Mark4 7-inch Carbon Fiber Frame + Hardware | 185 g | 1 | 185 g |
| **Motors** | BrotherHobby 2806.5 1300KV Motors | 48 g | 4 | 192 g |
| **Propellers** | HQProp 7x4x3 3-Blade Props | 8.5 g | 4 | 34 g |
| **ESC & Wiring** | 4-in-1 50A BLHeli_32 ESC + XT60 Wiring | 45 g | 1 | 45 g |
| **Battery** | 6S 4500mAh 100C LiPo Battery | 580 g | 1 | 580 g |
| **Autopilot** | Pixhawk 6C + PM02D Power Module | 75 g | 1 | 75 g |
| **Companion Compute** | NVIDIA Jetson Orin Nano (8GB) + Heatsink | 140 g | 1 | 140 g |
| **AI Vision Camera** | DFRobot ESP32-S3 AI CAM Module | 18 g | 1 | 18 g |
| **VIO Camera** | Intel RealSense T265 Optical Flow | 68 g | 1 | 68 g |
| **Thermal Sensor** | FLIR Lepton 3.5 + Breakout PCB | 12 g | 1 | 12 g |
| **LiDAR Sensor** | TFmini Plus Micro LiDAR | 11 g | 1 | 11 g |
| **Comms Nodes** | ESP32 Dev Board + LoRa Ra-02 Module | 22 g | 1 | 22 g |
| **Fasteners & Mounts** | 3D Printed TPU Sensor Mounts & Straps | 68 g | 1 | 68 g |
| **TOTAL ALL-UP WEIGHT (AUW)** | — | — | — | **1,450 grams (1.45 kg)** |

### 🚀 Thrust-to-Weight Ratio ($T/W$):
- **Maximum Thrust Output (4x 2806.5 Motors on 6S)**: $4 \times 1,180\text{ g} = \mathbf{4,720\text{ grams (4.72 kg)}}$.
- **Thrust-to-Weight Ratio**:
  $$T/W = \frac{4,720\text{ g}}{1,450\text{ g}} = \mathbf{3.255 : 1}$$
  *(A ratio of $3.25:1$ is ideal for tactical military/rescue drones, providing excellent wind resistance and agility).*

---

## 💰 3. Financial Cost Approximation

### Per-Drone Build Cost Breakdown

| Component Group | Items Included | Approx Cost (INR ₹) | Approx Cost (USD $) |
| :--- | :--- | :---: | :---: |
| **Flight Dynamics (GNC)** | Pixhawk 6C + PM02D Power Module + Safety Switch | ₹21,350 | $257 |
| **Compute & Edge AI** | NVIDIA Jetson Orin Nano (8GB) | ₹24,500 | $295 |
| **GPS-Denied Sensors** | RealSense T265 VIO + FLIR Thermal + TFmini LiDAR | ₹39,300 | $473 |
| **Existing Owned Inventory** | ESP32-S3 CAM, 2x ESP32 Devs, 2x LoRa Ra-02, CP2102 | **₹0** (Owned) | **$0** (Owned) |
| **Propulsion & Frame** | Mark4 7-inch Frame + 4x Motors + 50A ESC + Props | ₹14,150 | $170 |
| **Battery & Power** | 6S 4500mAh LiPo Battery | ₹5,200 | $62 |
| **TOTAL COST PER DRONE** | — | **₹1,04,500** | **$1,257** |

---

### Swarm Deployment Budget Scaling

| Swarm Configuration | Number of Flying Drones | Ground Control Station Cost | Total Swarm Budget (INR ₹) | Total Swarm Budget (USD $) |
| :--- | :---: | :---: | :---: | :---: |
| **2-Drone Tactical Swarm** | 2 | Laptop (Owned) + CP2102 Bridge | **₹2,09,000** | **$2,514** |
| **4-Drone Full Tactical Swarm**| 4 | Laptop (Owned) + CP2102 Bridge | **₹4,18,000** | **$5,028** |
