# 🗺️ NDMA-Aligned Tactical Rescue Scenarios (Subsystem F Module F1)

## 📌 1. Overview
This document specifies the operational rescue profiles for Project SUTRA, aligned with National Disaster Management Authority (NDMA) guidelines for search and rescue operations in severe terrain and disaster scenarios.

---

## 🌊 Scenario 1: Mountain Flash Flood & Landslide (Kedarnath Valley Profile)

### 1. Environmental Characteristics
* **Terrain:** Steep granite valley walls, narrow river gorges, mudslides.
* **Comms State:** Total cellular blackout; mountain obstacles causing Non-Line-of-Sight (NLOS) RF attenuation.
* **GPS State:** Heavy multipath reflection off cliff faces; degraded GPS positioning accuracy ($> 15\text{m}$ error).

### 2. SUTRA Swarm Deployment Profile
* **Swarm Size:** 5 Autonomous UAVs (Quadrotors).
* **Launch Elevation:** 2,200m ASL.
* **Search Pattern:** Parallel Ridge Lawnmower Search with VIO (Visual-Inertial Odometry) GPS-denied navigation.
* **Survivor Detection:** Dual Thermal + RGB visual detection using YOLOv8-Nano TensorRT on UAV companion computer.
* **Telemetry Streaming:** 802.11s mesh hopping back to mobile GCS vehicle at staging area.

---

## 🌲 Scenario 2: Dense Forest Fire & Survivor Search

### 1. Environmental Characteristics
* **Terrain:** Dense tree canopy, low thermal contrast due to ground fires, heavy smoke obscuration.
* **Flight Danger:** High ambient temperatures, thermal updrafts.

### 2. SUTRA Swarm Deployment Profile
* **Search Altitude:** 35m AGL (above tree canopy).
* **Sensor Mode:** Tri-Modal Cross-Attention Fusion (Thermal IR + RGB + mmWave Radar).
* **Target Geolocation:** Terrain-corrected DEM raycasting to output WGS84 GPS coordinates directly onto 3D GIS Mapbox GCS.
