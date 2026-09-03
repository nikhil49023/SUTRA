#!/usr/bin/env python3
"""
Live Chrome CDP Audit — Predictive Disaster Risk & Pre-Positioning UI Panel
"""

import asyncio
import base64
import json
import os
import subprocess
import time
import urllib.request
import websockets

SCREENSHOTS_DIR = "/home/siva/Documents/DRONE_CONTROL/docs_screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

class CDPClient:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self.id_counter = 0

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=20*1024*1024)

    async def close(self):
        if self.ws:
            await self.ws.close()

    async def send(self, method, params=None):
        self.id_counter += 1
        msg_id = self.id_counter
        payload = {"id": msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(payload))
        while True:
            raw = await self.ws.recv()
            data = json.loads(raw)
            if data.get("id") == msg_id:
                if "error" in data:
                    raise Exception(f"CDP Error in {method}: {data['error']}")
                return data.get("result", {})

    async def eval_js(self, expr):
        res = await self.send("Runtime.evaluate", {
            "expression": expr,
            "awaitPromise": True,
            "returnByValue": True
        })
        return res.get("result", {}).get("value")

    async def capture_screenshot(self, filename):
        params = {"format": "png", "quality": 100}
        res = await self.send("Page.captureScreenshot", params)
        data = base64.b64decode(res["data"])
        out_path = os.path.join(SCREENSHOTS_DIR, filename)
        with open(out_path, "wb") as f:
            f.write(data)
        print(f"📸 Captured real screenshot: {filename} ({len(data)/1024:.1f} KB)")
        return out_path


async def main():
    print("=" * 80)
    print("🛰️ SMART HORIZON GCS — LIVE DISASTER RISK PANEL CDP AUDIT")
    print("=" * 80)

    # 1. Start HTTP Server for frontend/dist
    http_proc = subprocess.Popen(
        ["python3", "-m", "http.server", "5173", "--directory", "/home/siva/Documents/DRONE_CONTROL/frontend/dist"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # 2. Start WebSocket Gateway
    gcs_proc = subprocess.Popen(
        ["python3", "-c", """
import sys, time
sys.path.insert(0, '/home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs')
from server.websocket_gateway import gateway_server
gateway_server.start()
while True:
    time.sleep(1)
"""],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # 3. Start Headless Chrome
    chrome_proc = subprocess.Popen(
        [
            "google-chrome-stable",
            "--headless=new",
            "--remote-debugging-port=9222",
            "--window-size=1920,1080",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "http://localhost:5173"
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    time.sleep(3.0)

    try:
        req = urllib.request.urlopen("http://localhost:9222/json")
        tabs = json.loads(req.read().decode("utf-8"))
        page_tab = next(t for t in tabs if t.get("type") == "page")
        ws_url = page_tab["webSocketDebuggerUrl"]

        client = CDPClient(ws_url)
        await client.connect()

        await client.send("Page.enable")
        await client.send("Runtime.enable")
        await asyncio.sleep(2.0)

        # 4. Navigate to DISASTER INTEL Section
        print("🔘 Clicking 'DISASTER INTEL' Navigation Button...")
        nav_success = await client.eval_js("""
(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const intelBtn = btns.find(b => b.textContent.includes('DISASTER INTEL'));
    if (intelBtn) {
        intelBtn.click();
        return true;
    }
    return false;
})()
""")
        print(f"  • Nav Button Clicked: {nav_success}")
        await asyncio.sleep(1.5)

        # 5. Check Disaster Intel Panel DOM rendering
        header_text = await client.eval_js("""
(() => {
    const el = document.querySelector('h2');
    return el ? el.textContent : '';
})()
""")
        print(f"  • Active Header: '{header_text}'")
        assert "PREDICTIVE DISASTER" in header_text, f"Expected PREDICTIVE DISASTER header, got '{header_text}'"

        # 6. Click +2H Horizon Stepper
        print("🔘 Stepping to +2H Temporal Risk Horizon...")
        step_res = await client.eval_js("""
(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn2h = btns.find(b => b.textContent.includes('+2H'));
    if (btn2h) {
        btn2h.click();
        return true;
    }
    return false;
})()
""")
        print(f"  • +2H Step Clicked: {step_res}")
        await asyncio.sleep(1.0)

        # 7. Capture Full Screen Screenshot
        await client.capture_screenshot("live_disaster_risk_verified.png")
        print("\n✅ LIVE DISASTER RISK INTELLIGENCE PANEL AUDIT: PASSED")

        await client.close()

    finally:
        chrome_proc.terminate()
        gcs_proc.terminate()
        http_proc.terminate()


if __name__ == "__main__":
    asyncio.run(main())
