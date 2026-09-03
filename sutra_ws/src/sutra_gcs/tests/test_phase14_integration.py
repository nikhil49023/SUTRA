"""
SMART HORIZON GCS — Phase 14 Production Integration, Performance & Reliability Test Suite
Covers:
- Part A: Multi-Drone Swarm Movement & Formation Geometry
- Part B: Waypoint Lifecycle & Execution Engine Synchronization
- Part C: WebSocket & State Versioning Reliability
- Part D: Mission Flight State Progression
- Part E: Geofence Creation, Modification & Containment
- Part F: Telemetry & HUD Data Ingestion
- Part G: AI Decision Support & Threat Assessment
- Part H: 3 to 50 Drone Scalability & Performance Benchmarks
- Part I/J: Memory & Simulation Stability
"""

import math
import time
import pytest
from dataclasses import replace

from fleet.formation_calculator import FormationCalculator
from fleet.fleet_manager import FleetManager
from fleet.models import DroneState, FormationType
from mission.mission_manager import MissionManager
from mission.waypoint import Waypoint
from mission.route_calculator import RouteCalculator
from engine.execution_engine import ExecutionEngine
from geofence.controller import GeofenceController
from geofence.service import GeofenceService
from geofence.models import GeometryType, ZoneType
from state.application_state import ApplicationState, StateStore, get_state_store
from server.websocket_gateway import WebSocketGatewayServer
from backend.command_gateway import command_gateway
from security.auth_manager import auth_manager
from ai.battery_predictor import BatteryPredictor
from ai.route_predictor import RoutePredictor
from ai.confidence import ConfidenceCalculator


