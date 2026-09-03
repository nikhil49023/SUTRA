"""
Smart Horizon GCS — Mission JSON Serializer & Persistence Adapter
Subsystem: Mission Engine (Phase 3)
"""

import json
from pathlib import Path
from typing import Any, Dict, Optional

from config.settings import get_settings
from .models import Mission, MissionStatus
from .waypoint import AltitudeReference, Waypoint, WaypointCommand


class MissionSerializer:
    """
    Serializes and deserializes Mission aggregate objects to and from JSON format.
    """

    @classmethod
    def to_dict(cls, mission: Mission) -> Dict[str, Any]:
        """Converts a Mission dataclass into a serializable dictionary."""
        return {
            "mission_id": mission.mission_id,
            "name": mission.name,
            "description": mission.description,
            "home": {
                "latitude": mission.home_latitude,
                "longitude": mission.home_longitude,
            },
            "default_altitude": mission.default_altitude,
            "default_speed": mission.default_speed,
            "created_at": mission.created_at,
            "updated_at": mission.updated_at,
            "status": mission.status.value,
            "waypoints": [
                {
                    "id": wp.id,
                    "index": wp.index,
                    "latitude": wp.latitude,
                    "longitude": wp.longitude,
                    "altitude": wp.altitude,
                    "altitude_reference": wp.altitude_reference.value
                    if isinstance(wp.altitude_reference, AltitudeReference)
                    else str(wp.altitude_reference),
                    "speed": wp.speed,
                    "heading": wp.heading,
                    "hold_time": wp.hold_time,
                    "acceptance_radius": wp.acceptance_radius,
                    "command": wp.command.value
                    if isinstance(wp.command, WaypointCommand)
                    else str(wp.command),
                    "loiter_radius": wp.loiter_radius,
                    "enabled": wp.enabled,
                }
                for wp in mission.waypoints
            ],
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> Mission:
        """Constructs a typed Mission dataclass from a dictionary."""
        home_data = data.get("home", {})
        home_lat = home_data.get("latitude", data.get("home_latitude", 37.774929))
        home_lon = home_data.get("longitude", data.get("home_longitude", -122.419416))

        waypoints: list[Waypoint] = []
        for wp_data in data.get("waypoints", []):
            cmd_str = wp_data.get("command", "WAYPOINT")
            cmd_enum = (
                WaypointCommand[cmd_str]
                if cmd_str in WaypointCommand.__members__
                else WaypointCommand.WAYPOINT
            )

            ref_str = wp_data.get("altitude_reference", "RELATIVE_TO_HOME")
            ref_enum = (
                AltitudeReference[ref_str]
                if ref_str in AltitudeReference.__members__
                else AltitudeReference.RELATIVE_TO_HOME
            )

            wp = Waypoint(
                id=wp_data.get("id", ""),
                index=int(wp_data.get("index", len(waypoints) + 1)),
                latitude=float(wp_data.get("latitude", 0.0)),
                longitude=float(wp_data.get("longitude", 0.0)),
                altitude=float(wp_data.get("altitude", 25.0)),
                altitude_reference=ref_enum,
                speed=float(wp_data.get("speed", 5.0)),
                heading=float(wp_data.get("heading", 0.0)),
                hold_time=float(wp_data.get("hold_time", 0.0)),
                acceptance_radius=float(wp_data.get("acceptance_radius", 1.8)),
                command=cmd_enum,
                loiter_radius=float(wp_data.get("loiter_radius", 10.0)),
                enabled=bool(wp_data.get("enabled", True)),
            )
            waypoints.append(wp)

        status_str = data.get("status", "PLANNING")
        status_enum = (
            MissionStatus[status_str]
            if status_str in MissionStatus.__members__
            else MissionStatus.PLANNING
        )

        return Mission(
            mission_id=data.get("mission_id", ""),
            name=data.get("name", "Imported Mission"),
            description=data.get("description", ""),
            waypoints=waypoints,
            home_latitude=home_lat,
            home_longitude=home_lon,
            default_altitude=float(data.get("default_altitude", 25.0)),
            default_speed=float(data.get("default_speed", 5.0)),
            created_at=float(data.get("created_at", 0.0)),
            updated_at=float(data.get("updated_at", 0.0)),
            status=status_enum,
        )

    @classmethod
    def save_to_file(cls, mission: Mission, filepath: Optional[Path] = None) -> Path:
        """Saves mission to a JSON file in the configured data directory."""
        settings = get_settings()
        if filepath is None:
            dir_path = settings.DATA_DIRECTORY / "missions"
            dir_path.mkdir(parents=True, exist_ok=True)
            safe_name = "".join(c for c in mission.name if c.isalnum() or c in ("-", "_")).lower()
            filepath = dir_path / f"{safe_name or 'mission'}.json"
        else:
            filepath = Path(filepath)
            filepath.parent.mkdir(parents=True, exist_ok=True)

        data = cls.to_dict(mission)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        return filepath

    @classmethod
    def load_from_file(cls, filepath: Path) -> Mission:
        """Loads and parses a mission JSON file."""
        filepath = Path(filepath)
        if not filepath.exists():
            raise FileNotFoundError(f"Mission file not found: {filepath}")

        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        return cls.from_dict(data)
