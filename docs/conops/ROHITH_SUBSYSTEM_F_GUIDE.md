# 🚁 Subsystem F: Rohith's Master Action & Jury Presentation Guide

> **Role Title:** Subsystem F Lead — Tactical Rescue Operations & Field Deployment  
> **Dedicated Location:** `docs/conops/`  
> **Assigned Branch:** `feature/subsystem-f-ops`  
> **Focus Scope:** 100% Non-Coding Operational Strategy, CONOPS, Field SOPs & Jury Presentation Storytelling

---

## 🎤 1. Your Jury Elevator Pitch & Role Statement

When the jury, professors, or evaluators ask you: **"What is your role in Project SUTRA?"**, present this exact response with 100% confidence:

> *"I am the **Subsystem F Lead for Tactical Rescue Operations & Field Deployment**. 
> While my teammates engineer the GNC flight physics, mesh networking, AI perception models, and 3D GIS dashboard, my role is to bridge our software stack with real-world disaster response. 
> I developed SUTRA's **NDMA-aligned Concept of Operations (CONOPS)**, specified our flash flood and forest fire rescue search corridors, created our **Field Deployment SOPs**, and lead our operational rescue storytelling during mission evaluations."*

---

## 📋 2. Your Step-by-Step Task Checklist (100% Non-Coding)

Your deliverables are located inside `docs/conops/`. You do not need to write C++ or Python code. Your job is to make SUTRA's operational deployment rock-solid.

### 📌 Task 1: Complete Module F1 — NDMA Rescue CONOPS (`docs/conops/CONOPS_NDMA_Rescue_Profiles.md`)
- [ ] **Kedarnath Flash Flood Profile:** Describe how 5 drones arrive in a rescue vehicle, deploy at 30m altitude, and map steep gorge corridors.
- [ ] **Forest Fire Canopy Profile:** Describe how drones switch to dual-sensor thermal mode to locate trapped personnel under dense smoke.
- [ ] **NDMA Guideline Mapping:** Map SUTRA's multi-drone features to official National Disaster Management Authority (NDMA) search guidelines.

### 📌 Task 2: Complete Module F2 — Field Deployment SOP (`docs/conops/Field_Deployment_SOP.md`)
- [ ] **Pre-Flight Hardware Checklist:** List physical checks for carbon fiber frames, propellers, battery voltages ($\ge 16.8\text{V}$), and depth sensors.
- [ ] **Telemetry Setup Steps:** Document powering up the GCS station and checking 802.11s Wi-Fi mesh link health.
- [ ] **Ground Safety Rules:** Define 10-meter human safety perimeters and emergency abort protocols.

### 📌 Task 3: Lead Module F3 — Jury Presentation & Rescue Storytelling
- [ ] **Opening Presentation Narrative:** Explain *why* traditional single-drone manual search fails in disasters (slow, dangerous, zero fault tolerance).
- [ ] **Operational Flow Presentation:** Walk the jury through the step-by-step rescue timeline (Staging $\rightarrow$ Swarm Takeoff $\rightarrow$ Search Corridors $\rightarrow$ Survivor Geolocation $\rightarrow$ GCS Alert).
- [ ] **Q&A Defense Mastery:** Be the primary presenter answering all jury questions about **real-world drone safety, emergency aborts, battery management, and field logistics**.

---

## 🔗 3. How Your Subsystem Interconnects With the Team

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 SUBSYSTEM F: TACTICAL OPERATIONS & FIELD DEPLOYMENT         │
│                                (Rohith Kumar)                               │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                  │                                  │
          ▼                                  ▼                                  ▼
┌──────────────────┐               ┌──────────────────┐               ┌──────────────────┐
│   SUBSYSTEM A    │               │   SUBSYSTEM C    │               │   SUBSYSTEM D    │
│  (GNC & Flight)  │               │  (AI Perception) │               │   (3D GIS GCS)   │
│ Provides flight  │               │ Provides target  │               │ Renders search   │
│ path execution   │               │ classification   │               │ corridor map     │
│ for your search  │               │ for survivor     │               │ overlays & SOP   │
│ corridors        │               │ detection        │               │ status badges    │
└──────────────────┘               └──────────────────┘               └──────────────────┘
```

---

## 🛠️ 4. Git Branching & Workflow Rules

1. **Working Branch:** Always work on `feature/subsystem-f-ops`.
2. **Directory Isolation:** Only modify files inside `docs/conops/`.
3. **Branch Sync:** Run `git fetch origin dev && git merge origin/dev --no-edit` before making changes.
4. **Subsystem E Handover:** Share your finalized presentation deck notes with **Harika (Subsystem E Lead)** so she can format them into the master slide deck!
