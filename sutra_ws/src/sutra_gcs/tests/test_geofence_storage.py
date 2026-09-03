"""
Smart Horizon GCS — Geofence Storage & GeoJSON Format Unit Tests
Subsystem: Test Suite (Phase 4)
"""

import tempfile
from pathlib import Path
import pytest

from geofence.geojson_service import GeoJSONService
from geofence.models import Geofence, GeometryType, ZoneType
from geofence.storage import GeofenceStorage


def test_storage_round_trip():
    """Verify JSON file save and load."""
    with tempfile.TemporaryDirectory() as tmpdir:
        filepath = Path(tmpdir) / "test_geofences.json"
        g = Geofence(
            id="g-123",
            name="Downtown Buffer",
            zone_type=ZoneType.NO_FLY,
            geometry_type=GeometryType.CIRCLE,
            center=(37.774929, -122.419416),
            radius=350.0,
            altitude_min=10.0,
            altitude_max=150.0,
        )

        saved = GeofenceStorage.save_all([g], filepath)
        assert saved.exists()

        loaded = GeofenceStorage.load_all(filepath)
        assert len(loaded) == 1
        assert loaded[0].id == "g-123"
        assert loaded[0].name == "Downtown Buffer"
        assert loaded[0].zone_type == ZoneType.NO_FLY
        assert loaded[0].radius == 350.0


def test_geojson_export_and_import():
    """Verify RFC 7946 GeoJSON FeatureCollection export and import."""
    coords = [
        (37.7740, -122.4200),
        (37.7760, -122.4200),
        (37.7760, -122.4180),
        (37.7740, -122.4180),
    ]
    g = Geofence(
        id="geo-poly-1",
        name="Convention Center Polygon",
        zone_type=ZoneType.WARNING,
        geometry_type=GeometryType.POLYGON,
        coordinates=coords,
    )

    fc = GeoJSONService.export_feature_collection([g])
    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) == 1
    assert fc["features"][0]["geometry"]["type"] == "Polygon"

    imported = GeoJSONService.import_feature_collection(fc)
    assert len(imported) == 1
    assert imported[0].name == "Convention Center Polygon"
    assert imported[0].zone_type == ZoneType.WARNING
