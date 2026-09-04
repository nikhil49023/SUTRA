#!/usr/bin/env python3
"""
Test Suite: VIO Pose → GCS WebSocket Bridge (Subsystem B + D)
==============================================================
Verifies SutraSimExporter broadcasts VIO_POSE packets containing per-drone
EKF2 localization mode and WGS84-converted position. Tests the full pipeline:

  vio_localization.py ─[ROS2 /did/vio/odometry]─► SutraSimExporter._broadcast_vio_poses()
                                                   ─[WebSocket VIO_POSE]─► GcsComputeWorker
                                                                            ─[local WS]─► GCS Browser

Architecture references:
  - Merat et al. "Drift-free VSLAM via Digital Twins" (IEEE RA-L 2024, arXiv:2412.08496)
  - Xu et al. "Omni-swarm" (IEEE Transactions on Robotics 2022, arXiv:2103.04131)

No ROS2 runtime required — SutraSimExporter runs in standalone mode.
"""

import sys
import json
import math
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


def test_vio_pose_broadcast_schema():
    """SutraSimExporter._broadcast_vio_poses() produces valid VIO_POSE JSON with all required fields."""
    exporter = SutraSimExporter(host="127.0.0.1", port=9181)
    time.sleep(0.15)

    exporter.vio_state["uav_alpha"].update({
        "local_x": 10.5, "local_y": 5.2, "local_z": 15.0,
        "vx": 2.1, "vy": 0.3, "vz": 0.0,
        "qw": 0.997, "qx": 0.0, "qy": 0.0, "qz": 0.07,
        "mode": "VIO_FALLBACK_ACTIVE",
        "timestamp": time.time()
    })

    captured = []
    orig = exporter.broadcast_json
    exporter.broadcast_json = lambda p: (captured.append(p), orig(p))
    exporter._broadcast_vio_poses()

    assert len(captured) == 1
    pkt = captured[0]
    assert pkt["topic"] == "VIO_POSE"
    assert "timestamp" in pkt and "origin" in pkt and "poses" in pkt

    for did in ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]:
        assert did in pkt["poses"], f"Missing {did} in VIO_POSE"

    alpha = pkt["poses"]["uav_alpha"]
    for field in ["lat", "lon", "alt", "local_x", "local_y", "local_z",
                  "vx", "vy", "vz", "qw", "qx", "qy", "qz", "mode", "timestamp"]:
        assert field in alpha, f"Missing field '{field}' in uav_alpha pose"

    assert alpha["mode"] == "VIO_FALLBACK_ACTIVE"
    assert abs(alpha["local_x"] - 10.5) < 1e-6
    assert abs(alpha["local_y"] - 5.2) < 1e-6
    assert abs(alpha["local_z"] - 15.0) < 1e-6
    exporter.stop()


def test_vio_pose_wgs84_conversion():
    """VIO local ENU (x, y, z) correctly converts to WGS84 lat/lon/alt using origin coordinates."""
    exporter = SutraSimExporter(host="127.0.0.1", port=9182)
    time.sleep(0.15)

    local_x, local_y, local_z = 100.0, 50.0, 20.0
    exporter.vio_state["uav_beta"].update({
        "local_x": local_x, "local_y": local_y, "local_z": local_z,
        "mode": "VIO_FALLBACK_ACTIVE", "timestamp": time.time()
    })

    captured = []
    exporter.broadcast_json = lambda p: captured.append(p)
    exporter._broadcast_vio_poses()

    assert len(captured) == 1
    beta = captured[0]["poses"]["uav_beta"]

    lat_scale = 1.0 / 111319.5
    lon_scale = 1.0 / (111319.5 * math.cos(math.radians(exporter.origin_lat)))
    expected_lat = exporter.origin_lat + local_x * lat_scale
    expected_lon = exporter.origin_lon + local_y * lon_scale
    expected_alt = exporter.origin_alt + local_z

    assert abs(beta["lat"] - expected_lat) < 1e-9, f"Lat err: {beta['lat']} != {expected_lat}"
    assert abs(beta["lon"] - expected_lon) < 1e-9, f"Lon err: {beta['lon']} != {expected_lon}"
    assert abs(beta["alt"] - expected_alt) < 1e-6, f"Alt err: {beta['alt']} != {expected_alt}"
    exporter.stop()


