"""
Smart Horizon GCS — MissionSerializer Unit Tests
Subsystem: Test Suite (Phase 3)
"""

import tempfile
from pathlib import Path
import pytest

from mission.mission_serializer import MissionSerializer
from mission.models import Mission
from mission.waypoint import Waypoint, WaypointCommand


def test_serializer_round_trip():
    """Verify dictionary serialization and deserialization preserves all mission data."""
    wps = [
        Waypoint(
            id="wp-01",
            index=1,
            latitude=37.775,
            longitude=-122.419,
            altitude=25.0,
            speed=5.0,
            command=WaypointCommand.TAKEOFF,
        ),
        Waypoint(
            id="wp-02",
            index=2,
            latitude=37.776,
            longitude=-122.418,
            altitude=30.0,
            speed=6.0,
            command=WaypointCommand.LOITER,
            hold_time=10.0,
        ),
    ]
    mission = Mission(
        mission_id="m-test-123",
        name="Serializer Test Corridor",
        description="Testing JSON persistence",
        waypoints=wps,
        home_latitude=37.774929,
        home_longitude=-122.419416,
    )

    data = MissionSerializer.to_dict(mission)
    restored = MissionSerializer.from_dict(data)

    assert restored.mission_id == "m-test-123"
    assert restored.name == "Serializer Test Corridor"
    assert len(restored.waypoints) == 2
    assert restored.waypoints[0].command == WaypointCommand.TAKEOFF
    assert restored.waypoints[1].command == WaypointCommand.LOITER
    assert restored.waypoints[1].hold_time == 10.0


def test_save_and_load_file():
    """Verify disk file I/O persistence."""
    with tempfile.TemporaryDirectory() as tmpdir:
        filepath = Path(tmpdir) / "test_mission.json"
        wps = [Waypoint(index=1, latitude=37.775, longitude=-122.419)]
        original = Mission(name="Disk Mission", waypoints=wps)

        saved_path = MissionSerializer.save_to_file(original, filepath)
        assert saved_path.exists()

        loaded = MissionSerializer.load_from_file(saved_path)
        assert loaded.name == "Disk Mission"
        assert len(loaded.waypoints) == 1
        assert loaded.waypoints[0].latitude == 37.775
