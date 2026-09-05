import sys
from pathlib import Path
current_file = Path(__file__).resolve()
gcs_dir = current_file.parent.parent
if str(gcs_dir) not in sys.path:
    sys.path.insert(0, str(gcs_dir))

import pytest
import math
from mapping.autonomous_2d_mapping_engine import (
    Autonomous2DMappingEngine,
    Map2DCell,
    SemanticCellType,
    get_mapping_engine,
)


class TestAutonomous2DMappingEngine:
    """Rigorous mathematical and functional test suite for real-time 2D mapping."""

    @pytest.fixture
    def engine(self):
        eng = Autonomous2DMappingEngine(cell_resolution_m=2.0)
        eng.reset_map()
        return eng

    def test_initial_state_empty(self, engine):
        """Invariant: World starts completely empty / unknown."""
        snapshot = engine.get_geojson_snapshot()
        assert snapshot["type"] == "FeatureCollection"
        assert len(snapshot["features"]) == 0
        metrics = engine.get_metrics()
        assert metrics["total_cells"] == 0
        assert metrics["total_area_m2"] == 0.0
        assert metrics["survivors_located"] == 0

    def test_grid_conversion_and_projection(self, engine):
        """Verify geodetic WGS84 to metric discrete grid indexing."""
        origin_lat, origin_lon = 37.7749, -122.4194
        gx, gy = engine.latlon_to_grid(origin_lat, origin_lon)
        assert gx == 0
        assert gy == 0

        # Step 20m North
        lat_north = origin_lat + (20.0 / 111320.0)
        gx_n, gy_n = engine.latlon_to_grid(lat_north, origin_lon)
        assert gx_n == 0
        assert gy_n == 10  # 20m / 2.0m resolution = 10 cells

        # Convert back
        rlat, rlon = engine.grid_to_latlon(gx_n, gy_n)
        assert pytest.approx(rlat, rel=1e-5) == lat_north
        assert pytest.approx(rlon, rel=1e-5) == origin_lon

    def test_single_drone_frustum_ingestion(self, engine):
        """Verify drone pose ingestion generates FREE traversable space."""
        updated = engine.ingest_drone_pose(
            drone_id="alpha",
            lat=37.7749,
            lon=-122.4194,
            altitude_m=25.0,
            heading_deg=0.0,
            speed_mps=5.0,
        )
        assert len(updated) > 0
        metrics = engine.get_metrics()
        assert metrics["total_cells"] > 0
        assert metrics["total_area_m2"] > 0.0
        assert metrics["semantic_breakdown"].get("FREE", 0) > 0

        # Cells must have confidence and log-odds free
        cell = updated[0]
        assert "alpha" in cell.observed_by
        assert cell.occupancy_probability < 0.5  # Traversable FREE space

    def test_multi_drone_overlapping_fusion(self, engine):
        """Verify multi-drone observations reinforce confidence without duplicates."""
        # Drone Alpha explores origin
        engine.ingest_drone_pose(
            drone_id="alpha",
            lat=37.7749,
            lon=-122.4194,
            altitude_m=20.0,
        )
        count_alpha = engine.get_metrics()["total_cells"]

        # Drone Bravo explores exact same area
        engine.ingest_drone_pose(
            drone_id="bravo",
            lat=37.7749,
            lon=-122.4194,
            altitude_m=20.0,
        )
        count_both = engine.get_metrics()["total_cells"]

        # No duplicate cells created!
        assert count_both == count_alpha

        # Check that origin cell records BOTH drones
        origin_key = (0, 0)
        cell = engine._cells[origin_key]
        assert "alpha" in cell.observed_by
        assert "bravo" in cell.observed_by
        assert cell.observation_count >= 2

    def test_ai_survivor_detection_projection(self, engine):
        """Verify AI survivor detection projects onto 2D grid with high priority."""
        target_lat = 37.7755
        target_lon = -122.4185

        cell = engine.ingest_semantic_observation(
            drone_id="delta",
            latitude=target_lat,
            longitude=target_lon,
            semantic_type_str="SURVIVOR",
            confidence=0.96,
            metadata={"source": "yolov8_nano_trt", "thermal_temp_c": 37.2},
        )
        assert cell is not None
        assert cell.semantic_type == SemanticCellType.SURVIVOR
        assert cell.confidence >= 0.96
        assert "delta" in cell.observed_by
        assert cell.survivor_data["thermal_temp_c"] == 37.2

        metrics = engine.get_metrics()
        assert metrics["survivors_located"] == 1
        assert metrics["semantic_breakdown"].get("SURVIVOR", 0) == 1

    def test_semantic_priority_fusion(self, engine):
        """Verify high-priority detections (SURVIVOR, OBSTACLE) override FREE space."""
        # First mark cell as FREE via drone flyover
        engine.ingest_drone_pose(
            drone_id="alpha",
            lat=37.7749,
            lon=-122.4194,
            altitude_m=20.0,
        )
        origin_cell = engine._cells[(0, 0)]
        assert origin_cell.semantic_type == SemanticCellType.FREE

        # Project SURVIVOR at same origin location
        engine.ingest_semantic_observation(
            drone_id="alpha",
            latitude=37.7749,
            longitude=-122.4194,
            semantic_type_str="SURVIVOR",
            confidence=0.98,
        )
        assert origin_cell.semantic_type == SemanticCellType.SURVIVOR

        # Later drone flyover should NOT downgrade confirmed SURVIVOR back to FREE
        engine.ingest_drone_pose(
            drone_id="bravo",
            lat=37.7749,
            lon=-122.4194,
            altitude_m=20.0,
        )
        assert origin_cell.semantic_type == SemanticCellType.SURVIVOR

    def test_incremental_delta_streaming(self, engine):
        """Verify get_incremental_delta returns only dirty modified cells."""
        # Initial empty delta
        delta0 = engine.get_incremental_delta()
        assert delta0["delta_count"] == 0

        # Ingest pose
        engine.ingest_drone_pose("alpha", 37.7749, -122.4194, 20.0)
        delta1 = engine.get_incremental_delta()
        assert delta1["delta_count"] > 0
        assert len(delta1["features"]) == delta1["delta_count"]

        # Immediate next delta should be empty (since dirty set cleared)
        delta2 = engine.get_incremental_delta()
        assert delta2["delta_count"] == 0

    def test_reset_functionality(self, engine):
        """Verify reset clears world back to pristine empty state."""
        engine.ingest_drone_pose("alpha", 37.7749, -122.4194, 25.0)
        engine.ingest_semantic_observation("alpha", 37.7750, -122.4190, "BUILDING")
        assert engine.get_metrics()["total_cells"] > 0

        engine.reset_map()
        assert engine.get_metrics()["total_cells"] == 0
        assert len(engine._cells) == 0
        assert engine.origin_lat is None
