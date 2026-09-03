"""
Smart Horizon GCS — GeoJSON Feature Collection Import/Export Adapter
Subsystem: Geofence Subsystem (Phase 4)
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .geometry import GeofenceGeometry
from .models import Geofence, GeometryType, ZoneType


class GeoJSONService:
    """
    Serializes and parses RFC 7946 compliant GeoJSON FeatureCollections for airspace zones.
    """

    @classmethod
    def export_feature_collection(cls, geofences: List[Geofence]) -> Dict[str, Any]:
        """Converts a list of Geofence domain objects into a GeoJSON FeatureCollection dictionary."""
        features = []
        for g in geofences:
            if not g.visible and not g.enabled:
                continue

            # Determine coordinates array in GeoJSON [lon, lat] format
            if g.geometry_type == GeometryType.CIRCLE and g.center:
                poly = GeofenceGeometry.create_circle(g.center[0], g.center[1], g.radius)
                coords = [list(poly.exterior.coords)]
            elif g.geometry_type == GeometryType.CORRIDOR and len(g.coordinates) >= 2:
                poly = GeofenceGeometry.create_corridor(g.coordinates, g.corridor_width)
                coords = [list(poly.exterior.coords)] if poly else []
            else:
                # Polygon
                pts = [[lon, lat] for lat, lon in g.coordinates]
                if pts and pts[0] != pts[-1]:
                    pts.append(pts[0])
                coords = [pts]

            feat = {
                "type": "Feature",
                "id": g.id,
                "properties": {
                    "name": g.name,
                    "zone_type": g.zone_type.value,
                    "geometry_type": g.geometry_type.value,
                    "radius": g.radius,
                    "corridor_width": g.corridor_width,
                    "altitude_min": g.altitude_min,
                    "altitude_max": g.altitude_max,
                    "color": g.color or g.zone_type.border_color,
                    "description": g.description,
                    "enabled": g.enabled,
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": coords,
                },
            }
            features.append(feat)

        return {
            "type": "FeatureCollection",
            "features": features,
        }

    @classmethod
    def import_feature_collection(cls, data: Dict[str, Any]) -> List[Geofence]:
        """Parses a GeoJSON FeatureCollection dictionary into typed Geofence domain objects."""
        if data.get("type") != "FeatureCollection" or "features" not in data:
            raise ValueError("Invalid GeoJSON: Root must be a FeatureCollection.")

        geofences: List[Geofence] = []
        for i, feat in enumerate(data.get("features", [])):
            geom = feat.get("geometry", {})
            props = feat.get("properties", {})
            geom_type = geom.get("type")

            if geom_type != "Polygon" and geom_type != "MultiPolygon":
                # Only 2D surface geometries supported for geofences
                continue

            raw_coords = geom.get("coordinates", [])
            if not raw_coords:
                continue

            # In GeoJSON, outer ring is first element: [[lon, lat], ...]
            ring = raw_coords[0] if geom_type == "Polygon" else raw_coords[0][0]
            lat_lon_coords = [(float(pt[1]), float(pt[0])) for pt in ring if len(pt) >= 2]

            # Determine ZoneType
            zt_str = props.get("zone_type", "NO_FLY")
            zone_type = (
                ZoneType[zt_str]
                if zt_str in ZoneType.__members__
                else ZoneType.NO_FLY
            )

            # Determine GeometryType
            gt_str = props.get("geometry_type", "POLYGON")
            geometry_type = (
                GeometryType[gt_str]
                if gt_str in GeometryType.__members__
                else GeometryType.POLYGON
            )

            center = None
            if geometry_type == GeometryType.CIRCLE:
                center = (
                    lat_lon_coords[0]
                    if lat_lon_coords
                    else (37.774929, -122.419416)
                )

            g = Geofence(
                id=feat.get("id") or str(props.get("name", f"Geofence-{i+1}")),
                name=props.get("name", f"Imported Zone {i+1}"),
                zone_type=zone_type,
                geometry_type=geometry_type,
                coordinates=lat_lon_coords,
                center=center,
                radius=float(props.get("radius", 200.0)),
                corridor_width=float(props.get("corridor_width", 50.0)),
                altitude_min=float(props.get("altitude_min", 0.0)),
                altitude_max=float(props.get("altitude_max", 120.0)),
                visible=bool(props.get("visible", True)),
                color=props.get("color"),
                description=props.get("description", ""),
                enabled=bool(props.get("enabled", True)),
            )
            geofences.append(g)

        return geofences

    @classmethod
    def export_to_file(cls, geofences: List[Geofence], filepath: Path) -> Path:
        """Writes geofence collection to a GeoJSON file."""
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        fc = cls.export_feature_collection(geofences)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(fc, f, indent=2)
        return filepath

    @classmethod
    def import_from_file(cls, filepath: Path) -> List[Geofence]:
        """Reads and parses a GeoJSON file."""
        filepath = Path(filepath)
        if not filepath.exists():
            raise FileNotFoundError(f"GeoJSON file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.import_feature_collection(data)