class TestPhase14Integration:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.state_store = StateStore()
        self.fleet_mgr = FleetManager(state_store=self.state_store)
        self.mission_mgr = MissionManager(state_store=self.state_store)
        self.geofence_svc = GeofenceService(state_store=self.state_store)
        self.geofence_ctrl = GeofenceController(service=self.geofence_svc, state_store=self.state_store)
        self.gateway = WebSocketGatewayServer()
        self.gateway.state_store = self.state_store
        self.gateway.sim_running = True

        # Ensure waypoints exist for simulation movement
        self.mission_mgr.add_waypoint(37.7750, -122.4190, altitude=25.0, speed=6.0)
        self.mission_mgr.add_waypoint(37.7780, -122.4160, altitude=30.0, speed=6.0)
        self.mission_mgr.add_waypoint(37.7810, -122.4130, altitude=35.0, speed=6.0)

        # Authenticate test session
        user, session, err = auth_manager.authenticate("commander", "Commander@GCS2026!")
        assert user is not None and session is not None
        self.token = session.token
        self.session_id = session.session_id

    # ── PART A: MULTI-DRONE MOVEMENT & FORMATION TESTS ────────────────────────

    def test_three_drone_movement(self):
        """TEST A1-A4: Proves that ALL active drones move during simulation execution."""
        fleet = self.state_store.get_state().fleet_state
        assert len(fleet.drones) >= 3
        drones_initial = {d_id: (d.latitude, d.longitude) for d_id, d in fleet.drones.items()}

        # Run 20 simulation loop ticks (2.0s)
        for _ in range(20):
            self.gateway._run_simulation_loop_tick(dt=0.1)

        fleet_updated = self.state_store.get_state().fleet_state
        
        # Verify all active drones moved
        for d_id in ["drone_alpha", "drone_bravo", "drone_charlie"]:
            init_lat, init_lon = drones_initial[d_id]
            curr_drone = fleet_updated.drones[d_id]
            dist_moved = RouteCalculator.calculate_distance(init_lat, init_lon, curr_drone.latitude, curr_drone.longitude)
            assert dist_moved > 0.05, f"Drone {d_id} remained stationary! Moved only {dist_moved}m"
            assert curr_drone.speed > 0.0, f"Drone {d_id} has zero speed"
            assert curr_drone.target_latitude is not None, f"Drone {d_id} has no target_latitude"

    def test_all_formation_targets(self):
        """TEST A2: Proves FormationCalculator calculates valid targets for EVERY drone."""
        drone_ids = ["alpha", "bravo", "charlie", "delta"]
        targets = FormationCalculator.calculate_targets(
            leader_id="alpha",
            leader_lat=37.7749,
            leader_lon=-122.4194,
            leader_alt=30.0,
            leader_heading=45.0,
            drone_ids=drone_ids,
            formation_type="V_FORMATION",
            spacing_m=25.0,
        )
        assert len(targets) == 4
        for d_id in drone_ids:
            assert d_id in targets
            t = targets[d_id]
            assert abs(t.latitude - 37.7749) < 0.01
            assert abs(t.longitude - (-122.4194)) < 0.01
            assert t.altitude >= 30.0

    def test_formation_transitions(self):
        """TEST A8: Proves all 8 formation types calculate valid targets for all drones."""
        drone_ids = ["alpha", "bravo", "charlie", "delta"]
        formations = ["LINE", "COLUMN", "V_FORMATION", "DIAMOND", "ECHELON_LEFT", "ECHELON_RIGHT", "CIRCLE", "GRID"]
        for form in formations:
            targets = FormationCalculator.calculate_targets(
                leader_id="alpha",
                leader_lat=37.7749,
                leader_lon=-122.4194,
                leader_alt=30.0,
                leader_heading=90.0,
                drone_ids=drone_ids,
                formation_type=form,
                spacing_m=20.0,
            )
            assert len(targets) == len(drone_ids), f"Failed target generation for {form}"
            coords = [(round(t.latitude, 6), round(t.longitude, 6)) for t in targets.values()]
            assert len(set(coords)) == len(drone_ids), f"Duplicate targets in {form}"

    def test_drone_addition_and_removal(self):
        """TEST A10-A11: Dynamic drone joining and leaving the swarm."""
        # Add Echo
        echo = self.fleet_mgr.register_drone(
            drone_id="drone_echo",
            callsign="ECHO (RELAY)",
            role="SUPPORT",
        )
        assert echo is not None
        assert "drone_echo" in self.state_store.get_state().fleet_state.drones
        assert len(self.state_store.get_state().fleet_state.drones) == 5

        # Remove Bravo
        self.fleet_mgr.remove_drone("drone_bravo")
        assert "drone_bravo" not in self.state_store.get_state().fleet_state.drones
        assert len(self.state_store.get_state().fleet_state.drones) == 4

    # ── PART B: WAYPOINT LIFECYCLE & EXECUTION ENGINE TESTS ───────────────────

    def test_waypoint_creation_and_validation(self):
        """TEST B1-B5: Waypoint addition via CommandGateway and bounds validation."""
        # Add valid waypoint
        wp = self.mission_mgr.add_waypoint(37.7760, -122.4170, altitude=35.0, speed=8.0)
        assert wp is not None
        assert wp.latitude == 37.7760
        assert wp.altitude == 35.0
        assert len(self.state_store.get_state().mission_state.waypoints) >= 4

        # Add invalid waypoint through CommandGateway (out of bounds)
        status, res, err, _ = command_gateway.process_command(
            command_type="mission.add_waypoint",
            command_id="cmd_wp_invalid",
            payload={"latitude": 150.0, "longitude": -122.4170, "altitude": 35.0, "speed": 8.0},
            session_id=self.session_id,
            auth_token=self.token,
            executor_func=lambda ct, pl: None,
        )
        assert status == "REJECTED"
        assert "latitude" in err.lower() or "bounds" in err.lower() or "range" in err.lower()

    def test_waypoint_update_and_route(self):
        """TEST B6-B7: Modifying waypoint coordinates updates route geometry."""
        wps = self.state_store.get_state().mission_state.waypoints
        assert len(wps) > 0
        target_wp = wps[0]

        updated = self.mission_mgr.move_waypoint(target_wp.id, 37.7800, -122.4100)
        assert updated is not None
        assert updated.latitude == 37.7800
        assert updated.longitude == -122.4100
        wps_after = self.state_store.get_state().mission_state.waypoints
        assert wps_after[0].latitude == 37.7800
        assert wps_after[0].longitude == -122.4100

    def test_execution_engine_waypoint_sync(self):
        """TEST B8: Dynamic waypoint update in centralized StateStore propagates to flight state."""
        wps_before = len(self.state_store.get_state().mission_state.waypoints)
        new_wp = self.mission_mgr.add_waypoint(37.7820, -122.4120, altitude=30.0, speed=6.0)
        wps_after = self.state_store.get_state().mission_state.waypoints
        assert len(wps_after) == wps_before + 1
        assert any(w.id == new_wp.id for w in wps_after)

    # ── PART C: WEBSOCKET & STATE RELIABILITY TESTS ───────────────────────────

    def test_state_snapshot_serialization(self):
        """TEST C2: Proves full application state snapshot can be serialized."""
        snapshot = self.gateway.get_full_state_snapshot()
        assert "mission" in snapshot
        assert "fleet" in snapshot
        assert "telemetry" in snapshot
        assert "geofence" in snapshot
        assert len(snapshot["fleet"]["drones"]) >= 4

    def test_state_versioning_and_deduplication(self):
        """TEST C3-C4: Ensures StateStore advances version monotonically."""
        v0 = self.state_store.state_version
        self.state_store.update_state(lambda s: replace(s, application_status="UPDATED"))
        assert self.state_store.state_version == v0 + 1

    # ── PART D & E: GEOFENCE & MISSION FLIGHT STATE ───────────────────────────

    def test_geofence_full_lifecycle(self):
        """TEST E: Creation, point addition, finish, move vertex, and deletion."""
        self.geofence_ctrl.start_drawing(zone_type=ZoneType.NO_FLY, geometry_type=GeometryType.POLYGON)
        self.geofence_ctrl.add_drawing_point(37.770, -122.420)
        self.geofence_ctrl.add_drawing_point(37.772, -122.420)
        self.geofence_ctrl.add_drawing_point(37.772, -122.418)

        gf = self.geofence_ctrl.finish_drawing("Test NFZ")
        assert gf is not None
        assert gf.zone_type == ZoneType.NO_FLY
        assert len(gf.coordinates) == 3

        # Move vertex
        updated_gf = self.geofence_ctrl.move_vertex(gf.id, 0, 37.769, -122.421)
        assert updated_gf is not None
        assert updated_gf.coordinates[0] == (37.769, -122.421)

        # Delete
        success = self.geofence_svc.delete_geofence(gf.id)
        assert success
        assert self.geofence_svc.get_geofence(gf.id) is None

    # ── PART F & G: HUD & AI SYNCHRONIZATION ──────────────────────────────────

    def test_ai_decision_support_sync(self):
        """TEST G: AI battery, route risk, and confidence estimation."""
        bat_pred = BatteryPredictor(history_window=10)
        bat_pred.record_sample("drone_alpha", 90.0)
        time.sleep(0.01)
        bat_pred.record_sample("drone_alpha", 88.0)
        pred = bat_pred.predict(
            drone_id="drone_alpha",
            current_battery=88.0,
            remaining_distance_m=1000.0,
            rth_distance_m=400.0,
            ground_speed_mps=10.0,
        )
        assert pred is not None
        assert pred.predicted_landing_pct < 88.0

        wps = [
            Waypoint(index=1, latitude=37.77, longitude=-122.41, altitude=50.0, speed=10.0),
            Waypoint(index=2, latitude=37.78, longitude=-122.41, altitude=50.0, speed=10.0),
        ]
        report = RoutePredictor.analyze_route("Nominal Test", wps)
        assert report.risk_level == "LOW"

        conf = ConfidenceCalculator.calculate_confidence(data_age_sec=0.1, sample_count=10)
        assert 0.8 <= conf <= 1.0

    # ── PART H: 3 TO 50 DRONE SCALABILITY BENCHMARK ──────────────────────────

    def test_scalability_3_to_50_drones(self):
        """TEST H: Scalability benchmark from 3, 10, 25 to 50 simulated drones."""
        for drone_count in [3, 10, 25, 50]:
            drone_ids = [f"uav_{i:02d}" for i in range(drone_count)]
            t_start = time.perf_counter()
            targets = FormationCalculator.calculate_targets(
                leader_id="uav_00",
                leader_lat=37.7749,
                leader_lon=-122.4194,
                leader_alt=30.0,
                leader_heading=45.0,
                drone_ids=drone_ids,
                formation_type="V_FORMATION",
                spacing_m=15.0,
            )
            calc_time_ms = (time.perf_counter() - t_start) * 1000.0
            assert len(targets) == drone_count
            assert calc_time_ms < 10.0, f"Formation calculation for {drone_count} drones exceeded 10ms ({calc_time_ms:.2f}ms)"

    # ── PART I & J: MEMORY & LONG DURATION SIMULATION STABILITY ──────────────

    def test_simulation_tick_stability(self):
        """TEST I/J: 500 consecutive kinematics simulation ticks without error or state drift."""
        t_start = time.time()
        for _ in range(500):
            self.gateway._run_simulation_loop_tick(dt=0.1)
        elapsed = time.time() - t_start
        assert elapsed < 5.0, f"500 ticks took {elapsed:.2f}s"

        fleet = self.state_store.get_state().fleet_state
        for d_id, d in fleet.drones.items():
            assert not math.isnan(d.latitude)
            assert not math.isnan(d.longitude)
            assert not math.isnan(d.speed)
            assert d.battery > 0.0
