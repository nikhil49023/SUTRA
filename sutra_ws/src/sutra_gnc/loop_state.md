# 🔄 Project SUTRA — Loop Engineering State: Subsystem A/B Heartbeat & Sensor Integration

## 🎯 Goal
Equip swarm drones (`uav_alpha` through `uav_epsilon`) with Subsystem B binary mesh heartbeat telemetry, sensors (IMU, 3D LiDAR, VIO Camera), and reactive GNC flight adaptation (ORCA avoidance + sector re-routing upon peer heartbeat loss or motor failure).

---

## 📋 Task Checklist
- [x] **State Initialization**: Define architecture & verification gates.
- [x] **Subsystem B Telemetry**: Added 2Hz binary mesh heartbeat publisher (`/sutra/comms/heartbeats`) in `mesh_node.py` carrying drone ID, timestamp, battery state, position, velocity, motor status, and consensus role.
- [x] **Subsystem A GNC Adaptation**: Updated `orca_avoidance.py` to subscribe to `/sutra/comms/heartbeats` and dynamically treat unresponsive/failed drones as expanded static obstacles (2.25m safety radius).
- [x] **Verification Suite**: Created [`test_heartbeat_gnc_adaptation.py`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_gnc/test/test_heartbeat_gnc_adaptation.py).
- [x] **Sim Launch Integration**: Updated [`stress_test_suite.launch.py`](file:///home/nikhil/Desktop/Project%20SUTRA/sutra_ws/src/sutra_sim/launch/stress_test_suite.launch.py).
- [x] **Verification Gate**: Executed `pytest` — 139 / 139 unit & integration tests passed.

---

## 🔒 Verification Criteria
- `pytest sutra_ws/src/sutra_gnc/test/` -> PASSED (139 passed)
- `pytest sutra_ws/src/sutra_comms/test/` -> PASSED
- `pytest sutra_ws/src/sutra_perception/test/` -> PASSED
- Binary heartbeat latency < 5ms across 5-drone mesh swarm.
