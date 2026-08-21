#!/usr/bin/env python3
"""
SUTRA — Tactical Ground Control Station & GNC Engine (Flask Python)
Master Launcher Script for Hackathon Judges Demonstration
"""

import sys
import os
import webbrowser

# Add flask_gcs directory to sys.path
script_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(script_dir, "sutra_ws")):
    gcs_dir = os.path.join(script_dir, "sutra_ws", "src", "sutra_gnc", "flask_gcs")
else:
    gcs_dir = os.path.join(script_dir, "SUTRA", "sutra_ws", "src", "sutra_gnc", "flask_gcs")

sys.path.insert(0, gcs_dir)

from app import app

if __name__ == "__main__":
    url = "http://localhost:5000"
    print("\n" + "=" * 78)
    print("🚁 SUTRA — SWARM UNIFIED TACTICAL RECONNAISSANCE ARCHITECTURE")
    print("   Subsystems A, B, C, D, E Integrated Master Ground Station (Flask Python)")
    print("=" * 78)
    print(f"📡 Serving Web Dashboard at: {url}")
    print("🕹️ 4-Drone Swarm Physics Simulation: Active (20 Hz loop)")
    print("🛡️ Gate G5 ORCA 3D Safety Buffer: Active (> 2.8m clearance)")
    print("🌐 GIS Elevation & RF Line-of-Sight Analyzer: Ready")
    print("📼 Blackbox Flight Replay Recorder: Ready")
    print("🔒 4-Tier Role-Based Access Control (RBAC): Ready")
    print("⚙️ Offboard PX4 Guidance & WGS84 Geodetic Transforms: Active")
    print("=" * 78 + "\n")

    try:
        webbrowser.open(url)
    except Exception:
        pass

    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
