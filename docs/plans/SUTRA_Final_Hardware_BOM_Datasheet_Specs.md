# 🛒 SUTRA Swarm Drone: Final Hardware BOM, Datasheet Specs & Live Pricing Guide

> **Author & Tech Architect:** Nikhil  
> **System:** Project SUTRA Student Hackathon Swarm Architecture  
> **Target Cost:** Under ₹10,000 (~$119 USD) per flying drone  
> **Document Purpose:** Authoritative Hardware Specifications, Pinout Diagrams, Live Vendor Pricing, and Datasheets for Physical Drone Assembly.

---

## 💰 1. Live Indian Vendor Pricing & Availability Matrix

*Fetched live from Robu.in, Robocraze, and Amazon India:*

| Component Category | Recommended Hardware Component | Robu.in Price | Robocraze Price | Stock Status | Final Choice & Budget |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **GPS-Denied Sensor** | **Matek / ThoneFlow 3901U (VL53L1X LiDAR + PMW3901 Optical Flow)** | **₹2,350** | ₹2,400 | **IN STOCK ✅** | **₹2,350** |
| **Flight Controller** | **SpeedyBee F405 V3 / Omnibus F4 V3 FC** | **₹2,500** | ₹5,059 (Stack) | **IN STOCK ✅** | **₹2,500** |
| **Motors & ESCs** | **A2212 1400KV Motors + 30A ESCs (Combo Set of 4)** | ₹2,672 (Indiv) | **₹2,400** (Set of 4) | **IN STOCK ✅** | **₹2,400** |
| **Quadcopter Frame** | **F450 Glass Fiber Quadcopter Frame (Integrated PCB)** | **₹726** | ₹690 | **IN STOCK ✅** | **₹726** |
| **Power System** | **3S 2200mAh 35C LiPo Battery + 3A UBEC 5V Regulator** | **₹1,450** | ₹1,550 | **IN STOCK ✅** | **₹1,450** |
| **Propellers** | **1045 Nylon Propellers (2 Pairs)** | **₹180** | ₹200 | **IN STOCK ✅** | **₹180** |
| **Edge AI Compute** | **DFRobot ESP32-S3 AI CAM** | *Owned* | *Owned* | **OWNED ✅** | **₹0** |
| **Swarm Comms Node** | **ESP-WROOM-32 Dev Board + LoRa Ra-02 (433MHz)** | *Owned* | *Owned* | **OWNED ✅** | **₹0** |
| **GCS Serial Bridge** | **CP2102 USB-to-TTL Serial Converter** | *Owned* | *Owned* | **OWNED ✅** | **₹0** |
| **TOTAL COST PER DRONE** | — | — | — | — | **₹9,606 (~$115 USD)** |

---

## 🔬 2. Authoritative Hardware Datasheet Specifications

### 📡 A. GPS-Denied Sensor: Matek / ThoneFlow 3901U (VL53L1X LiDAR + PMW3901 Optical Flow)
```
       ┌─────────────────────────────────────────────────────────────┐
       │              3901U COMBINATION SENSOR MODULE                │
       │                                                             │
       │   [ 940nm VCSEL Laser ]           [ PMW3901 Optical Flow ]  │
       │   ST VL53L1X LiDAR                8x8 Tracking Matrix       │
       └─────────────────────────────────────────────────────────────┘
```
* **Optical Flow Sensor:** PixArt PMW3901 (8x8 pixel tracking algorithm, min 80 lux lighting).
* **LiDAR Sensor:** STMicroelectronics VL53L1X Time-of-Flight (ToF) 940nm VCSEL laser.
* **LiDAR Range:** 4.0 cm to 400 cm (4.0m max altitude @ 50Hz refresh rate).
* **Interface:** UART (TTL 115200 Baud) connected to Flight Controller UART3 (`TX/RX/5V/GND`).
* **Operating Voltage:** 4.5V – 5.5V (Current draw: 50mA).
* **Weight:** 3.5g (Mounted facing down towards ground).

---

### 🧠 B. Flight Controller: SpeedyBee F405 V3 / Omnibus F4 V3 FC
* **Main Processor (MCU):** STM32F405VG (168MHz ARM Cortex-M4 with hardware FPU).
* **IMU (Gyro/Accel):** ICM-42688-P / MPU6000 (SPI 8kHz sampling rate).
* **Barometer:** DPS310 / BMP280.
* **Hardware UART Ports (5x Serial Ports):**
  * `UART1`: Receiver / Radio Telemetry
  * `UART2`: ESP32 MAVLink Offboard Command Stream (`TX2/RX2 @ 921,600 Baud`)
  * `UART3`: Optical Flow + VL53L1X LiDAR Sensor (`TX3/RX3 @ 115,200 Baud`)
  * `UART4`: Optional External GPS
  * `UART6`: ESC Telemetry / SmartAudio
