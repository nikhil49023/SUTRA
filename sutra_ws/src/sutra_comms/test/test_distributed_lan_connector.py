#!/usr/bin/env python3
"""
Test Suite: Distributed 2-Laptop Simulation ⟷ GCS Compute Pipeline
================================================================================
Target: Subsystem B (Sim Exporter) & Subsystem D (GCS Compute Worker)
Author: Tech Lead Nikhil & Siva Kesava
"""

import sys
import json
import time
import asyncio
import threading
from pathlib import Path
import pytest

GCS_PATH = Path(__file__).resolve().parents[2] / "sutra_gcs"
if str(GCS_PATH) not in sys.path:
    sys.path.insert(0, str(GCS_PATH))

from sutra_comms.sutra_sim_exporter import SutraSimExporter
from sutra_gcs_compute_worker import GcsComputeWorker


def test_distributed_sim_to_compute_pipeline():
    """Verifies end-to-end telemetry, Deep JSCC frames, and RTL uplink between Sim Host and Compute Worker."""
    async def _async_runner():
        sim_port = 9098
        gcs_port = 8769

        # 1. Start Simulation Exporter (Host)
        exporter = SutraSimExporter(host="127.0.0.1", port=sim_port)
        await asyncio.sleep(0.3)

        # 2. Start Compute Worker (Shiva)
        worker = GcsComputeWorker(host_ip="127.0.0.1", host_port=sim_port, local_ws_port=gcs_port)
        worker_thread = threading.Thread(target=worker.start, daemon=True)
        worker_thread.start()
        await asyncio.sleep(0.5)

        try:
            # 3. Simulate client connecting to Shiva's local GCS port
            import websockets
            async with websockets.connect(f"ws://127.0.0.1:{gcs_port}", ping_interval=5) as client_ws:
                # Send an RTL command from Shiva's client
                rtl_cmd = {
                    "command": "RTL",
                    "drone_id": "uav_alpha",
                    "timestamp": time.time(),
                    "origin": "SHIVA_GCS_TOPBAR"
                }
                await client_ws.send(json.dumps(rtl_cmd))
                await asyncio.sleep(0.4)

                # Assert Host received RTL and updated state
                assert exporter.swarm_telemetry["uav_alpha"]["status"] == "RTL"
                print("✅ Verified 1-Click Emergency RTL uplink traversed LAN to Simulation Host!")

                # Verify synthetic / live frame broadcast
                exporter._telemetry_ticker()
                await asyncio.sleep(0.2)

                # Receive at least one packet on Shiva's client
                msg = await asyncio.wait_for(client_ws.recv(), timeout=3.0)
                data = json.loads(msg)
                assert "topic" in data
                print(f"✅ Shiva's GCS received live stream topic: {data['topic']}")

        finally:
            worker.stop()
            exporter.stop()

    asyncio.run(_async_runner())

