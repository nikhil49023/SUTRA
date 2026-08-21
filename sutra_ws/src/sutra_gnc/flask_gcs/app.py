"""
SUTRA Flask Tactical Ground Control Station (GCS) & GNC Web Server
Team Offgrid — Subsystem A (GNC) & Subsystem D (GCS)
Complete Implementation with GIS, MAVLink, Replay, RBAC & AI Perception
"""

import json
import time
from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS

from gnc_engine import FlightMode, AttitudeMath, CoordinateTransform, ORCA3DAvoidance, MissionValidator
from fleet_manager import FleetManager
from ai_bridge import AIPerceptionBridge, NLPMissionAssistant
from gis_engine import GISEngine
from replay_engine import FlightReplayEngine
from security import SecurityManager, UserRole
from mavlink_bridge import MAVLinkBridge

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

# Central Core Managers
fleet = FleetManager(origin_lat=37.774929, origin_lon=-122.419416)
ai_bridge = AIPerceptionBridge(origin_lat=37.774929, origin_lon=-122.419416)
gis_engine = GISEngine(origin_lat=37.774929, origin_lon=-122.419416)
replay_engine = FlightReplayEngine()
security_manager = SecurityManager()


# ── 1. MAIN UI ROUTE ─────────────────────────────────────────────────────────
@app.route("/")
def index():
    """Serve the SUTRA Master Tactical Dashboard."""
    return render_template("index.html")


# ── 2. FLEET & TELEMETRY API ────────────────────────────────────────────────
@app.route("/api/fleet", methods=["GET"])
def get_fleet():
    """Retrieve full swarm fleet status, detections & threat analytics."""
    data = fleet.get_fleet_telemetry()
    selected_drone = fleet.get_selected_drone()
    detections = ai_bridge.get_live_detections(selected_drone.to_dict())
    threat_info = ai_bridge.compute_threat_risk_index(detections)

    data["detections"] = detections
    data["threat_info"] = threat_info
    data["operator"] = security_manager.current_user

    # Capture keyframe for replay engine
    replay_engine.record_frame(data)

    return jsonify(data)


@app.route("/api/select_drone", methods=["POST"])
def select_drone():
    """Change active drone focus in GCS."""
    body = request.get_json(force=True) or {}
    drone_id = body.get("drone_id", "drone_alpha")
    success = fleet.set_selected_drone(drone_id)
    security_manager.log_action("FOCUS_CHANGE", f"Selected UAV focus -> {drone_id}")
    return jsonify({"success": success, "selected_drone_id": fleet.selected_drone_id})


@app.route("/api/command", methods=["POST"])
def execute_command():
    """Execute GNC / PX4 flight commands with RBAC authorization."""
    body = request.get_json(force=True) or {}
    drone_id = body.get("drone_id", "selected")
    command = (body.get("command") or "").lower()

    # RBAC Authorization Check
    authorized, reason = security_manager.can_execute(command)
    if not authorized:
        return jsonify({"success": False, "error": reason}), 403

    # Target resolution
    if drone_id == "all":
        targets = list(fleet.drones.values())
    elif drone_id == "selected":
        targets = [fleet.get_selected_drone()]
    else:
        d = fleet.get_drone(drone_id)
        targets = [d] if d else []

    if not targets:
        return jsonify({"success": False, "error": f"Drone '{drone_id}' not found"}), 404

    msg = f"Executed {command.upper()}"
    with fleet.lock:
        for drone in targets:
            if command == "arm":
                drone.arm()
            elif command == "disarm":
                drone.disarm()
            elif command == "takeoff":
                drone.set_mode(FlightMode.TAKEOFF)
            elif command == "rtl":
                drone.set_mode(FlightMode.RTL)
            elif command == "land":
                drone.set_mode(FlightMode.LAND)
            elif command == "loiter":
                drone.set_mode(FlightMode.LOITER)
            elif command == "emergency":
                drone.set_mode(FlightMode.EMERGENCY)
            elif command == "nav":
                drone.set_mode(FlightMode.WAYPOINT_NAV)

    security_manager.log_action("FLIGHT_CMD", f"Dispatched '{command.upper()}' to {len(targets)} UAV(s)")
    return jsonify({"success": True, "message": msg, "target_count": len(targets)})


