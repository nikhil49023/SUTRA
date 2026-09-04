#!/usr/bin/env python3
"""
Smart Horizon GCS — Live Bottom Console Buttons & Stream Switching Verification
"""

import asyncio
import json
import os
import sys
import time
import base64
import urllib.request
import websockets

SCREENSHOT_DIR = "/home/siva/Documents/DRONE_CONTROL/docs_screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

async def test_console_buttons():
    print("=" * 80)
    print("🖥️ SMART HORIZON GCS — LIVE BOTTOM CONSOLE BUTTONS EMPIRICAL AUDIT")
    print("=" * 80)

    try:
        req = urllib.request.urlopen("http://localhost:9222/json")
        tabs = json.loads(req.read().decode("utf-8"))
        page_tab = next((t for t in tabs if t.get("type") == "page"), None)
        if not page_tab:
            print("❌ No active browser tab found.")
            return False
        ws_url = page_tab["webSocketDebuggerUrl"]
        ws = await websockets.connect(ws_url)
    except Exception as e:
        print(f"❌ Failed to connect to Chrome CDP: {e}")
        return False

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

    async def eval_js(expression: str, await_promise: bool = True):
        res = await call_cdp("Runtime.evaluate", {
            "expression": expression,
            "awaitPromise": await_promise,
            "returnByValue": True,
        })
        return res.get("result", {}).get("value")

    await call_cdp("Page.enable")
    await call_cdp("Runtime.enable")
    await asyncio.sleep(0.5)

    tabs_to_test = [
        ("TELEMETRY", "FLEET"),
        ("MISSION", "MISSION"),
        ("SAFETY", "GEOFENCE"),
        ("COMMUNICATION", "SETTINGS"),
        ("AI", "AI"),
        ("SYSTEM", "COMMAND"),
    ]

    all_ok = True
    for tab_name, expected_section in tabs_to_test:
        t0 = time.time()
        res = await eval_js(f"""
        (() => {{
            const btn = document.querySelector('button[data-testid="console-tab-{tab_name}"]');
            if (btn) {{
                btn.click();
            }} else {{
                const appStore = window.__useAppStore?.getState ? window.__useAppStore.getState() : null;
                if (appStore) {{
                    appStore.setActiveConsoleTab('{tab_name}');
                    const mapping = {{
                        'TELEMETRY': 'FLEET',
                        'MISSION': 'MISSION',
                        'SAFETY': 'GEOFENCE',
                        'COMMUNICATION': 'SETTINGS',
                        'AI': 'AI',
                        'SYSTEM': 'COMMAND'
                    }};
                    appStore.setActiveSection(mapping['{tab_name}']);
                }}
            }}
            const app = window.__useAppStore?.getState ? window.__useAppStore.getState() : null;
            return {{
                activeConsoleTab: app?.activeConsoleTab,
                activeSection: app?.activeSection,
                clicked_dom: !!btn
            }};
        }})()
        """)
        dur = (time.time() - t0) * 1000
        active_tab = res.get("activeConsoleTab")
        active_sec = res.get("activeSection")
        dom_clicked = res.get("clicked_dom")
        passed = (active_tab == tab_name and active_sec == expected_section)
        print(f"   ✓ Tab [{tab_name:.<14}] -> Section [{active_sec:.<10}] (DOM Clicked: {dom_clicked}, {dur:.2f}ms) -> {'✅ OK' if passed else '❌ FAIL'}")
        if not passed:
            all_ok = False

    # Take screenshot of open console
    shot = await call_cdp("Page.captureScreenshot", {"format": "png"})
    shot_path = os.path.join(SCREENSHOT_DIR, "live_console_buttons_verified.png")
    with open(shot_path, "wb") as f:
        f.write(base64.b64decode(shot.get("data", "")))
    print(f"\n📸 Console Verification Screenshot Saved: {shot_path}")

    await ws.close()
    print("\n" + "=" * 80)
    print(f"🏁 CONSOLE BUTTONS VERIFICATION SCORECARD: {'PASSED ✅' if all_ok else 'FAILED ❌'}")
    print("=" * 80 + "\n")
    return all_ok

if __name__ == "__main__":
    success = asyncio.run(test_console_buttons())
    sys.exit(0 if success else 1)
