"""
Test Suite for SUTRA 7 Defensive Upgrades:
1. Failure Injection Engine
2. Mission Replay / AAR
3. Sensor Degradation Simulation
4. Ground Rescue Handoff
5. Multi-Station Charging Logistics
6. Evidence & Decision Provenance
7. Hardware Abstraction Layer (HAL)
"""

import pytest
from simulation.failure_engine import failure_engine
from mission.replay_recorder import replay_recorder
from rescue.ground_handoff import rescue_handoff_manager
from logistics.charging_stations import logistics_manager
from explainability.provenance import provenance_store
from hal.flight_controller_hal import hal_manager

def test_failure_injection_and_recovery():
    event = failure_engine.inject_failure("GPS_LOSS", "UAV-02")
    assert event.failure_type == "GPS_LOSS"
    assert event.target_drone == "UAV-02"
    assert event.detection_latency_ms > 0
    assert event.recovery_latency_ms > 0
    assert "VIO" in event.decision_policy or "Optical Flow" in event.decision_policy

    # Clear failure
    cleared = failure_engine.clear_failure("GPS_LOSS")
    assert cleared is not None
    assert not cleared.is_active

def test_sensor_degradation():
    deg = failure_engine.set_sensor_degradation(
        gps_drift_m=4.5,
        camera_obstruction_pct=45.0,
        rf_loss_pct=18.0,
    )
    assert deg.gps_drift_m == 4.5
    assert deg.camera_obstruction_pct == 45.0
    assert deg.rf_loss_pct == 18.0

def test_mission_replay_forensics():
    status = replay_recorder.get_status_dict()
    assert status["total_events"] >= 10
    events = status["events"]
    assert any("Survivor candidate detected" in e["title"] for e in events)
    assert any("Corridor invalidated" in e["title"] for e in events)
    assert any("Swarm replanned" in e["title"] for e in events)

    # Scrubber controls
    replay_recorder.set_cursor(3)
    assert replay_recorder.current_cursor_idx == 3
    replay_recorder.set_playback_speed(5.0)
    assert replay_recorder.playback_speed == 5.0

def test_ground_rescue_handoff():
    status = rescue_handoff_manager.get_status_dict()
    assert len(status["reports"]) >= 1
    rep = status["reports"][0]
    assert "SAR-ALPHA-ROOFTOP" in rep["survivor_tag"]
    assert rep["people_count"] == 3
    assert "Rooftop" in rep["access_difficulty"]
    assert "Boat" in rep["recommended_method"]

    # Dispatch ground team
    dispatched = rescue_handoff_manager.dispatch_ground_team(rep["report_id"], "NDMA 4th Battalion")
    assert dispatched is not None
    assert dispatched.dispatch_status == "DISPATCHED"
    assert dispatched.dispatched_timestamp is not None

def test_multi_station_charging_optimization():
    # Evaluate UAV-02 charging when STATION-01 has 2/2 bays occupied
    result = logistics_manager.evaluate_optimal_station(
        drone_id="UAV-02",
        drone_lat=12.9716,
        drone_lon=77.5946,
        drone_alt_m=25.0,
        drone_battery_pct=22.0,
    )
    assert result.selected_station is not None
    # STATION-01 should be REJECTED due to capacity, selecting STATION-02
    assert result.selected_station.station_id == "STATION-02"
    assert result.selected_station.available_bays > 0
    assert "STATION-01 was closer but REJECTED" in result.recommendation_reason

def test_decision_provenance():
    rec = provenance_store.record_decision(
        decision="Re-route UAV-03 to Sector Gamma",
        drone_id="UAV-03",
        reason="Obstacle detected in corridor",
        evidence="LiDAR proximity 2.8m + Optical Anomaly",
        confidence_pct=92.5,
        risk_before=84.5,
        risk_after=45.0,
        alternative_considered="Continue original path",
        rejected_because="Collision risk threshold breached",
    )
    assert rec.record_id.startswith("dec-prov-")
    assert rec.confidence_pct == 92.5
    assert rec.risk_before == 84.5

def test_hardware_abstraction_layer():
    status = hal_manager.get_status_dict()
    assert status["is_platform_agnostic"] is True
    assert "PX4" in status["supported_platforms"]
    assert "ArduPilot" in status["supported_platforms"]
    assert "Simulator" in status["supported_platforms"]

    assert hal_manager.set_platform("ArduPilot") is True
    assert hal_manager.active_platform == "ArduPilot"
    assert hal_manager.set_platform("PX4") is True