def test_vio_pose_end_to_end_pipeline():
    """Full pipeline: SutraSimExporter → WebSocket → GcsComputeWorker → local client receives VIO_POSE."""
    async def _run():
        sim_port = 9183
        gcs_port = 8795
        exporter = SutraSimExporter(host="127.0.0.1", port=sim_port)
        await asyncio.sleep(0.3)
        worker = GcsComputeWorker(host_ip="127.0.0.1", host_port=sim_port, local_ws_port=gcs_port)
        worker_thread = threading.Thread(target=worker.start, daemon=True)
        worker_thread.start()
        await asyncio.sleep(0.6)

        received_vio = []
        try:
            import websockets
            async with websockets.connect(f"ws://127.0.0.1:{gcs_port}", ping_interval=5) as client:
                exporter.vio_state["uav_beta"]["mode"] = "VIO_FALLBACK_ACTIVE"
                exporter.vio_state["uav_beta"]["local_x"] = 42.0
                exporter._broadcast_vio_poses()
                deadline = asyncio.get_event_loop().time() + 1.5
                while asyncio.get_event_loop().time() < deadline:
                    try:
                        msg = await asyncio.wait_for(client.recv(), timeout=0.5)
                        pkt = json.loads(msg)
                        if pkt.get("topic") == "VIO_POSE":
                            received_vio.append(pkt)
                            break
                    except asyncio.TimeoutError:
                        break
        except Exception as e:
            print(f"WebSocket test error: {e}")
        exporter.stop()
        worker.stop()
        return received_vio

    result = asyncio.run(_run())
    assert len(result) >= 1, "GCS client did not receive VIO_POSE packet"
    assert result[0]["topic"] == "VIO_POSE"
    assert "uav_beta" in result[0]["poses"]
    assert result[0]["poses"]["uav_beta"]["mode"] == "VIO_FALLBACK_ACTIVE"
    assert abs(result[0]["poses"]["uav_beta"]["local_x"] - 42.0) < 1e-6


def test_vio_gps_primary_mode_is_broadcast_correctly():
    """GPS_PRIMARY mode is broadcast as-is — GCS frontend uses mode field to preserve GPS authority."""
    exporter = SutraSimExporter(host="127.0.0.1", port=9184)
    time.sleep(0.15)
    exporter.vio_state["uav_gamma"].update({
        "local_x": 999.0, "local_y": 999.0, "local_z": 50.0,
        "mode": "GPS_PRIMARY", "timestamp": time.time()
    })
    captured = []
    exporter.broadcast_json = lambda p: captured.append(p)
    exporter._broadcast_vio_poses()
    assert captured[0]["poses"]["uav_gamma"]["mode"] == "GPS_PRIMARY"
    assert abs(captured[0]["poses"]["uav_gamma"]["local_x"] - 999.0) < 1e-6
    exporter.stop()


def test_vio_status_string_parsing():
    """_on_vio_status_shared() correctly parses all three VIO mode strings from /vio/status topic."""
    exporter = SutraSimExporter(host="127.0.0.1", port=9185)
    time.sleep(0.1)

    class FakeMsg:
        def __init__(self, data): self.data = data

    exporter._on_vio_status_shared(
        FakeMsg("MODE: VIO_FALLBACK_ACTIVE | GPS_HEALTHY: False | POS: (12.50, -3.20, 15.00)")
    )
    assert exporter.vio_state["uav_alpha"]["mode"] == "VIO_FALLBACK_ACTIVE"

    exporter._on_vio_status_shared(
        FakeMsg("MODE: GPS_PRIMARY | GPS_HEALTHY: True | POS: (0.00, 0.00, 0.00)")
    )
    assert exporter.vio_state["uav_alpha"]["mode"] == "GPS_PRIMARY"

    exporter._on_vio_status_shared(
        FakeMsg("MODE: DEAD_RECKONING_IMU_ONLY | GPS_HEALTHY: False | POS: (5.10, 2.30, 8.50)")
    )
    assert exporter.vio_state["uav_alpha"]["mode"] == "DEAD_RECKONING_IMU_ONLY"

    exporter.stop()
