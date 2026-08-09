# 📋 Field Deployment Standard Operating Procedure (SOP) (Subsystem F Module F2)

## 📌 1. Objective
Provides the mandatory operational checklist for deploying Project SUTRA multi-drone swarm in field conditions safely and efficiently.

---

## 🛠️ 2. Step-by-Step Field Checklist

### Stage A: Staging & Hardware Inspection
1. **Vehicle Framing:** Check all arms, motor mounts, and carbon fiber plates for micro-fractures.
2. **Propeller Check:** Verify quick-release propellers are locked tightly.
3. **Avionics & Power:** Confirm 4S/6S LiPo battery health ($\ge 98\%$ state of charge) and plug in companion computer power bus.
4. **Sensor Inspection:** Clean optical flow camera lens and depth sensor front glass.

### Stage B: Comms & Mesh Network Initialization
1. Power up GCS Ground Station laptop and connect high-gain 802.11s Wi-Fi mesh antenna.
2. Verify node discovery on all 5 UAV companion computers (`mesh_node.py`).
3. Confirm SwarmRAFT distributed consensus engine active state.

### Stage C: Pre-Flight Safety Clearance & Launch
1. Ensure 10-meter radius clear zone around launch pads.
2. Perform automated sensor calibration check (VIO covariance $< 0.05$).
3. Execute 1-click takeoff command from GCS dashboard (`sutra_gcs`).
4. Monitor initial hover stability at $3.0\text{m}$ AGL before dispatching search waypoints.
