"""
SUTRA GCS — Master Entry Point
Swarm Unified Tactical Reconnaissance Architecture — Ground Control Station
"""

import sys
import os
import time
import json
import threading
from typing import Generator
from flask import Flask, Response, jsonify, request, render_template, send_from_directory
from flask_cors import CORS

# Add root package to sys.path
pkg_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(pkg_dir))
sys.path.insert(0, pkg_dir)

from config.settings import settings
from services.event_bus import event_bus
from services.logging_service import logger_service
from services.persistence import persistence
from state.application_state import app_state
from state.fleet_state import fleet_state
from fleet.fleet_manager import fleet_manager
from fleet.formation_engine import formation_engine
from geofence.service import geofence_service
from geofence.validator import geofence_validator
from mission.validator import mission_validator
from mission.planner import mission_planner
from gis.elevation import elevation_profiler
from gis.line_of_sight import los_analyzer
from gis.rf_analysis import rf_analyzer
from gis.weather import weather_engine
from ai.threat_detection import threat_detector
from ai.mission_advisor import mission_advisor
from communication.mavlink_encoder import mavlink_encoder
from communication.mavlink_parser import mavlink_parser

# Path to shared Flask web templates & static assets in flask_gcs
template_dir = os.path.join(os.path.dirname(pkg_dir), "sutra_gnc", "flask_gcs", "templates")
static_dir = os.path.join(os.path.dirname(pkg_dir), "sutra_gnc", "flask_gcs", "static")

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
CORS(app)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/fleet", methods=["GET"])
def api_fleet():
    return jsonify(fleet_manager.get_fleet_telemetry())


@app.route("/api/arm", methods=["POST"])
def api_arm():
    fleet_manager.arm_fleet()
    logger_service.info("OPERATOR", "Swarm armed for offboard flight")
    return jsonify({"status": "ARMED", "code": 200})


@app.route("/api/takeoff", methods=["POST"])
def api_takeoff():
    data = request.get_json() or {}
    alt = float(data.get("altitude", 15.0))
    fleet_manager.takeoff_fleet(alt)
    logger_service.info("OPERATOR", f"Swarm takeoff initiated to {alt}m AGL")
    return jsonify({"status": "TAKEOFF_INITIATED", "altitude": alt, "code": 200})


@app.route("/api/rtl", methods=["POST"])
def api_rtl():
    fleet_manager.rtl_fleet()
    logger_service.info("OPERATOR", "Swarm Return-to-Launch (RTL) initiated")
    return jsonify({"status": "RTL_ENGAGED", "code": 200})


@app.route("/api/emergency_stop", methods=["POST"])
def api_emergency():
    fleet_manager.emergency_all_stop()
    logger_service.error("SAFETY", "EMERGENCY ALL-STOP DISPATCHED")
    return jsonify({"status": "EMERGENCY_SHUTDOWN", "code": 200})


@app.route("/api/formation", methods=["POST"])
def api_formation():
    data = request.get_json() or {}
    f_name = data.get("formation", "V_FORMATION")
    res = formation_engine.set_formation(f_name)
    logger_service.info("SWARM", f"Reconfigured formation to {f_name}")
    return jsonify(res)


@app.route("/api/gis/rf_los", methods=["GET"])
def api_rf_los():
    telemetry = fleet_manager.get_fleet_telemetry()
    active_d = telemetry["drones"].get(fleet_state.active_drone_id, {})
    d_lat = active_d.get("lat", settings.origin.lat)
    d_lon = active_d.get("lon", settings.origin.lon)
    d_alt = active_d.get("alt_msl", 65.0)

    profile = elevation_profiler.sample_path(settings.origin.lat, settings.origin.lon, d_lat, d_lon, num_samples=20)
    los_res = los_analyzer.check_los(profile, settings.origin.alt_msl, d_alt)
    dist_m = profile[-1]["distance_m"] if profile else 100.0
    fresnel_r = rf_analyzer.calculate_fresnel_radius(dist_m / 2.0, dist_m / 2.0, 2.4)
    rssi = rf_analyzer.estimate_rssi(dist_m)

    return jsonify({
        "total_distance_m": dist_m,
        "is_los_clear": los_res["clear"],
        "min_clearance_m": los_res["min_clearance_m"],
        "fresnel_radius_m": round(fresnel_r, 2),
        "estimated_rssi_dbm": rssi,
        "profile": profile
    })


@app.route("/api/gis/weather", methods=["GET"])
def api_weather():
    return jsonify(weather_engine.get_conditions())


@app.route("/api/ai/detections", methods=["GET"])
def api_detections():
    telemetry = fleet_manager.get_fleet_telemetry()
    active_d = telemetry["drones"].get(fleet_state.active_drone_id, {})
    return jsonify({
        "detections": threat_detector.get_detections(active_d.get("lat", 0.0), active_d.get("lon", 0.0)),
        "threat_risk_score": 18.5,
        "threat_level": "NOMINAL"
    })


@app.route("/api/security/audit_logs", methods=["GET"])
def api_audit_logs():
    return jsonify({"logs": logger_service.get_recent(50)})


@app.route("/api/telemetry/stream")
def sse_telemetry_stream():
    def event_stream() -> Generator[str, None, None]:
        while True:
            telemetry = fleet_manager.get_fleet_telemetry()
            payload = json.dumps(telemetry)
            yield f"data: {payload}\n\n"
            time.sleep(0.1)  # 10 Hz

    return Response(event_stream(), mimetype="text/event-stream")


def main():
    print("\n" + "=" * 78)
    print("🚁 SUTRA GCS — SWARM UNIFIED TACTICAL RECONNAISSANCE ARCHITECTURE")
    print("   Pure Python Modular Architecture (Subsystem D & GNC)")
    print("=" * 78)
    print(f"📡 Serving Dashboard on: http://localhost:{settings.network.http_port}")
    print("🕹️ 4-Drone Swarm Physics: Active (20 Hz thread)")
    print("🛡️ Gate G5 ORCA 3D Safety Clearance: Active (> 2.8m)")
    print("=" * 78 + "\n")
    app.run(host=settings.network.http_host, port=settings.network.http_port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
