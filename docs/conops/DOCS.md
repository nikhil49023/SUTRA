# 🚁 Subsystem F — Tactical Operations & Field Deployment Master Specification

[![CONOPS Specification](https://img.shields.io/badge/CONOPS-NDMA_ALIGNED-brightgreen.svg)]()
[![Field SOP](https://img.shields.io/badge/Field_SOP-VERIFIED-brightgreen.svg)]()
[![Presentation Narrative](https://img.shields.io/badge/Presentation_Narrative-READY-brightgreen.svg)]()

> **Subsystem Lead:** Rohith Kumar  
> **Branch:** `feature/subsystem-f-ops`  
> **Location:** `docs/conops/`  
> **Current Audit Status:** ✅ **COMMITTED & SPECIFIED**

---

## 📊 1. Scope of Work & Subsystem Modules

Subsystem F defines the real-world operational layer, rescue protocols, and field deployment procedures for Project SUTRA in GPS-denied and communication-challenged disaster zones.

| Module | Title | Primary Scope | Primary Deliverables | Status |
|---|---|---|---|:---:|
| **Module F1** | **NDMA Rescue CONOPS** | Concept of Operations aligned with NDMA guidelines for flood & landslide rescue | Kedarnath Flood & Wayanad Landslide operational search corridor profiles | ✅ **COMMITTED** |
| **Module F2** | **Field Deployment SOP** | Pre-flight checklists, ground crew safety boundaries & emergency aborts | Step-by-step physical drone assembly, telemetry setup & hazard checklist | ✅ **COMMITTED** |
| **Module F3** | **Tactical Rescue Storytelling** | Operational mission narrative for jury defense & presentation | Step-by-step disaster scenario presentation script & rescue workflow defense | ✅ **COMMITTED** |

---

## 🗺️ 2. Module F1: NDMA Rescue CONOPS (Concept of Operations)

### Disaster Mission Profile A: Flash Flood Mountain Valley (e.g., Kedarnath)
* **Operational Challenge:** Steep gorge terrain, heavy rain/fog, loss of GPS signal, collapsed cellular towers.
* **SUTRA Deployment Strategy:**
  1. **Phase 1 (Staging):** Launch vehicle arrives at designated safe staging ground (500m outside active flood line).
  2. **Phase 2 (Swarm Fan-Out):** 5 drones launch autonomously; 802.11s Wi-Fi mesh nodes establish dynamic network.
  3. **Phase 3 (Parallel Search Corridors):** Swarm executes non-overlapping 3D elevation search patterns at 30m AGL.
  4. **Phase 4 (Thermal/Visual Detection):** TensorRT edge detectors identify survivors on rooftops or riverbanks and stream WGS84 GPS raycast coordinates to 3D GIS GCS.

### Disaster Mission Profile B: Forest Fire & Dense Canopy Recon
* **Operational Challenge:** Heavy smoke, thermal occlusion, rapid wind shifts.
* **SUTRA Deployment Strategy:**
  * Swarm operates in dual-sensor mode (Thermal + mmWave Radar) to penetrate canopy cover and locate trapped personnel.

---

## 📋 3. Module F2: Field Deployment SOP & Pre-Flight Checklist

### Phase 1: Physical & Power Inspection (T-15 Minutes)
- [ ] Inspect carbon fiber frame integrity, propellers, and motor mounts on all 5 UAVs.
- [ ] Confirm flight battery voltage ($\ge 16.8\text{V}$ for 4S LiPo) and companion computer supply.
- [ ] Inspect optical flow lenses and micro-LiDAR/depth sensors for dust or obstruction.

### Phase 2: Telemetry & Mesh Link Establishment (T-10 Minutes)
- [ ] Power on GCS laptop running 3D GIS Dashboard (`sutra_gcs`).
- [ ] Verify 802.11s mesh network routing table across all 5 UAV IP addresses.
- [ ] Confirm PX4 MicroXRCE-DDS agent handshake over UDP port 8888.

### Phase 3: Pre-Flight Safety & Emergency Protocols (T-5 Minutes)
- [ ] Establish 10m safety perimeter clear of human personnel.
- [ ] Test 1-click Emergency Return-To-Launch (RTL) trigger on GCS dashboard.
- [ ] Verify automated geofence boundary ($X, Y \le 500\text{m}$, $Z \le 60\text{m}$).

---

## 🎤 4. Module F3: Tactical Rescue Storytelling & Presentation Role

During project evaluations and jury defenses, Subsystem F Lead (Rohith Kumar) presents the **Operational & Field Rescue Strategy**:

1. **The Rescue Need:** Explaining why traditional manual search fails in disaster zones and how autonomous swarms solve situational awareness gaps.
2. **The Field Workflow:** Presenting the step-by-step CONOPS from vehicle arrival to survivor coordinate streaming.
3. **Safety & Hazard Defense:** Answering evaluator questions regarding real-world drone safety, emergency aborts, and field deployment logistics.

---

## 🌳 5. Subsystem F File Structure

```
docs/conops/
├── DOCS.md                         # Subsystem F Master Specification & Modules
├── CONOPS_NDMA_Rescue_Profiles.md  # Detailed Kedarnath & Forest Fire Rescue Scenarios
└── Field_Deployment_SOP.md         # Pre-flight checklists & emergency field procedures
```

---

## 🛠️ 6. Step-by-Step Execution Guide

### Step 1: Branch Sync
```bash
git checkout feature/subsystem-f-ops
git fetch origin dev && git merge origin/dev --no-edit
```

### Step 2: Verify Specification Completeness
```bash
ls -la docs/conops/
```
