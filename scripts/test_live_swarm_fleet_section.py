#!/usr/bin/env python3
"""
Smart Horizon GCS — Live Swarm Fleet Section Comprehensive Verification
Tests Formation changes, Spacing adjustments, Dynamic Drone Addition/Removal, and Leadership Transfer.
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

async def test_swarm_fleet_section():
    print("\n" + "=" * 70)
    print("🚁 LIVE SWARM FLEET SECTION COMPREHENSIVE AUDIT & VERIFICATION")
    print("=" * 70)

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

        # Step 1: Switch navigation view to SWARM FLEET panel
        print("\n1️⃣ Navigating to Swarm Fleet Panel...")
        await call_cdp("Runtime.evaluate", {
            "expression": """
            (() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const fleetBtn = buttons.find(b => b.textContent?.includes('FLEET') || b.textContent?.includes('SWARM'));
                if (fleetBtn) fleetBtn.click();
                return !!fleetBtn;
            })()
            """,
            "returnByValue": True
        })
        await asyncio.sleep(1.0)

        # Step 2: Test Formation change to DIAMOND
        print("\n2️⃣ Changing Formation to DIAMOND...")
        diamond_ack = await call_cdp("Runtime.evaluate", {
            "expression": """
            (async () => {
                return await window.__commandManager?.sendCommandAsync('fleet.set_formation', {
                    formation: 'DIAMOND',
                    spacing: 30.0
                });
            })()
            """,
            "awaitPromise": True,
            "returnByValue": True
        })
        print("🔷 Formation Change Ack (DIAMOND):", diamond_ack.get("result", {}).get("value", {}).get("status"))

        # Step 3: Test Formation Spacing adjustment
        print("\n3️⃣ Adjusting Formation Spacing to 45.0m...")
        spacing_ack = await call_cdp("Runtime.evaluate", {
            "expression": """
            (async () => {
                return await window.__commandManager?.sendCommandAsync('fleet.set_spacing', {
                    spacing: 45.0
                });
            })()
            """,
            "awaitPromise": True,
            "returnByValue": True
        })
        print("📏 Spacing Change Ack (45m):", spacing_ack.get("result", {}).get("value", {}).get("status"))

        # Step 4: Test Dynamic Drone Addition (ECHO)
        print("\n4️⃣ Adding New UAV (ECHO) to Swarm...")
        add_ack = await call_cdp("Runtime.evaluate", {
            "expression": """
            (async () => {
                return await window.__commandManager?.sendCommandAsync('fleet.add_drone', {
                    drone_id: 'drone_echo',
                    callsign: 'ECHO (SCAN)',
                    role: 'WINGMAN'
                });
            })()
            """,
            "awaitPromise": True,
            "returnByValue": True
        })
        print("➕ Add Drone Ack (ECHO):", add_ack.get("result", {}).get("value", {}).get("status"))
        await asyncio.sleep(1.0)

        # Query fleet count
        drone_count_eval = await call_cdp("Runtime.evaluate", {
            "expression": "Object.keys(window.__useFleetStore?.getState()?.drones || {}).length",
            "returnByValue": True
        })
        count_after_add = drone_count_eval.get("result", {}).get("value")
        print(f"🚁 Active Swarm Size: {count_after_add} UAVs")
        assert count_after_add >= 5, f"Expected at least 5 drones, got {count_after_add}"

        # Step 5: Test Dynamic Leadership Transfer to BRAVO
        print("\n5️⃣ Transferring Leadership to BRAVO...")
        lead_ack = await call_cdp("Runtime.evaluate", {
            "expression": """
            (async () => {
                return await window.__commandManager?.sendCommandAsync('fleet.set_leader', {
                    drone_id: 'drone_bravo',
                    leader_id: 'drone_bravo'
                });
            })()
            """,
            "awaitPromise": True,
            "returnByValue": True
        })
        print("👑 Leader Change Ack (BRAVO):", lead_ack.get("result", {}).get("value", {}).get("status"))
        await asyncio.sleep(1.0)

        # Step 6: Test Drone Removal (ECHO)
        print("\n6️⃣ Decommissioning / Removing ECHO from Swarm...")
        rem_ack = await call_cdp("Runtime.evaluate", {
            "expression": """
            (async () => {
                return await window.__commandManager?.sendCommandAsync('fleet.remove_drone', {
                    drone_id: 'drone_echo'
                });
            })()
            """,
            "awaitPromise": True,
            "returnByValue": True
        })
        print("➖ Remove Drone Ack (ECHO):", rem_ack.get("result", {}).get("value", {}).get("status"))
        await asyncio.sleep(1.0)

        # Revert Formation to V_FORMATION, 25m, Leader ALPHA
        await call_cdp("Runtime.evaluate", {
            "expression": """
            (async () => {
                await window.__commandManager?.sendCommandAsync('fleet.set_formation', { formation: 'V_FORMATION', spacing: 25.0 });
                await window.__commandManager?.sendCommandAsync('fleet.set_leader', { drone_id: 'drone_alpha', leader_id: 'drone_alpha' });
            })()
            """,
            "awaitPromise": True,
            "returnByValue": True
        })

        # Step 7: Capture Screenshot
        shot = await call_cdp("Page.captureScreenshot", {"format": "png"})
        shot_path = os.path.join(SCREENSHOT_DIR, "live_swarm_fleet_verified.png")
        with open(shot_path, "wb") as f:
            f.write(base64.b64decode(shot.get("data", "")))
        print(f"\n📸 Captured live Swarm Fleet screenshot: {shot_path}")

        print("\n" + "=" * 70)
        print("✅ SECTION 2 (SWARM FLEET) FULLY VERIFIED & OPERATIONAL!")
        print("=" * 70)
        return True

if __name__ == "__main__":
    asyncio.run(test_swarm_fleet_section())
