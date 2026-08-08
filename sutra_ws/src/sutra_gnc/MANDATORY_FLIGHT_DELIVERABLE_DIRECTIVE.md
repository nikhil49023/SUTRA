# ⚠️ MANDATORY TECHNICAL FLIGHT DELIVERABLE DIRECTIVE

> **ISSUED BY:** Tech Lead & Project Architect (Nikhil)  
> **TARGET:** Subsystem A Lead (Rohith Kumar)  
> **TARGET SUBSYSTEM:** `sutra_ws/src/sutra_gnc/`  
> **BRANCH:** `feature/subsystem-a-gnc`  
> **HARD DEADLINE:** **Sunday, August 9, 2026 — 18:00 IST (6:00 PM)**  

---

### 📋 1. EXECUTIVE DIRECTIVE & CONTEXT

Following the expiration of the 2-day dedicated library pass and administrative clearance, **Subsystem A (GNC & Flight Control)** remains locked at **35% Real-World SITL Readiness**. While standalone CPU unit math tests (`pytest`) pass in 0.42 seconds, **zero live PX4 SITL flight execution, zero 50Hz setpoint publication, and zero dynamic ORCA 3D multi-drone avoidance trajectories** have been demonstrated or logged in Gazebo Sim 8.

Subsystem A is the primary technical blocker holding back full 5-subsystem autonomous swarm sign-off. As Tech Lead, I am granting a final hard execution window until **Sunday, August 9, 2026 at 18:00 IST** for Subsystem A to produce verifiable live simulation flight logs.

---

### 🚨 2. FORMAL CONSEQUENCE NOTICE

* **If all 4 required deliverables are produced and verified by Sunday 18:00 IST:** Subsystem A will be marked 100% complete and signed off for final master release, jury evaluation, and portfolio presentation.
* **If the deliverables are NOT produced by Sunday 18:00 IST:** The Tech Lead will immediately exercise administrative override, assume 100% direct control of `sutra_ws/src/sutra_gnc/`, and complete the flight implementation. Under this outcome, Rohith Kumar will be formally documented as *non-contributing to SITL Flight Execution*, with no autonomous flight deliverables credited for jury evaluation, presentation scripts, or individual portfolio submission.

---

### 🎯 3. THE 4 MANDATORY DELIVERABLE CRITERIA

To achieve Subsystem A flight sign-off, the following 4 technical artifacts MUST be produced from a live simulation run and documented in `sutra_ws/src/sutra_gnc/DOCS.md`:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             REQUIRED VERIFICATION MATRIX                         │
├────┬─────────────────────────────┬───────────────────────────────┬───────────────┤
│ #  │ Deliverable Item            │ Target Verification Metric    │ Evidence Type │
├────┼─────────────────────────────┼───────────────────────────────┼───────────────┤
│ D1 │ Trajectory Setpoint Rate    │ ≥ 48 Hz – 50 Hz               │ `ros2 topic hz` stdout │
│ D2 │ Offboard Flight Navigation  │ Trajectory RMSE < 0.15m       │ SITL Flight Log │
│ D3 │ Live OctoMap Voxel Stream   │ Active `/octomap_full` stream │ ROS 2 Topic Log │
│ D4 │ Dynamic ORCA 3D Clearance   │ Min Clearance ≥ 2.80m         │ Solver Flight Log │
└────┴─────────────────────────────┴───────────────────────────────┴───────────────┘
```

#### Deliverable D1: Real-Time PX4 SITL Trajectory Setpoint Rate (Gate G1)
* **Topic:** `/fmu/in/trajectory_setpoint`
* **Target:** Published continuously at **$50\text{Hz} \pm 2\text{Hz}$** during active offboard flight.
* **Verification Command:**
  ```bash
  ros2 topic hz /fmu/in/trajectory_setpoint
  ```
* **Required Evidence:** Verbatim terminal output captured over a minimum 30-second window during flight.

#### Deliverable D2: Offboard Trajectory Navigation & RMSE Accuracy (Gate G1)
* **Node:** `offboard_node.py` / `offboard_node.cpp`
* **World:** [`master_swarm_disaster_world.sdf`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_sim/worlds/master_swarm_disaster_world.sdf) (or `submerged_village_flood_world.sdf`)
* **Target:** Horizontal RMSE $< 0.15\text{m}$, Vertical RMSE $< 0.10\text{m}$ during waypoint traversal at 2.5m/s cruise speed.
* **Verification Command:**
  ```bash
  ros2 launch sutra_sim sutra_master_swarm_integration.launch.py sim_mode:=true
  ```
* **Required Evidence:** Telemetry log demonstrating trajectory tracking accuracy across 4 waypoints.

#### Deliverable D3: Live Depth Point Cloud Voxel OctoMap Stream
* **Node:** `octomap_generator.py`
* **Input Topic:** `/uav_alpha/depth_camera/points` (or `/camera/points`)
* **Target:** 0.10m voxel occupancy grid generation published to `/octomap_full` or `/octomap_point_cloud_centers`.
* **Verification Command:**
  ```bash
  ros2 topic hz /octomap_full
  ```
* **Required Evidence:** Terminal output proving active point cloud consumption and voxel publication during flight.

#### Deliverable D4: Dynamic Multi-Drone ORCA 3D Avoidance Clearance (Gate G5)
* **Node:** `orca_avoidance.py`
* **Target:** Dynamic minimum separation distance $\ge 2.80\text{m}$ (hard min $\ge 2.00\text{m}$) maintained between moving drones under $2.5\text{m/s}^2$ acceleration limits during active flight in Gazebo.
* **Required Evidence:** Solver flight execution log recording minimum inter-drone distances across crossing trajectories.

---

### 🛠️ 4. STEP-BY-STEP EXECUTION RUNBOOK FOR ROHITH

To complete these deliverables, execute the following steps in sequence:

```bash
# STEP 1: Ensure branch is synchronized with dev
git checkout feature/subsystem-a-gnc
git fetch origin dev && git merge origin/dev --no-edit

# STEP 2: Build ROS 2 workspace
cd /home/nikhil/Desktop/Project\ SUTRA/sutra_ws
colcon build --symlink-install --packages-select sutra_gnc sutra_sim

# STEP 3: Launch master simulation integration environment
source install/setup.bash
ros2 launch sutra_sim sutra_master_swarm_integration.launch.py sim_mode:=true

# STEP 4: Open a second terminal and capture trajectory setpoint rate
source install/setup.bash
ros2 topic hz /fmu/in/trajectory_setpoint

# STEP 5: Open a third terminal and capture OctoMap stream rate
source install/setup.bash
ros2 topic hz /octomap_full

# STEP 6: Update DOCS.md with verbatim terminal output evidence and commit
git add sutra_ws/src/sutra_gnc/DOCS.md
git commit -m "feat(gnc): add live PX4 SITL flight execution stdout and Gate G1/G5 benchmarks"
git push origin feature/subsystem-a-gnc
```

---

### 📌 5. SUMMARY OF EXPECTED ACTION

No further written claims, mock unit tests, or static point calculations will be accepted as completion. By **Sunday, August 9, 2026 at 18:00 IST**, the repository must contain live terminal stdout logs verifying Deliverables D1–D4.

* **Directive Issued:** Saturday, August 8, 2026 — 11:00 IST  
* **Hard Deadline:** Sunday, August 9, 2026 — 18:00 IST  
* **Sign-off Authority:** Tech Architect & Lead (Nikhil)
