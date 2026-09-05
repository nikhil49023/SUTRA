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

import threading

def main():
    setup_logging("INFO")
    print("\n" + "=" * 76)
    print("🚁 SMART HORIZON GCS — TACTICAL GROUND CONTROL STATION")
    print("   Authoritative Python Backend + React Tactical Dashboard")
    print("=" * 76)

    # 1. Start MBTiles Orthomosaic Tile Server (Port 8088)
    tile_server = None
    try:
        from sutra_tile_server import start_tile_server
        tile_server = start_tile_server(8088)
        tile_thread = threading.Thread(target=tile_server.serve_forever, daemon=True)
        tile_thread.start()
        print("🗺️  MBTiles Dynamic Orthomosaic Server active on: http://127.0.0.1:8088")
    except Exception as e:
        print(f"ℹ️  Tile server notice: {e}")

    # 2. Start WebSocket Gateway Server (Port 8765)
    print("📡 Starting WebSocket Gateway Server on: ws://127.0.0.1:8765 ...")
    gateway_server.start()

    # 3. Start React Tactical Frontend (Port 5173)
    frontend_dir = os.path.join(script_dir, "frontend")
    print("💻 Starting React Tactical Frontend on: http://localhost:5173 ...")
    
    node_proc = subprocess.Popen(
        ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"],
        cwd=frontend_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    url = "http://localhost:5173"
    print(f"🌐 Opening Tactical GCS Dashboard at: {url}")
    time.sleep(2.0)
    try:
        subprocess.Popen(["xdg-open", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
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
