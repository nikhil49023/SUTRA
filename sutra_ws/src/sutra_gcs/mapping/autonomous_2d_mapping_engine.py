"""
Project SUTRA — Real-Time 2D Autonomous Mapping Engine
======================================================
Subsystem: Autonomous Spatial SLAM & Global 2D World Model (Subsystems A/B/C/D Integration)

PURPOSE:
  Incrementally constructs a 2D global world model in real-time from incoming
  multi-drone telemetry, camera frustum FOV projections, depth/obstacle sensors,
  and AI survivor/hazard edge detections.

CORE INVARIANTS:
  1. Starts completely EMPTY / UNKNOWN (zero hardcoded city geometry or mock maps).
  2. Incremental Bayesian Log-Odds Occupancy Grid + Semantic Tagging.
  3. Supports: FREE, OCCUPIED, UNKNOWN, BUILDING, ROAD, WATER_FLOOD, OBSTACLE, LANDING_ZONE, SURVIVOR.
  4. Multi-Drone Fusion: Fuses multiple UAV streams into a single unified global map;
     overlapping areas are fused and reinforced, not duplicated.
  5. Projects AI detections (e.g. survivors) onto 2D coordinates via drone pose raycasting.
  6. Exports directly as MapLibre-compatible GeoJSON FeatureCollections for sub-millisecond rendering.
"""

from __future__ import annotations

import enum
import logging
import math
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger("sutra_2d_mapping_engine")


# ── Semantic Cell Classification ──────────────────────────────────────────────
class SemanticCellType(str, enum.Enum):
    UNKNOWN = "UNKNOWN"
    FREE = "FREE"
    OCCUPIED = "OCCUPIED"
    BUILDING = "BUILDING"
    ROAD = "ROAD"
    WATER_FLOOD = "WATER_FLOOD"
    OBSTACLE = "OBSTACLE"
    LANDING_ZONE = "LANDING_ZONE"
    SURVIVOR = "SURVIVOR"


# Priority ranking when fusing different semantics into the same cell
# Higher rank overrides lower rank (e.g. confirmed SURVIVOR or OBSTACLE overrides FREE)
SEMANTIC_PRIORITY = {
    SemanticCellType.UNKNOWN: 0,
    SemanticCellType.FREE: 1,
    SemanticCellType.ROAD: 2,
    SemanticCellType.LANDING_ZONE: 3,
    SemanticCellType.WATER_FLOOD: 4,
    SemanticCellType.BUILDING: 5,
    SemanticCellType.OBSTACLE: 6,
    SemanticCellType.OCCUPIED: 7,
    SemanticCellType.SURVIVOR: 8,
}


@dataclass
class Map2DCell:
    """Represents a single discrete 2D spatial grid cell."""
    x_idx: int
    y_idx: int
    lat: float
    lon: float
    resolution_m: float
    occupancy_log_odds: float = 0.0  # 0.0 = P(occ) = 0.5 (unknown), <0 = free, >0 = occupied
    confidence: float = 0.5          # 0.0 to 1.0 exploration certainty
    semantic_type: SemanticCellType = SemanticCellType.UNKNOWN
    last_observed_timestamp: float = field(default_factory=time.time)
    observed_by: Set[str] = field(default_factory=set)
    observation_count: int = 0
    survivor_data: Optional[Dict[str, Any]] = None

    @property
    def occupancy_probability(self) -> float:
        """Converts log-odds to occupancy probability in [0.0, 1.0]."""
        try:
            return 1.0 / (1.0 + math.exp(-self.occupancy_log_odds))
        except OverflowError:
            return 1.0 if self.occupancy_log_odds > 0 else 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "x_idx": self.x_idx,
            "y_idx": self.y_idx,
            "lat": round(self.lat, 6),
            "lon": round(self.lon, 6),
            "resolution_m": self.resolution_m,
            "occupancy_prob": round(self.occupancy_probability, 3),
            "confidence": round(self.confidence, 3),
            "semantic_type": self.semantic_type.value,
            "last_observed_timestamp": self.last_observed_timestamp,
            "observed_by": list(self.observed_by),
            "observation_count": self.observation_count,
            "survivor_data": self.survivor_data,
        }

    def to_geojson_feature(self) -> Dict[str, Any]:
        """Generates a 2D bounding polygon Feature for MapLibre rendering."""
        half_res_lat = (self.resolution_m / 2.0) / 111320.0
        # Longitude degree scaling based on current latitude
        lat_rad = math.radians(self.lat)
        cos_lat = max(math.cos(lat_rad), 0.01)
        half_res_lon = (self.resolution_m / 2.0) / (111320.0 * cos_lat)

        min_lat = self.lat - half_res_lat
        max_lat = self.lat + half_res_lat
        min_lon = self.lon - half_res_lon
        max_lon = self.lon + half_res_lon

        coordinates = [[
            [min_lon, min_lat],
            [max_lon, min_lat],
            [max_lon, max_lat],
            [min_lon, max_lat],
            [min_lon, min_lat],
        ]]

        return {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": coordinates,
            },
            "properties": {
                "cell_id": f"{self.x_idx}_{self.y_idx}",
                "semantic_type": self.semantic_type.value,
                "confidence": round(self.confidence, 2),
                "occupancy_prob": round(self.occupancy_probability, 2),
                "last_observed": self.last_observed_timestamp,
                "observed_by": list(self.observed_by),
                "is_survivor": self.semantic_type == SemanticCellType.SURVIVOR,
            },
        }