# ── 3. MISSION PLANNER & VALIDATION ─────────────────────────────────────────
@app.route("/api/mission/validate", methods=["POST"])
def validate_mission_route():
    """Run pre-flight validation against geofence, battery reserve & ceilings."""
    body = request.get_json(force=True) or {}
    waypoints = body.get("waypoints", [])
    selected = fleet.get_selected_drone()

    report = MissionValidator.validate_mission(
        waypoints=waypoints,
        home_lat=selected.home_lat,
        home_lon=selected.home_lon,
        battery_pct=selected.battery_pct,
        max_geofence_m=selected.geofence_max_radius_m
    )
    return jsonify(report)


@app.route("/api/waypoints", methods=["POST"])
def set_waypoints():
    """Upload and dispatch waypoint mission."""
    body = request.get_json(force=True) or {}
    drone_id = body.get("drone_id", fleet.selected_drone_id)
    waypoints = body.get("waypoints", [])
    auto_start = body.get("auto_start", False)

    # Permission check
    authorized, reason = security_manager.can_execute("WAYPOINTS")
    if not authorized:
        return jsonify({"success": False, "error": reason}), 403

    drone = fleet.get_drone(drone_id)
    if not drone:
        return jsonify({"success": False, "error": "Drone not found"}), 404

    # Validation
    val_report = MissionValidator.validate_mission(
        waypoints, drone.home_lat, drone.home_lon, drone.battery_pct, drone.geofence_max_radius_m
    )
    if not val_report["valid"]:
        return jsonify({"success": False, "error": val_report["error"]}), 400

    with fleet.lock:
        drone.add_waypoints(waypoints)
        if auto_start and waypoints:
            drone.arm()
            drone.set_mode(FlightMode.WAYPOINT_NAV)

    security_manager.log_action("MISSION_UPLOAD", f"Uploaded {len(waypoints)} waypoints to {drone.name}")
    return jsonify({
        "success": True,
        "drone_id": drone_id,
        "waypoint_count": len(waypoints),
        "validation": val_report,
        "message": f"Successfully uploaded {len(waypoints)} waypoints to {drone.name}"
    })


# ── 4. SWARM FORMATIONS & COORDINATION ──────────────────────────────────────
@app.route("/api/formation", methods=["POST"])
def set_formation():
    """Trigger coordinated swarm formation flight."""
    body = request.get_json(force=True) or {}
    formation = body.get("formation", "V_FORMATION")
    center_lat = float(body.get("center_lat", fleet.origin_lat))
    center_lon = float(body.get("center_lon", fleet.origin_lon))
    altitude = float(body.get("altitude", 20.0))

    fleet.apply_swarm_formation(formation, center_lat, center_lon, altitude)
    security_manager.log_action("SWARM_DISPATCH", f"Swarm dispatched into {formation} pattern")
    return jsonify({
        "success": True,
        "formation": formation,
        "message": f"Swarm dispatched into {formation} pattern at {altitude}m AGL"
    })


# ── 5. GIS, TERRAIN & RF LINE-OF-SIGHT ───────────────────────────────────────
@app.route("/api/gis/elevation_profile", methods=["POST"])
def get_elevation():
    """Return terrain elevation profile between two geodetic coordinates."""
    body = request.get_json(force=True) or {}
    selected = fleet.get_selected_drone()
    start_lat = float(body.get("start_lat", selected.home_lat))
    start_lon = float(body.get("start_lon", selected.home_lon))
    end_lat = float(body.get("end_lat", selected.lat))
    end_lon = float(body.get("end_lon", selected.lon))

    profile = gis_engine.get_elevation_profile(start_lat, start_lon, end_lat, end_lon)
    return jsonify({"profile": profile})


