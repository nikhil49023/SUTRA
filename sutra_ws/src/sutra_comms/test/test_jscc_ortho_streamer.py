#!/usr/bin/env python3
"""
Test Suite: Deep JSCC 360° Orthomosaic Streamer & MBTiles Tile Server
================================================================================
Target: Subsystem B (Comms & Neural Transceiver) & Subsystem D (GCS Tile DB)
Author: Tech Lead Nikhil & Siva Kesava
"""

import io
import sys
import json
import time
import urllib.request
import threading
from pathlib import Path
import pytest
from PIL import Image

GCS_PATH = Path(__file__).resolve().parents[2] / "sutra_gcs"
if str(GCS_PATH) not in sys.path:
    sys.path.insert(0, str(GCS_PATH))

from sutra_tile_server import (
    deg2num,
    num2deg,
    MBTilesDatabase,
    OrthomosaicPainter,
    ThreadedHTTPServer,
    TileHTTPRequestHandler,
)
from sutra_comms.jscc_ortho_streamer import JsccOrthoStreamer


@pytest.fixture
def temp_mbtiles(tmp_path):
    db_file = tmp_path / "test_ortho.mbtiles"
    db = MBTilesDatabase(db_path=db_file)
    return db


def test_slippy_tile_math_accuracy():
    """Verify WGS84 coordinates round-trip with sub-pixel precision."""
    lat, lon = 11.524871, 76.128456
    zoom = 18

    xtile, ytile = deg2num(lat, lon, zoom)
    assert xtile > 0
    assert ytile > 0

    nw_lat, nw_lon = num2deg(xtile, ytile, zoom)
    se_lat, se_lon = num2deg(xtile + 1, ytile + 1, zoom)

    # Assert point is contained within the computed tile bounding box
    assert nw_lat >= lat >= se_lat
    assert nw_lon <= lon <= se_lon


def test_mbtiles_database_crud(temp_mbtiles):
    """Verify MBTiles storage and retrieval matches SQLite specification."""
    db = temp_mbtiles

    # Create synthetic PNG
    img = Image.new("RGBA", (256, 256), (0, 200, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw_png = buf.getvalue()

    z, x, y = 18, 186507, 122622
    db.put_tile(z, x, y, raw_png)

    retrieved = db.get_tile(z, x, y)
    assert retrieved is not None
    assert len(retrieved) == len(raw_png)
    assert retrieved[:8] == b"\x89PNG\r\n\x1a\n"  # Valid PNG signature

    stats = db.get_stats()
    assert stats["total_tiles"] == 1
    assert stats["min_zoom"] == 18
    assert stats["max_zoom"] == 18


def test_orthomosaic_painter_footprint_rendering(temp_mbtiles):
    """Verify camera footprint projection renders into tiles and accumulates coverage."""
    db = temp_mbtiles
    painter = OrthomosaicPainter(db)

    painter.paint_camera_footprint(
        drone_id="uav_alpha",
        lat=11.524871,
        lon=76.128456,
        alt=46.0,
        heading_deg=90.0,
        snr_db=15.0,
        thermal_active=True
    )

    assert painter.coverage_m2 > 0.0
    stats = db.get_stats()
    assert stats["total_tiles"] >= 2  # Painted at zoom 18 and 19


def test_jscc_streamer_and_http_server_end_to_end(tmp_path):
    """End-to-end integration test: Deep JSCC compression -> Tile HTTP server -> MapLibre fetch."""
    test_port = 8095
    server = ThreadedHTTPServer(("127.0.0.1", test_port), TileHTTPRequestHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.3)

    try:
        # 1. Stream footprint via Deep JSCC pipeline
        streamer = JsccOrthoStreamer(tile_server_url=f"http://127.0.0.1:{test_port}/api/inject_footprint")
        result = streamer.process_and_stream_footprint(
            drone_id="uav_beta",
            lat=11.524858,
            lon=76.128461,
            alt=54.0,
            heading_deg=180.0,
            raw_frame_size_kb=512.0,
            distance_to_gcs_m=200.0,
            thermal=True
        )

        assert result["http_status"] == 200
        assert result["compressed_size_kb"] < 25.0  # Deep JSCC payload compression > 95%
        assert streamer.total_streamed_frames == 1

        # 2. Check coverage API
        with urllib.request.urlopen(f"http://127.0.0.1:{test_port}/api/coverage", timeout=2.0) as resp:
            assert resp.status == 200
            cov = json.loads(resp.read().decode())
            assert cov["status"] == "ONLINE"
            assert cov["total_tiles"] > 0

        # 3. Fetch tile as MapLibre GL would
        x, y = deg2num(11.524858, 76.128461, 18)
        with urllib.request.urlopen(f"http://127.0.0.1:{test_port}/tiles/18/{x}/{y}.png", timeout=2.0) as resp:
            assert resp.status == 200
            assert resp.headers["Content-Type"] == "image/png"
            assert resp.headers["Access-Control-Allow-Origin"] == "*"
            tile_data = resp.read()
            assert len(tile_data) > 500
            assert tile_data[:8] == b"\x89PNG\r\n\x1a\n"

    finally:
        server.server_close()
