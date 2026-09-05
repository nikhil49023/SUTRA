# 🚁 SUTRA — GNC & Ground Station Judges Presentation Guide

> **Author / Lead:** Team Offgrid — Subsystem A (GNC & Flight Control) & Subsystem D (GCS)  
> **Target Audience:** Hackathon Judges & Technical Evaluators  
> **Live Launcher:** `python3 run_flask_gcs.py`  
> **Verification Command:** `pytest sutra_ws/src/sutra_gnc/flask_gcs/test_gnc_flask.py -v`

---

## ⚡ 1. 30-Second Elevator Pitch

> *"SUTRA (Swarm Unified Tactical Reconnaissance Architecture) is an autonomous multi-drone system designed for disaster search-and-rescue. We built a high-performance **Python GNC core** combined with a real-time **Flask Tactical Ground Control Station**. It implements 50Hz offboard waypoint guidance, **ORCA 3D collision avoidance** guaranteeing swarm separation > 2.8m (Gate G5), geodetic WGS-84 coordinate transforms, and camera raycasting for instant GPS target geolocation."*

---

## 🏛️ 2. System Architecture & Component Breakdown

```
                         ┌────────────────────────────────────────┐
                         │   Flask GCS Web UI (Tactical Dark)     │
                         │  - Leaflet GIS 3D Satellite Map        │
                         │  - Primary Flight Display (PFD Canvas) │
                         │  - Real-Time 10Hz SSE Telemetry Stream │
                         │  - NLP Tactical Mission Assistant      │
                         └───────────────────▲────────────────────┘
                                             │ REST & SSE Stream
                         ┌───────────────────▼────────────────────┐
                         │       app.py (Flask Web Server)        │
                         └───────▲────────────────────────▲───────┘
                                 │                        │
        ┌────────────────────────▼────────┐     ┌─────────▼────────────────────────┐
        │  fleet_manager.py (Fleet Core)  │     │   ai_bridge.py (Perception/SAR)  │
        │  - 20 Hz Simulation Loop        │     │  - Camera Raycast Geolocation    │
        │  - Multi-UAV Swarm State Sync   │     │  - YOLOv8 Bounding Box Stream    │
        │  - Coordinated Formations       │     │  - Natural Language NLP Parser   │
        └────────────────────────▲────────┘     └──────────────────────────────────┘
                                 │
        ┌────────────────────────▼────────────────────────────────────────┐
        │                 gnc_engine.py (Guidance & Control)              │
        │  - WGS-84 <-> Local NED Geodetic Transforms                     │
        │  - Euler Angles <-> Unit Quaternions Kinematics                 │
        │  - ORCA 3D (Velocity Obstacles) Swarm Separation Solver         │
        │  - Autonomous Waypoint State Machine (FSM)                      │
        │  - Geofence (500m) & Low Battery Failsafe Auto-RTL              │
        └─────────────────────────────────────────────────────────────────┘
```

---

## 📐 3. Mathematical Foundations (How to Explain the Math to Judges)

### A. Geodetic Coordinate Transformation (WGS-84 $\leftrightarrow$ Local NED)
GPS coordinates $(\text{Lat}, \text{Lon}, \text{Alt})$ are ellipsoidal coordinates on Earth's WGS-84 reference ellipsoid ($a = 6378137.0\text{ m}$, $e^2 = 0.00669438$).  
Flight controllers and ORCA operate in local Cartesian **North-East-Down (NED)** tangent planes:

$$\Delta \text{North} = (\phi - \phi_0) \cdot (R_M + h)$$
$$\Delta \text{East} = (\lambda - \lambda_0) \cdot (R_N + h) \cos(\phi_0)$$
$$\Delta \text{Down} = -(h - h_0)$$

Where $R_N$ and $R_M$ are the prime vertical and meridional radii of curvature.

### B. Attitude Kinematics (Euler Angles $\leftrightarrow$ Unit Quaternions)
To avoid **gimbal lock** singularity in 3D rotations, attitude is parameterized using unit quaternions $\mathbf{q} = [q_x, q_y, q_z, q_w]^T$:

$$q_w = \cos\frac{\phi}{2}\cos\frac{\theta}{2}\cos\frac{\psi}{2} + \sin\frac{\phi}{2}\sin\frac{\theta}{2}\sin\frac{\psi}{2}$$
$$q_x = \sin\frac{\phi}{2}\cos\frac{\theta}{2}\cos\frac{\psi}{2} - \cos\frac{\phi}{2}\sin\frac{\theta}{2}\sin\frac{\psi}{2}$$
$$q_y = \cos\frac{\phi}{2}\sin\frac{\theta}{2}\cos\frac{\psi}{2} + \sin\frac{\phi}{2}\cos\frac{\theta}{2}\sin\frac{\psi}{2}$$
$$q_z = \cos\frac{\phi}{2}\cos\frac{\theta}{2}\sin\frac{\psi}{2} - \sin\frac{\phi}{2}\sin\frac{\theta}{2}\cos\frac{\psi}{2}$$

