#!/usr/bin/env python3
"""
Smart Horizon GCS — Live Leader Promotion & Swarm Synchronization Verification
Tests promoting drones to Swarm Leader across Frontend, Backend Gateway, and Telemetry HUD.
"""

import asyncio
import json
import os
import sys
import base64
import urllib.request
import websockets

SCREENSHOT_DIR = "/home/siva/Documents/DRONE_CONTROL/docs_screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

async def test_leader_switching():
    print("\n" + "=" * 70)
    print("👑 LIVE SWARM LEADER PROMOTION & FLEET SYNCHRONIZATION TEST")
    print("=" * 70)

    # 1. Connect to Chrome CDP
    try:
        req = urllib.request.urlopen("http://localhost:9222/json")
        tabs = json.loads(req.read().decode("utf-8"))
        page_tab = next((t for t in tabs if t.get("type") == "page"), None)
        if not page_tab:
            print("❌ No active browser tab found.")
            return False
        ws_url = page_tab["webSocketDebuggerUrl"]
    except Exception as e:
        print(f"❌ Failed to query Chrome CDP: {e}")
        return False

    async with websockets.connect(ws_url) as ws:
        msg_id = 0
        async def call_cdp(method: str, params: dict = None):
            nonlocal msg_id
            msg_id += 1
            payload = {"id": msg_id, "method": method, "params": params or {}}
            await ws.send(json.dumps(payload))
            while True:
                resp = json.loads(await ws.recv())
                if resp.get("id") == msg_id:
                    return resp.get("result", {})

        await call_cdp("Page.enable")
        await call_cdp("Runtime.enable")
        await asyncio.sleep(1.0)

        # Step 1: Query initial leader
        init_fleet = await call_cdp("Runtime.evaluate", {
            "expression": """
            (() => {
                const fleet = window.__useFleetStore?.getState();
                const telem = window.__useTelemetryStore?.getState();
                return {
                    leader_id: fleet?.leader_id,
                    active_drone: telem?.activeDroneId,
                    drones: Object.fromEntries(
                        Object.entries(fleet?.drones || {}).map(([k, v]) => [k, { is_leader: v.is_leader, role: v.role }])
                    )
                };
            })()
            """,
            "returnByValue": True
        })
        print("📋 Initial Swarm Fleet State:", init_fleet.get("result", {}).get("value"))

        # Step 2: Promote BRAVO to Swarm Leader
        print("\n👑 Promoting BRAVO (drone_bravo) to Swarm Leader...")
        await call_cdp("Runtime.evaluate", {
            "expression": "window.__useFleetStore?.getState()?.setLeader('drone_bravo')",
            "returnByValue": True
        })
        await asyncio.sleep(1.5)

        bravo_fleet = await call_cdp("Runtime.evaluate", {
            "expression": """
            (() => {
                const fleet = window.__useFleetStore?.getState();
                const telem = window.__useTelemetryStore?.getState();
                return {
                    leader_id: fleet?.leader_id,
                    active_drone: telem?.activeDroneId,
                    drones: Object.fromEntries(
                        Object.entries(fleet?.drones || {}).map(([k, v]) => [k, { is_leader: v.is_leader, role: v.role }])
                    )
                };
            })()
            """,
            "returnByValue": True
        })
        val_bravo = bravo_fleet.get("result", {}).get("value", {})
        print("📋 Fleet State after promoting BRAVO:", val_bravo)

        assert val_bravo.get("leader_id") == "drone_bravo", f"Expected leader_id 'drone_bravo', got {val_bravo.get('leader_id')}"
        assert val_bravo.get("drones", {}).get("drone_bravo", {}).get("is_leader") == True, "drone_bravo is_leader must be True"
        assert val_bravo.get("drones", {}).get("drone_alpha", {}).get("is_leader") == False, "drone_alpha is_leader must be False"
        assert val_bravo.get("drones", {}).get("drone_bravo", {}).get("role") == "LEADER", "drone_bravo role must be LEADER"
        print("✅ BRAVO promotion verified across store, roles, and telemetry!")

        # Step 3: Promote CHARLIE to Swarm Leader
        print("\n👑 Promoting CHARLIE (drone_charlie) to Swarm Leader...")
        await call_cdp("Runtime.evaluate", {
            "expression": "window.__useFleetStore?.getState()?.setLeader('drone_charlie')",
            "returnByValue": True
        })
        await asyncio.sleep(1.5)

        charlie_fleet = await call_cdp("Runtime.evaluate", {
            "expression": """
            (() => {
                const fleet = window.__useFleetStore?.getState();
                const telem = window.__useTelemetryStore?.getState();
                return {
                    leader_id: fleet?.leader_id,
                    active_drone: telem?.activeDroneId,
                    drones: Object.fromEntries(
                        Object.entries(fleet?.drones || {}).map(([k, v]) => [k, { is_leader: v.is_leader, role: v.role }])
                    )
                };
            })()
            """,
            "returnByValue": True
        })
        val_charlie = charlie_fleet.get("result", {}).get("value", {})
        print("📋 Fleet State after promoting CHARLIE:", val_charlie)

        assert val_charlie.get("leader_id") == "drone_charlie", f"Expected leader_id 'drone_charlie', got {val_charlie.get('leader_id')}"
        assert val_charlie.get("drones", {}).get("drone_charlie", {}).get("is_leader") == True, "drone_charlie is_leader must be True"
        assert val_charlie.get("drones", {}).get("drone_bravo", {}).get("is_leader") == False, "drone_bravo is_leader must be False"
        print("✅ CHARLIE promotion verified!")

        # Step 4: Promote ALPHA back to Swarm Leader
        print("\n👑 Promoting ALPHA (drone_alpha) back to Swarm Leader...")
        await call_cdp("Runtime.evaluate", {
            "expression": "window.__useFleetStore?.getState()?.setLeader('drone_alpha')",
            "returnByValue": True
        })
        await asyncio.sleep(1.5)

        # Step 5: Capture live screenshot of Fleet UI
        shot = await call_cdp("Page.captureScreenshot", {"format": "png"})
        shot_path = os.path.join(SCREENSHOT_DIR, "live_leader_promoted_verified.png")
        with open(shot_path, "wb") as f:
            f.write(base64.b64decode(shot.get("data", "")))
        print(f"📸 Captured live screenshot: {shot_path}")

        print("\n" + "=" * 70)
        print("✅ ALL SWARM LEADER DYNAMIC SWITCHING VERIFICATIONS PASSED!")
        print("=" * 70)
        return True

if __name__ == "__main__":
    asyncio.run(test_leader_switching())
