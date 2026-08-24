#!/usr/bin/env python3
"""
SMART HORIZON GCS — Master Launcher for Authoritative Python WebSocket Gateway
"""

import os
import sys
import time

script_dir = os.path.dirname(os.path.abspath(__file__))
gcs_dir = os.path.join(script_dir, "SUTRA", "sutra_ws", "src", "sutra_gcs")
if not os.path.exists(gcs_dir):
    gcs_dir = os.path.join(script_dir, "sutra_ws", "src", "sutra_gcs")

sys.path.insert(0, gcs_dir)
sys.path.insert(0, os.path.dirname(gcs_dir))

from server.websocket_gateway import gateway_server
from services.logging_service import setup_logging

if __name__ == "__main__":
    setup_logging("INFO")
    print("\n" + "=" * 70)
    print("🚁 SMART HORIZON GCS — AUTHORITATIVE PYTHON BACKEND")
    print("   Subsystem: WebSocket Gateway, Swarm Kinematics & EventBus")
    print("=" * 70)
    print("📡 WebSocket Gateway active on: ws://0.0.0.0:8765")
    print("🕹️ 4-Drone Swarm Physics Simulation: Active (10 Hz loop)")
    print("🛡️ ORCA 3D Collision Safety Buffer: Active")
    print("🌐 GIS Elevation & RF Line-of-Sight Analyzer: Ready")
    print("🧠 AI Decision Support & Mission Advisor: Active")
    print("=" * 70 + "\n")

    gateway_server.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping Smart Horizon GCS server...")
        gateway_server.stop()
