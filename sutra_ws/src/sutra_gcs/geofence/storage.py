"""
Smart Horizon GCS — Geofence JSON Persistence & Storage Adapter
Subsystem: Geofence Subsystem (Phase 4)
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from config.settings import get_settings
from .models import Geofence, GeometryType, ZoneType


class GeofenceStorage:
    """
    Manages loading and saving geofences in the application configuration directory.
    """

    @classmethod
    def get_storage_dir(cls) -> Path:
        """Returns the configured directory for geofence files."""
        settings = get_settings()
        path = settings.DATA_DIRECTORY / "geofences"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @classmethod
    def to_dict(cls, geofence: Geofence) -> Dict[str, Any]:
        """Serializes a Geofence instance into a JSON-compatible dictionary."""
        return {
            "id": geofence.id,
            "name": geofence.name,
            "zone_type": geofence.zone_type.value,
            "geometry_type": geofence.geometry_type.value,
            "coordinates": geofence.coordinates,
            "center": geofence.center,
            "radius": geofence.radius,
            "corridor_width": geofence.corridor_width,
            "altitude_min": geofence.altitude_min,
            "altitude_max": geofence.altitude_max,
            "visible": geofence.visible,
            "color": geofence.color,
            "created_at": geofence.created_at,
            "updated_at": geofence.updated_at,
            "enabled": geofence.enabled,
            "description": geofence.description,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> Geofence:
        """Constructs a Geofence instance from a dictionary."""
        zt_str = data.get("zone_type", "NO_FLY")
        zone_type = (
            ZoneType[zt_str]
            if zt_str in ZoneType.__members__
            else ZoneType.NO_FLY
        )

        gt_str = data.get("geometry_type", "POLYGON")
        geometry_type = (
            GeometryType[gt_str]
            if gt_str in GeometryType.__members__
            else GeometryType.POLYGON
        )

        raw_coords = data.get("coordinates", [])
        coords = [(float(pt[0]), float(pt[1])) for pt in raw_coords if len(pt) >= 2]

        raw_center = data.get("center")
        center = (
            (float(raw_center[0]), float(raw_center[1]))
            if raw_center and len(raw_center) >= 2
            else None
        )

        return Geofence(
            id=data.get("id", ""),
            name=data.get("name", "Restricted Airspace"),
            zone_type=zone_type,
            geometry_type=geometry_type,
            coordinates=coords,
            center=center,
            radius=float(data.get("radius", 200.0)),
            corridor_width=float(data.get("corridor_width", 50.0)),
            altitude_min=float(data.get("altitude_min", 0.0)),
            altitude_max=float(data.get("altitude_max", 120.0)),
            visible=bool(data.get("visible", True)),
            color=data.get("color"),
            created_at=float(data.get("created_at", 0.0)),
            updated_at=float(data.get("updated_at", 0.0)),
            enabled=bool(data.get("enabled", True)),
            description=data.get("description", ""),
        )

    @classmethod
    def save_all(cls, geofences: List[Geofence], filepath: Optional[Path] = None) -> Path:
        """Saves list of geofences to disk."""
        target = filepath or (cls.get_storage_dir() / "active_geofences.json")
        data = [cls.to_dict(g) for g in geofences]
        with open(target, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return target

    @classmethod
    def load_all(cls, filepath: Optional[Path] = None) -> List[Geofence]:
        """Loads list of geofences from disk."""
        target = filepath or (cls.get_storage_dir() / "active_geofences.json")
        if not target.exists():
            return []
        with open(target, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [cls.from_dict(d) for d in data]