*Empirically verified error norm:* $\|\mathbf{q}\| - 1.0 < 10^{-10}$.

### C. Gate G5 Verification: ORCA 3D Swarm Collision Avoidance
For any two drones $i$ and $j$ with relative position $\mathbf{p}_{\text{rel}} = \mathbf{p}_j - \mathbf{p}_i$ and relative velocity $\mathbf{v}_{\text{rel}} = \mathbf{v}_i - \mathbf{v}_j$:
1. Compute time to Closest Point of Approach (CPA): $t_{\text{cpa}} = \frac{\mathbf{p}_{\text{rel}} \cdot \mathbf{v}_{\text{rel}}}{\|\mathbf{v}_{\text{rel}}\|^2}$.
2. If $0 \le t_{\text{cpa}} \le \tau$ and separation distance $d_{\text{cpa}} < r_{\text{combined}}$ (where $r_{\text{combined}} = 3.6\text{ m}$):
3. Apply reciprocal evasive lateral normal: $\mathbf{u} = \frac{r_{\text{combined}} - d_{\text{cpa}}}{t_{\text{cpa}}} \cdot \hat{\mathbf{n}}_{\text{lat}}$.
4. **Result:** Drones reciprocally step aside to guarantee $> 2.8\text{ m}$ clearance at all times!

### D. Optical Camera Raycasting (Target Geolocation)
Maps camera image pixel $(u, v)$ to exact ground GPS coordinate:

$$d_{\text{ground}} = \frac{h_{\text{AGL}}}{\tan(-(\theta_{\text{gimbal}} + \Delta \theta_v))}$$
$$\text{Lat}_{\text{target}} = \text{Lat}_{\text{drone}} + \frac{d_{\text{ground}} \cos(\psi + \Delta \psi_h)}{111139.0}$$
$$\text{Lon}_{\text{target}} = \text{Lon}_{\text{drone}} + \frac{d_{\text{ground}} \sin(\psi + \Delta \psi_h)}{111139.0 \cdot \cos(\text{Lat}_{\text{drone}})}$$

---

## 🎬 4. Step-by-Step Live Demo Script for Judges

| Step | What to Do | What to Point Out to Judges |
|:---:|---|---|
| **1** | Run `python3 run_flask_gcs.py` and open `http://localhost:5000` | Point out the 3-column tactical dark UI, live Leaflet map, PFD attitude horizon, and 4-drone fleet status. |
| **2** | Click **"⚙️ ARM"** and then **"🚀 TAKEOFF 15M"** | Show the drone motors spin up (5200+ RPM), altitude climb on the PFD and telemetry cards, and status banner update. |
| **3** | Click anywhere on the map to add 3-4 waypoints, then click **"UPLOAD MISSION"** | Show the drone smoothly navigate to each waypoint using proportional guidance, auto-advancing at the 1.8m radius. |
| **4** | Click **"🦅 V-FORMATION"** or **"📡 GRID SEARCH"** | Watch all 4 drones (Alpha, Bravo, Charlie, Delta) synchronize into coordinated search corridors without colliding (ORCA 3D). |
| **5** | Look at the **"AI Perception & SAR"** camera box | Show detected survivor heat signatures (`SAR-01`), dynamic red/green bounding boxes, and camera raycasted GPS coordinates on the map. |
| **6** | Type in NLP Commander: `takeoff to 20m` or `emergency abort` | Show how natural language tactical voice/text commands parse directly into autonomous GNC actions. |
| **7** | Click **"🏡 RTL FAILSAFE"** | Show the drone automatically break its current mission, fly straight home, and execute an autoland sequence. |
| **8** | Run `pytest sutra_ws/src/sutra_gnc/flask_gcs/test_gnc_flask.py -v` in terminal | Show all 9 mathematical and Gate G5 benchmarks passing in `< 0.1` seconds. |

---

## 💬 5. Anticipated Judges' Questions & Answers

**Q1: Why did you build the GCS and GNC in Python/Flask?**  
> *"Python provides native interoperability with ROS 2, PyTorch Deep-JSCC neural encoders, and OpenCV/YOLO perception pipelines without serialization overhead. Flask allows us to deliver a lightweight, high-performance tactical interface that runs on any edge companion computer (like an NVIDIA Jetson Orin) and can be accessed securely from any browser or tablet over tactical mesh WiFi."*

**Q2: How do you prevent multi-drone collisions in autonomous swarm mode?**  
> *"We implemented a 3D Optimal Reciprocal Collision Avoidance (ORCA) solver based on Velocity Obstacles. Each drone continuously monitors the 3D position and velocity vectors of neighboring nodes, predicting collisions up to 2 seconds in advance and reciprocally adjusting heading and velocity to guarantee a minimum 2.8m safety clearance (Gate G5)."*

**Q3: What failsafes exist if a drone loses connection or runs out of battery?**  
> *"Our GNC engine has active watchdog failsafes: if battery level drops below 20% or the drone breaches the 500m geofence perimeter, the flight mode state machine instantly interrupts waypoint execution and engages autonomous Return-To-Launch (RTL) followed by precision autolanding."*
