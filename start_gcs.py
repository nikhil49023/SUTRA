#!/usr/bin/env python3
"""
SMART HORIZON GCS — One-Click Master Launcher
Starts both the Authoritative Python WebSocket Gateway & React Frontend, then launches the browser.
"""

import os
import subprocess
import sys
import time
import webbrowser

script_dir = os.path.dirname(os.path.abspath(__file__))
gcs_dir = os.path.join(script_dir, "SUTRA", "sutra_ws", "src", "sutra_gcs")
if not os.path.exists(gcs_dir):
    gcs_dir = os.path.join(script_dir, "sutra_ws", "src", "sutra_gcs")

sys.path.insert(0, gcs_dir)
sys.path.insert(0, os.path.dirname(gcs_dir))

from server.websocket_gateway import gateway_server
from services.logging_service import setup_logging

def main():
    setup_logging("INFO")
    print("\n" + "=" * 76)
    print("🚁 SMART HORIZON GCS — TACTICAL GROUND CONTROL STATION")
    print("   Authoritative Python Backend + React Tactical Dashboard")
    print("=" * 76)
    print("📡 Starting WebSocket Gateway Server on: ws://127.0.0.1:8765 ...")
    gateway_server.start()

    frontend_dir = os.path.join(script_dir, "frontend")
    print("💻 Starting React Tactical Frontend on: http://localhost:5173 ...")
    
    # Check if vite is already running or start preview/dev
    node_proc = subprocess.Popen(
        ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"],
        cwd=frontend_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    url = "http://localhost:5173"
    print(f"🌐 Opening Tactical GCS Dashboard at: {url}")
    time.sleep(1.5)
    try:
        webbrowser.open(url)
    except Exception:
        pass

    print("=" * 76)
    print("✅ SMART HORIZON GCS is running. Press Ctrl+C to stop.")
    print("=" * 76 + "\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping SMART HORIZON GCS...")
        node_proc.terminate()
        gateway_server.stop()

if __name__ == "__main__":
    main()