@app.route("/api/gis/rf_los", methods=["GET", "POST"])
def get_rf_los():
    """Compute RF Line-of-Sight and Fresnel zone clearance to selected drone."""
    selected = fleet.get_selected_drone()
    res = gis_engine.compute_rf_los(
        gcs_lat=fleet.origin_lat,
        gcs_lon=fleet.origin_lon,
        gcs_alt_msl=45.0,
        drone_lat=selected.lat,
        drone_lon=selected.lon,
        drone_alt_msl=selected.alt_msl,
        freq_ghz=2.4
    )
    return jsonify(res)


@app.route("/api/gis/weather", methods=["GET"])
def get_weather():
    """Return atmospheric weather and wind vectors."""
    return jsonify(gis_engine.get_weather_conditions())


# ── 6. MAVLINK & QGC PLAN CONVERTER ─────────────────────────────────────────
@app.route("/api/mavlink/export_plan", methods=["POST"])
def export_plan():
    """Export waypoints to QGroundControl .plan JSON format."""
    body = request.get_json(force=True) or {}
    waypoints = body.get("waypoints", [])
    plan_json = MAVLinkBridge.export_qgc_plan(waypoints)
    return Response(plan_json, mimetype="application/json")


@app.route("/api/mavlink/import_plan", methods=["POST"])
def import_plan():
    """Import QGroundControl .plan JSON into waypoints."""
    body = request.get_json(force=True) or {}
    plan_str = body.get("plan_json", "{}")
    waypoints = MAVLinkBridge.import_qgc_plan(plan_str)
    return jsonify({"success": True, "waypoints": waypoints, "count": len(waypoints)})


@app.route("/api/mavlink/inspect", methods=["GET"])
def inspect_mavlink():
    """Return raw simulated MAVLink v2 telemetry frame for protocol debugging."""
    selected = fleet.get_selected_drone()
    frames = MAVLinkBridge.generate_mavlink_frames(selected.to_dict(), sys_id=1)
    return jsonify(frames)


# ── 7. BLACKBOX FLIGHT REPLAY & LOGGING ─────────────────────────────────────
@app.route("/api/replay/state", methods=["GET"])
def get_replay_state():
    return jsonify({
        "is_recording": replay_engine.is_recording,
        "is_replaying": replay_engine.is_replaying,
        "current_frame": replay_engine.current_frame_idx,
        "total_frames": len(replay_engine.keyframes),
        "speed": replay_engine.playback_speed
    })


@app.route("/api/replay/control", methods=["POST"])
def control_replay():
    body = request.get_json(force=True) or {}
    action = body.get("action")
    if action == "start":
        replay_engine.start_replay()
    elif action == "stop":
        replay_engine.stop_replay()
    elif action == "seek":
        idx = int(body.get("frame_idx", 0))
        replay_engine.seek_frame(idx)
    elif action == "speed":
        replay_engine.playback_speed = float(body.get("speed", 1.0))

    return jsonify({"success": True, "action": action})


@app.route("/api/replay/export", methods=["GET"])
def export_flight_log():
    log_json = replay_engine.export_gcslog("SUTRA_SAR_OPERATION")
    return Response(log_json, mimetype="application/json")


# ── 8. SECURITY & RBAC ──────────────────────────────────────────────────────
@app.route("/api/security/user", methods=["GET"])
def get_user():
    return jsonify(security_manager.current_user)


@app.route("/api/security/switch_user", methods=["POST"])
def switch_user():
    body = request.get_json(force=True) or {}
    callsign = body.get("callsign", "OPERATOR")
    role = body.get("role", "OPERATOR")
    user = security_manager.switch_user(callsign, role)
    return jsonify({"success": True, "user": user})


@app.route("/api/security/audit_logs", methods=["GET"])
def get_audit_logs():
    return jsonify({"logs": security_manager.get_audit_logs()})