* **Integrated BEC Power:** Dual 5V @ 2A + 9V @ 2A regulated outputs.
* **Mounting Pattern:** 30.5mm x 30.5mm (M3 standard).

---

### ⚡ C. Motors & ESCs: A2212 1400KV Motors + 30A ESCs
* **Motor Velocity Constant:** 1400 KV (RPM per Volt).
* **Stator Dimensions:** 22mm Diameter x 12mm Height.
* **Shaft Diameter:** 3.17 mm (includes 1045 prop adapter).
* **Max Continuous Current:** 16 Amps (60 seconds) / Max Power: ~175W per motor.
* **Thrust Output:** 825g per motor (Total quad thrust: **3,300g / 3.3kg**).
* **ESC Rating:** 30A Continuous (Burst 40A / 10s) with 5V 2A Linear BEC.
* **ESC Connectors:** Pre-soldered 3.5mm female bullet connectors.

---

### 🚁 D. Quadcopter Frame: F450 Glass Fiber Frame
* **Wheelbase:** 450 mm diagonal motor-to-motor distance.
* **Materials:** High-impact Polyamide Nylon arms + Glass Fiber PCB center plates.
* **Integrated Power Distribution Board (PDB):** Gold-plated PCB bottom plate for soldering 4x ESC power leads directly.
* **Empty Frame Weight:** 282g.

---

### 🔋 E. Power System: 3S 2200mAh 35C LiPo Battery
* **Cell Configuration:** 3S1P (11.1V Nominal, 12.6V Peak).
* **Capacity & Energy:** 2200 mAh (24.42 Watt-Hours).
* **Discharge Rate:** 35C Continuous (77 Amps) / 70C Burst (154 Amps).
* **Flight Time:** **10.5 to 12.0 Minutes** under normal hover.
* **Main Plug:** XT60 / Deans T-Plug (12 AWG silicone wire).
* **Weight:** 178g.

---

### 📷 F. Companion AI Compute & Comms (Already Owned Inventory)
* **DFRobot ESP32-S3 AI CAM:** Dual-Core 240MHz Xtensa LX7 + Vector Instructions, 512KB SRAM, 8MB PSRAM, OV2640 2MP Night-Vision Camera.
* **ESP-WROOM-32 + Ai-Thinker LoRa Ra-02:** 2.4GHz ESP-NOW inter-drone mesh + 433MHz LoRa SX1278 (up to 5km range) running SwarmRAFT consensus.
* **CP2102 USB Bridge:** USB-to-TTL serial converter streaming JSON telemetry to the Mapbox GL JS 3D GCS dashboard.

---

## ⚡ 3. Power & All-Up Weight (AUW) Summary

```
   ┌──────────────────────────────────────────────────────────────┐
   │                  DRONE POWER & WEIGHT BUDGET                 │
   ├──────────────────────────────┬───────────────────────────────┤
   │ Avionics Power Draw (5V)     │ 4.45 Watts                    │
   │ Propulsion Power Draw (Hover)│ 103.28 Watts                  │
   │ Total All-Up Weight (AUW)    │ 785 grams (0.785 kg)          │
   │ Max Motor Thrust Output      │ 3,300 grams (3.30 kg)         │
   │ Thrust-to-Weight Ratio       │ 4.20 : 1 (Exceptional Agility)│
   │ Active Flight Endurance      │ ~11.0 Minutes                 │
   └──────────────────────────────┴───────────────────────────────┘
```

---

## 🎯 4. Pre-Purchase Verification Checklist

When ordering from **Robu.in** / **Robocraze**:
1. [ ] Confirm SpeedyBee F405 V3 / Omnibus F4 V3 mounting hole pattern is 30.5x30.5mm.
2. [ ] Confirm A2212 1400KV motors include 1045 prop adapter collets.
3. [ ] Confirm 30A ESCs have 3.5mm bullet connectors pre-soldered.
4. [ ] Confirm Matek 3901-L0X / ThoneFlow 3901U module has both PMW3901 optical flow and VL53L1X laser LiDAR on the same board.
5. [ ] Confirm 3S LiPo battery connector matches your frame PDB main wire (XT60).
