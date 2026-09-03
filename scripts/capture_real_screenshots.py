#!/usr/bin/env python3
"""
Captures real, pixel-perfect, high-DPI screenshots of the actual running
SUTRA / Smart Horizon GCS React Web Application.
"""

import os
import sys
import time
import json
import base64
import asyncio
import subprocess
import urllib.request
import websockets

SCREENSHOTS_DIR = "/home/siva/Documents/DRONE_CONTROL/docs_screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

class CDPScreenshotter:
    def __init__(self, port=9222):
        self.port = port
        self.ws_url = None
        self.ws = None
        self.msg_id = 0

    async def connect(self):
        # Find page target
        for _ in range(10):
            try:
                with urllib.request.urlopen(f"http://localhost:{self.port}/json") as resp:
                    targets = json.loads(resp.read().decode())
                    for t in targets:
                        if t.get("type") == "page" and "localhost:5173" in t.get("url", ""):
                            self.ws_url = t.get("webSocketDebuggerUrl")
                            break
                    if not self.ws_url and targets:
                        for t in targets:
                            if t.get("type") == "page":
                                self.ws_url = t.get("webSocketDebuggerUrl")
                                break
                    if self.ws_url:
                        break
            except Exception:
                pass
            await asyncio.sleep(0.5)

        if not self.ws_url:
            raise RuntimeError("Could not find Chrome page target")

        print(f"Connecting to CDP WebSocket: {self.ws_url}")
        self.ws = await websockets.connect(self.ws_url, max_size=50*1024*1024)

    async def send(self, method, params=None):
        self.msg_id += 1
        msg = {"id": self.msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(msg))
        while True:
            res_raw = await self.ws.recv()
            res = json.loads(res_raw)
            if res.get("id") == self.msg_id:
                return res.get("result", {})

    async def evaluate(self, js_code):
        return await self.send("Runtime.evaluate", {
            "expression": js_code,
            "awaitPromise": True,
            "returnByValue": True
        })

    async def capture_screenshot(self, filename, clip=None):
        params = {"format": "png", "quality": 100}
        if clip:
            params["clip"] = clip
        res = await self.send("Page.captureScreenshot", params)
        data = base64.b64decode(res["data"])
        out_path = os.path.join(SCREENSHOTS_DIR, filename)
        with open(out_path, "wb") as f:
            f.write(data)
        print(f"📸 Captured real screenshot: {filename} ({len(data)/1024:.1f} KB)")
        return out_path