# ── 9. CAMERA FEED & NLP ────────────────────────────────────────────────────
@app.route("/api/camera/mode", methods=["POST"])
def switch_camera():
    body = request.get_json(force=True) or {}
    mode = body.get("mode", "RGB_GIMBAL")
    active_mode = ai_bridge.set_camera_mode(mode)
    return jsonify({"success": True, "camera_mode": active_mode})


@app.route("/api/nlp", methods=["POST"])
def nlp_command():
    """Process natural language voice/text tactical command."""
    body = request.get_json(force=True) or {}
    prompt = body.get("prompt", "")
    parsed = NLPMissionAssistant.parse_command(prompt)

    action = parsed.get("action")
    target = parsed.get("target")

    if action == "EMERGENCY_STOP":
        fleet.emergency_stop_all()
    elif action == "RTL":
        if target == "ALL":
            fleet.rtl_all()
        else:
            fleet.get_selected_drone().set_mode(FlightMode.RTL)
    elif action == "TAKEOFF":
        alt = parsed.get("altitude", 15.0)
        if target == "ALL":
            fleet.takeoff_all(alt)
        else:
            fleet.get_selected_drone().set_mode(FlightMode.TAKEOFF)
    elif action == "ARM":
        if target == "ALL":
            fleet.arm_all()
        else:
            fleet.get_selected_drone().arm()
    elif action == "LAND":
        if target == "ALL":
            for d in fleet.drones.values():
                d.set_mode(FlightMode.LAND)
        else:
            fleet.get_selected_drone().set_mode(FlightMode.LAND)
    elif action == "FORMATION":
        formation = parsed.get("formation", "GRID_SEARCH")
        selected = fleet.get_selected_drone()
        fleet.apply_swarm_formation(formation, selected.lat, selected.lon, 20.0)

    security_manager.log_action("NLP_CMD", f"NLP: '{prompt}' -> {action}")
    return jsonify({"success": True, "parsed": parsed, "fleet": fleet.get_fleet_telemetry()})


# ── 10. REAL-TIME SERVER-SENT EVENTS (SSE) STREAM ────────────────────────────
@app.route("/api/telemetry/stream")
def telemetry_stream():
    """10 Hz Server-Sent Events stream for telemetry, PFD, and live MAVLink frames."""
    def event_stream():
        while True:
            if replay_engine.is_replaying:
                frame = replay_engine.step_replay()
                if frame:
                    yield f"data: {json.dumps(frame['fleet'])}\n\n"
            else:
                data = fleet.get_fleet_telemetry()
                selected = fleet.get_selected_drone()
                detections = ai_bridge.get_live_detections(selected.to_dict())
                threat_info = ai_bridge.compute_threat_risk_index(detections)
                mavlink_frame = MAVLinkBridge.generate_mavlink_frames(selected.to_dict())

                data["detections"] = detections
                data["threat_info"] = threat_info
                data["mavlink"] = mavlink_frame
                data["operator"] = security_manager.current_user

                replay_engine.record_frame(data)
                yield f"data: {json.dumps(data)}\n\n"

            time.sleep(0.1)

    return Response(event_stream(), mimetype="text/event-stream")


if __name__ == "__main__":
    print("\n" + "=" * 76)
    print("🚁 SUTRA TACTICAL GROUND CONTROL STATION & GNC ENGINE (FLASK PYTHON)")
    print("=" * 76)
    print("📡 Local Web Dashboard: http://localhost:5000")
    print("🕹️ 4-Drone Swarm Physics Simulation: Active (20 Hz loop)")
    print("🛡️ Gate G5 ORCA 3D Safety Buffer: Active (> 2.8m)")
    print("🌐 GIS Elevation & RF Line-of-Sight Analyzer: Ready")
    print("📼 Blackbox Flight Replay Recorder: Ready")
    print("🔒 4-Tier Role-Based Access Control (RBAC): Ready")
    print("=" * 76 + "\n")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
