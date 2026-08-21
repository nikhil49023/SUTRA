#!/usr/bin/env python3
"""
SUTRA — Tactical Ground Control Station (GCS)
Master Launcher for Modular Python GCS Architecture
"""

import sys
import os
import webbrowser

# Add sutra_gcs directory to sys.path
script_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(script_dir, "sutra_ws", "src", "sutra_gcs")):
    gcs_dir = os.path.join(script_dir, "sutra_ws", "src", "sutra_gcs")
elif os.path.exists(os.path.join(script_dir, "SUTRA", "sutra_ws", "src", "sutra_gcs")):
    gcs_dir = os.path.join(script_dir, "SUTRA", "sutra_ws", "src", "sutra_gcs")
else:
    gcs_dir = os.path.join(script_dir, "sutra_gcs")

sys.path.insert(0, gcs_dir)
sys.path.insert(0, os.path.dirname(gcs_dir))

from main import app, settings

if __name__ == "__main__":
    url = f"http://localhost:{settings.network.http_port}"
    print("\n" + "=" * 78)
    print("🚁 SUTRA — SWARM UNIFIED TACTICAL RECONNAISSANCE ARCHITECTURE")
    print("   Subsystem D: Master Tactical Ground Control Station (Python Flask)")
    print("=" * 78)
    print(f"📡 Serving Web Dashboard at: {url}")
    print("🕹️ 4-Drone Swarm Physics Simulation: Active (20 Hz loop)")
    print("🛡️ Gate G5 ORCA 3D Safety Buffer: Active (> 2.8m clearance)")
    print("🌐 GIS Elevation & RF Line-of-Sight Analyzer: Ready")
    print("📼 Blackbox Flight Replay Recorder: Ready")
    print("🔒 4-Tier Role-Based Access Control (RBAC): Ready")
    print("=" * 78 + "\n")

    try:
        webbrowser.open(url)
    except Exception:
        pass

    app.run(host=settings.network.http_host, port=settings.network.http_port, debug=False, threaded=True)