async def run():
    print("=" * 70)
    print("🚁 SUTRA GCS — REAL APP SCREENSHOT CAPTURE PIPELINE")
    print("=" * 70)

    # 1. Start HTTP Server for frontend/dist
    print("🌐 Starting Frontend HTTP Server on http://localhost:5173 ...")
    http_proc = subprocess.Popen(
        ["python3", "-m", "http.server", "5173", "--directory", "/home/siva/Documents/DRONE_CONTROL/frontend/dist"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # 2. Start WebSocket Gateway in Background
    print("📡 Starting Python WebSocket Gateway Server ...")
    gcs_proc = subprocess.Popen(
        ["python3", "-c", """
import sys, os, time
sys.path.insert(0, '/home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs')
from server.websocket_gateway import gateway_server
gateway_server.start()
while True:
    time.sleep(1)
"""],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    time.sleep(1.5)

    # 3. Start Chrome Headless with Remote Debugging
    print("🖥️ Starting Chrome Headless on debugging port 9222 ...")
    chrome_proc = subprocess.Popen([
        "google-chrome",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--remote-debugging-port=9222",
        "--window-size=1920,1080",
        "--force-device-scale-factor=1.5",
        "http://localhost:5173"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.0)

    try:
        cdp = CDPScreenshotter(9222)
        await cdp.connect()

        # Let the app initialize, connect websocket, and render Leaflet / MapLibre map
        print("⏳ Waiting for tactical map and HUD to render...")
        await asyncio.sleep(3.0)

        # 1. Main Dashboard Screenshot (Map, PFD, TopBar, Bottom Console)
        await cdp.evaluate("""
            window.__store = window.__store || {};
            // Close any open overlays
            const appStore = window.useAppStore ? window.useAppStore.getState() : null;
        """)
        await asyncio.sleep(1.0)
        await cdp.capture_screenshot("01_main_dashboard.png")

        # 2. TopBar & Header Telemetry (Cropped banner)
        await cdp.capture_screenshot("02_topbar_telemetry.png", {
            "x": 0, "y": 0, "width": 1920, "height": 90, "scale": 1
        })

        # 3. Primary Flight Display (PFD HUD) Focus
        await cdp.capture_screenshot("03_pfd_hud_display.png", {
            "x": 10, "y": 60, "width": 380, "height": 380, "scale": 1
        })

        # 4. Tactical Mission Planner Overlay (Press M)
        print("🗺️ Capturing Mission Planner...")
        await cdp.evaluate("""
            // Dispatch keydown event for 'M'
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
        """)
        await asyncio.sleep(1.0)
        await cdp.capture_screenshot("04_mission_planner.png")

        # 5. Swarm Fleet Control & Formation Matrix Overlay (Press F)
        print("🦅 Capturing Fleet Formations...")
        await cdp.evaluate("""
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        """)
        await asyncio.sleep(1.0)
        await cdp.capture_screenshot("05_fleet_formations.png")

        # 6. Geofence Operations Center — Zone Manager (Press G)
        print("🛡️ Capturing Geofence Operations Center (Tab 1: Zone Manager)...")
        await cdp.evaluate("""
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }));
        """)
        await asyncio.sleep(1.0)
        await cdp.capture_screenshot("06_geofence_manager.png")

        # 7. Geofence Operations Center — Tab 2: Radar & Breaches
        print("📡 Capturing Geofence Airspace Radar (Tab 2)...")
        await cdp.evaluate("""
            const btns = Array.from(document.querySelectorAll('button'));
            const radarBtn = btns.find(b => b.textContent.includes('AIRSPACE RADAR'));
            if (radarBtn) radarBtn.click();
        """)
        await asyncio.sleep(0.8)
        await cdp.capture_screenshot("07_geofence_radar.png")

        # 8. Geofence Operations Center — Tab 3: Presets
        print("✨ Capturing Geofence Tactical Presets (Tab 3)...")
        await cdp.evaluate("""
            const btns = Array.from(document.querySelectorAll('button'));
            const presetBtn = btns.find(b => b.textContent.includes('TACTICAL PRESETS'));
            if (presetBtn) presetBtn.click();
        """)
        await asyncio.sleep(0.8)
        await cdp.capture_screenshot("08_geofence_presets.png")

        # 9. Geofence Operations Center — Tab 4: Spatial Exchange
        print("💾 Capturing Geofence Spatial Exchange (Tab 4)...")
        await cdp.evaluate("""
            const btns = Array.from(document.querySelectorAll('button'));
            const exchBtn = btns.find(b => b.textContent.includes('SPATIAL EXCHANGE'));
            if (exchBtn) exchBtn.click();
        """)
        await asyncio.sleep(0.8)
        await cdp.capture_screenshot("09_geofence_exchange.png")

        # 10. AI Perception Subsystem & Threat Panel (Press A)
        print("👁️ Capturing AI Perception Subsystem...")
        await cdp.evaluate("""
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
        """)
        await asyncio.sleep(1.0)
        await cdp.capture_screenshot("10_ai_perception.png")

        # 11. GIS Terrain & RF Propagation Intelligence (Press I)
        print("🏔️ Capturing GIS Terrain & RF Propagation...")
        await cdp.evaluate("""
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true }));
        """)
        await asyncio.sleep(1.0)
        await cdp.capture_screenshot("11_gis_terrain.png")

        # 12. System Settings & Configuration (Press S)
        print("⚙️ Capturing System Settings...")
        await cdp.evaluate("""
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
        """)
        await asyncio.sleep(1.0)
        await cdp.capture_screenshot("12_system_settings.png")

        # 13. Contextual Right Inspector (Close overlay with Esc, inspect Drone)
        print("🔍 Capturing Contextual Right Inspector Panel...")
        await cdp.evaluate("""
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        """)
        await asyncio.sleep(0.8)
        await cdp.capture_screenshot("13_right_inspector.png", {
            "x": 1400, "y": 50, "width": 520, "height": 900, "scale": 1
        })

        # 14. Emergency RTL Modal
        print("🚨 Capturing Emergency RTL Modal...")
        await cdp.evaluate("""
            const btns = Array.from(document.querySelectorAll('button'));
            const emBtn = btns.find(b => b.textContent.includes('EMERGENCY RTL'));
            if (emBtn) emBtn.click();
        """)
        await asyncio.sleep(0.8)
        await cdp.capture_screenshot("14_emergency_modal.png")

        print("\n" + "=" * 70)
        print(f"🎉 SUCCESSFULLY CAPTURED ALL REAL UI SCREENSHOTS IN: {SCREENSHOTS_DIR}")
        print("=" * 70)

    finally:
        chrome_proc.terminate()
        gcs_proc.terminate()
        http_proc.terminate()

if __name__ == "__main__":
    asyncio.run(run())