# ── Real-Time Autonomous 2D Mapping Engine ────────────────────────────────────
class Autonomous2DMappingEngine:
    """
    Maintains the authoritatively empty, incrementally explored 2D world grid.
    Fuses telemetry, camera projections, sensor returns, and AI detections across all UAVs.
    """

    def __init__(self, cell_resolution_m: float = 2.0):
        self.cell_resolution_m = cell_resolution_m
        self._cells: Dict[Tuple[int, int], Map2DCell] = {}
        self._lock = threading.Lock()
        self.origin_lat: Optional[float] = None
        self.origin_lon: Optional[float] = None
        self._last_modified_timestamp = time.time()
        self._dirty_cells: Set[Tuple[int, int]] = set()

        # Raycasting constants
        self.camera_hfov_deg = 70.0
        self.camera_vfov_deg = 52.0
        self.max_raycast_dist_m = 60.0

        logger.info(f"Initialized Autonomous2DMappingEngine (resolution: {self.cell_resolution_m}m)")

    def latlon_to_grid(self, lat: float, lon: float) -> Tuple[int, int]:
        """Converts WGS84 coordinates to integer 2D grid cell indices."""
        if self.origin_lat is None or self.origin_lon is None:
            self.origin_lat = lat
            self.origin_lon = lon

        lat_rad = math.radians(self.origin_lat)
        cos_lat = max(math.cos(lat_rad), 0.01)

        d_lat_m = (lat - self.origin_lat) * 111320.0
        d_lon_m = (lon - self.origin_lon) * 111320.0 * cos_lat

        x_idx = int(round(d_lon_m / self.cell_resolution_m))
        y_idx = int(round(d_lat_m / self.cell_resolution_m))
        return (x_idx, y_idx)

    def grid_to_latlon(self, x_idx: int, y_idx: int) -> Tuple[float, float]:
        """Converts integer 2D grid cell indices back to WGS84 coordinates."""
        if self.origin_lat is None or self.origin_lon is None:
            return (0.0, 0.0)

        lat_rad = math.radians(self.origin_lat)
        cos_lat = max(math.cos(lat_rad), 0.01)

        d_lat_deg = (y_idx * self.cell_resolution_m) / 111320.0
        d_lon_deg = (x_idx * self.cell_resolution_m) / (111320.0 * cos_lat)

        return (self.origin_lat + d_lat_deg, self.origin_lon + d_lon_deg)

    def get_cell(self, x_idx: int, y_idx: int) -> Optional[Map2DCell]:
        """Returns the Map2DCell at the specified grid indices, or None if unmapped."""
        with self._lock:
            return self._cells.get((x_idx, y_idx))

    def get_cell_at_latlon(self, lat: float, lon: float) -> Optional[Map2DCell]:
        """Returns the Map2DCell covering the given WGS84 coordinate, or None if unmapped."""
        with self._lock:
            if self.origin_lat is None or self.origin_lon is None:
                return None
            gx, gy = self.latlon_to_grid(lat, lon)
            return self._cells.get((gx, gy))

    # ── Telemetry & Field-of-View Ingestion ────────────────────────────────────
    def ingest_drone_pose(
        self,
        drone_id: str,
        lat: float,
        lon: float,
        altitude_m: float,
        heading_deg: float = 0.0,
        pitch_deg: float = 0.0,
        roll_deg: float = 0.0,
        speed_mps: float = 0.0,
        obstacle_distance_m: Optional[float] = None,
    ) -> List[Map2DCell]:
        """
        Incrementally updates the 2D world map based on drone pose:
        - Projects camera FOV cone onto the ground.
        - Marks interior as FREE traversable space (Bayesian log-odds decrease).
        - If obstacle distance return is present, marks obstacle boundary cell as OCCUPIED.
        """
        now = time.time()
        updated_cells: List[Map2DCell] = []

        if lat is None or lon is None or altitude_m is None:
            return updated_cells

        with self._lock:
            if self.origin_lat is None:
                self.origin_lat = lat
                self.origin_lon = lon

            center_x, center_y = self.latlon_to_grid(lat, lon)

            # Ground footprint radius from altitude and FOV
            alt = max(altitude_m, 3.0)
            fov_rad = math.radians(self.camera_hfov_deg)
            ground_radius_m = min(alt * math.tan(fov_rad / 2.0), self.max_raycast_dist_m)
            radius_cells = max(1, int(round(ground_radius_m / self.cell_resolution_m)))

            # Discretize ground circle / FOV footprint
            for dx in range(-radius_cells, radius_cells + 1):
                for dy in range(-radius_cells, radius_cells + 1):
                    dist_sq = dx * dx + dy * dy
                    if dist_sq <= radius_cells * radius_cells:
                        gx = center_x + dx
                        gy = center_y + dy
                        key = (gx, gy)

                        cell = self._cells.get(key)
                        if cell is None:
                            clat, clon = self.grid_to_latlon(gx, gy)
                            cell = Map2DCell(
                                x_idx=gx,
                                y_idx=gy,
                                lat=clat,
                                lon=clon,
                                resolution_m=self.cell_resolution_m,
                                semantic_type=SemanticCellType.FREE,
                                occupancy_log_odds=-1.2,  # P(occ) ~ 0.23 (Free)
                                confidence=0.75,
                                last_observed_timestamp=now,
                                observed_by={drone_id},
                                observation_count=1,
                            )
                            self._cells[key] = cell
                        else:
                            # Bayesian log-odds free space update
                            cell.occupancy_log_odds = max(cell.occupancy_log_odds - 0.4, -3.5)
                            # Only promote to FREE if not already a confirmed higher-priority obstacle/structure
                            if SEMANTIC_PRIORITY[cell.semantic_type] <= SEMANTIC_PRIORITY[SemanticCellType.FREE]:
                                cell.semantic_type = SemanticCellType.FREE
                            cell.confidence = min(1.0, cell.confidence + 0.05)
                            cell.last_observed_timestamp = now
                            cell.observed_by.add(drone_id)
                            cell.observation_count += 1

                        self._dirty_cells.add(key)
                        updated_cells.append(cell)

            # ── If obstacle distance sensor reported a hit ────────────────────
            if obstacle_distance_m is not None and 0.5 < obstacle_distance_m < self.max_raycast_dist_m:
                obs_heading_rad = math.radians(heading_deg)
                obs_dx_m = obstacle_distance_m * math.sin(obs_heading_rad)
                obs_dy_m = obstacle_distance_m * math.cos(obs_heading_rad)

                obs_lat_deg = obs_dy_m / 111320.0
                obs_lon_deg = obs_dx_m / (111320.0 * max(math.cos(math.radians(lat)), 0.01))

                obs_x, obs_y = self.latlon_to_grid(lat + obs_lat_deg, lon + obs_lon_deg)
                obs_key = (obs_x, obs_y)

                obs_cell = self._cells.get(obs_key)
                if obs_cell is None:
                    clat, clon = self.grid_to_latlon(obs_x, obs_y)
                    obs_cell = Map2DCell(
                        x_idx=obs_x,
                        y_idx=obs_y,
                        lat=clat,
                        lon=clon,
                        resolution_m=self.cell_resolution_m,
                        semantic_type=SemanticCellType.OBSTACLE,
                        occupancy_log_odds=1.8,
                        confidence=0.82,
                        last_observed_timestamp=now,
                        observed_by={drone_id},
                        observation_count=1,
                    )
                    self._cells[obs_key] = obs_cell
                else:
                    obs_cell.occupancy_log_odds = min(obs_cell.occupancy_log_odds + 1.2, 4.0)
                    if SEMANTIC_PRIORITY[obs_cell.semantic_type] < SEMANTIC_PRIORITY[SemanticCellType.OBSTACLE]:
                        obs_cell.semantic_type = SemanticCellType.OBSTACLE
                    obs_cell.confidence = min(1.0, obs_cell.confidence + 0.1)
                    obs_cell.last_observed_timestamp = now
                    obs_cell.observed_by.add(drone_id)
                    obs_cell.observation_count += 1

                self._dirty_cells.add(obs_key)
                updated_cells.append(obs_cell)

            self._last_modified_timestamp = now

        return updated_cells

    # ── AI Perception & Semantic Target Projection ────────────────────────────
    def ingest_semantic_observation(
        self,
        drone_id: str,
        latitude: float,
        longitude: float,
        semantic_type_str: str,
        confidence: float = 0.90,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Map2DCell]:
        """
        Projects an AI edge perception detection (e.g. SURVIVOR, BUILDING, ROAD, WATER_FLOOD)
        onto the global 2D grid using the geolocated WGS84 coordinates.
        Fuses multi-drone detections on overlapping cells without duplication.
        """
        now = time.time()
        # Parse semantic type
        type_upper = str(semantic_type_str).upper()
        if "SURVIVOR" in type_upper or "PERSON" in type_upper or "HUMAN" in type_upper:
            target_type = SemanticCellType.SURVIVOR
        elif "BUILDING" in type_upper or "STRUCTURE" in type_upper or "HOUSE" in type_upper:
            target_type = SemanticCellType.BUILDING
        elif "ROAD" in type_upper or "PATH" in type_upper or "CORRIDOR" in type_upper:
            target_type = SemanticCellType.ROAD
        elif "WATER" in type_upper or "FLOOD" in type_upper or "RIVER" in type_upper:
            target_type = SemanticCellType.WATER_FLOOD
        elif "LZ" in type_upper or "LANDING" in type_upper or "HELI" in type_upper:
            target_type = SemanticCellType.LANDING_ZONE
        elif "OBSTACLE" in type_upper or "TREE" in type_upper or "DEBRIS" in type_upper:
            target_type = SemanticCellType.OBSTACLE
        else:
            target_type = SemanticCellType.OCCUPIED

        with self._lock:
            gx, gy = self.latlon_to_grid(latitude, longitude)
            key = (gx, gy)

            cell = self._cells.get(key)
            if cell is None:
                clat, clon = self.grid_to_latlon(gx, gy)
                cell = Map2DCell(
                    x_idx=gx,
                    y_idx=gy,
                    lat=clat,
                    lon=clon,
                    resolution_m=self.cell_resolution_m,
                    semantic_type=target_type,
                    occupancy_log_odds=2.5 if target_type != SemanticCellType.ROAD else -1.0,
                    confidence=confidence,
                    last_observed_timestamp=now,
                    observed_by={drone_id},
                    observation_count=1,
                    survivor_data=metadata if target_type == SemanticCellType.SURVIVOR else None,
                )
                self._cells[key] = cell
            else:
                # Multi-drone observation fusion
                if SEMANTIC_PRIORITY[target_type] >= SEMANTIC_PRIORITY[cell.semantic_type]:
                    cell.semantic_type = target_type
                # Boost confidence using noisy-OR fusion
                cell.confidence = 1.0 - (1.0 - cell.confidence) * (1.0 - confidence)
                cell.occupancy_log_odds = min(cell.occupancy_log_odds + 1.5, 5.0)
                cell.last_observed_timestamp = now
                cell.observed_by.add(drone_id)
                cell.observation_count += 1
                if target_type == SemanticCellType.SURVIVOR:
                    cell.survivor_data = metadata

            self._dirty_cells.add(key)
            self._last_modified_timestamp = now

        logger.info(
            f"[2D Mapping] Ingested {target_type.value} from {drone_id} at ({latitude:.5f}, {longitude:.5f}) "
            f"→ Cell ({gx}, {gy}) Confidence: {cell.confidence:.2f}"
        )
        return cell

    # ── Snapshot & Incremental Delta Export ───────────────────────────────────
    def get_geojson_snapshot(self) -> Dict[str, Any]:
        """Serializes the entire dynamic 2D world model into a GeoJSON FeatureCollection."""
        with self._lock:
            features = [cell.to_geojson_feature() for cell in self._cells.values()]

        return {
            "type": "FeatureCollection",
            "features": features,
            "properties": {
                "timestamp": self._last_modified_timestamp,
                "total_cells": len(self._cells),
                "resolution_m": self.cell_resolution_m,
                "origin": [self.origin_lon, self.origin_lat] if self.origin_lat else None,
            },
        }

    def get_incremental_delta(self) -> Dict[str, Any]:
        """Returns only modified cells since last query (sub-millisecond streaming)."""
        with self._lock:
            if not self._dirty_cells:
                return {"type": "FeatureCollection", "features": [], "delta_count": 0}

            features = [
                self._cells[key].to_geojson_feature()
                for key in self._dirty_cells
                if key in self._cells
            ]
            count = len(self._dirty_cells)
            self._dirty_cells.clear()

        return {
            "type": "FeatureCollection",
            "features": features,
            "delta_count": count,
            "timestamp": self._last_modified_timestamp,
        }

    def get_metrics(self) -> Dict[str, Any]:
        """Computes live spatial mapping statistics."""
        with self._lock:
            total_cells = len(self._cells)
            total_area_m2 = total_cells * (self.cell_resolution_m ** 2)

            counts: Dict[str, int] = {}
            survivor_cells = 0
            for cell in self._cells.values():
                st = cell.semantic_type.value
                counts[st] = counts.get(st, 0) + 1
                if cell.semantic_type == SemanticCellType.SURVIVOR:
                    survivor_cells += 1

        return {
            "total_cells": total_cells,
            "total_area_m2": round(total_area_m2, 1),
            "total_area_km2": round(total_area_m2 / 1_000_000.0, 4),
            "resolution_m": self.cell_resolution_m,
            "semantic_breakdown": counts,
            "survivors_located": survivor_cells,
            "last_update": self._last_modified_timestamp,
        }

    def reset_map(self) -> None:
        """Clears the 2D world model back to an empty, unexplored state."""
        with self._lock:
            self._cells.clear()
            self._dirty_cells.clear()
            self.origin_lat = None
            self.origin_lon = None
            self._last_modified_timestamp = time.time()
        logger.info("Autonomous2DMappingEngine reset to empty state.")

    def reset(self) -> None:
        """Alias for reset_map."""
        self.reset_map()


# ── Global Singleton Accessor ─────────────────────────────────────────────────
_mapping_engine_instance: Optional[Autonomous2DMappingEngine] = None
_instance_lock = threading.Lock()


def get_mapping_engine(cell_resolution_m: float = 2.0) -> Autonomous2DMappingEngine:
    """Returns the process-wide Autonomous2DMappingEngine singleton."""
    global _mapping_engine_instance
    if _mapping_engine_instance is None:
        with _instance_lock:
            if _mapping_engine_instance is None:
                _mapping_engine_instance = Autonomous2DMappingEngine(cell_resolution_m)
    return _mapping_engine_instance
