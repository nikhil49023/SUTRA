# 🚁 SUTRA GCS — 14-Stage Engineering & Architecture Specification

**Subsystem D:** Master Tactical Ground Control Station  
**Platform:** Python 3.12, Flask 3.1, Leaflet GIS 1.9, HTML5 Canvas 60 FPS  
**Verification:** 100% PyTest Automated Suite (9/9 Suites Passing)

---

## 🏛️ 14-Stage Implementation Pipeline

```
1. Python Project Foundation
        ↓
2. State Management
        ↓
3. Event Bus
        ↓
4. Main Dashboard
        ↓
5. Map
        ↓
6. Waypoints
        ↓
7. Geofence
        ↓
8. Mission Engine
        ↓
9. Multiple Drones
        ↓
10. Formation Engine
        ↓
11. WebSocket + MAVLink
        ↓
12. HUD
        ↓
13. AI / GIS
        ↓
14. Production Hardening
```

---

### Stage 1: Python Project Foundation
- **Package:** `sutra_gcs` / `sutra_ws/src/sutra_gcs`
- **Config:** [`config/settings.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/config/settings.py)
- **Launchers:** [`main.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/main.py), [`run_flask_gcs.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/run_flask_gcs.py)
- **Features:** Clean modular namespace, zero JavaScript build dependencies, native Flask 3.1 / NumPy / Werkzeug stack.

### Stage 2: State Management
- **Modules:** [`state/application_state.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/state/application_state.py), [`state/telemetry_state.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/state/telemetry_state.py), [`state/mission_state.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/state/mission_state.py), [`state/fleet_state.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/state/fleet_state.py), [`state/map_state.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/state/map_state.py), [`state/alert_state.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/state/alert_state.py)
- **Features:** Reactive state stores for active operator, high-rate IMU/GPS buffers, waypoint queues, swarm membership, and active alarms.

### Stage 3: Event Bus
- **Module:** [`services/event_bus.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/services/event_bus.py)
- **Features:** Thread-safe asynchronous publish-subscribe broker for `TELEMETRY_UPDATED`, `GEOFENCE_BREACH`, `WAYPOINT_ADVANCED`, `MISSION_COMPLETED`, and `EMERGENCY_STOP`.

### Stage 4: Main Dashboard
- **Modules:** [`ui/dashboard.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/dashboard.py), [`ui/top_bar.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/top_bar.py), [`ui/left_sidebar.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/left_sidebar.py), [`ui/right_inspector.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/right_inspector.py), [`ui/bottom_console.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/bottom_console.py)
- **Features:** 3-Column tactical grid layout with header call-signs, navigation tab bar, live telemetry cards, and scrolling system logs.

### Stage 5: Map
- **Modules:** [`map/map_widget.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/map/map_widget.py), [`map/layer_manager.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/map/layer_manager.py), [`map/drone_renderer.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/map/drone_renderer.py), [`map/route_renderer.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/map/route_renderer.py)
- **Features:** Leaflet GIS integration with multi-layer basemaps (CartoDB Dark, Esri Satellite, OpenTopo, Street), rotating SVG drone markers, and real-time flight breadcrumb trails.

### Stage 6: Waypoints
- **Modules:** [`mission/models.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/mission/models.py), [`map/waypoint_renderer.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/map/waypoint_renderer.py)
- **Features:** 3D Waypoint model (Lat, Lon, Alt, Speed, Action), interactive click-to-add, table editor, and 1.8m waypoint arrival acceptance radius.

### Stage 7: Geofence
- **Modules:** [`geofence/models.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/geofence/models.py), [`geofence/geometry.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/geofence/geometry.py), [`geofence/validator.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/geofence/validator.py), [`geofence/controller.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/geofence/controller.py), [`geofence/renderer.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/geofence/renderer.py)
- **Features:** 500m circular inclusion boundaries & polygon ray-casting PIP validator, real-time safety interlock triggering automatic RTL on breach.

### Stage 8: Mission Engine
- **Modules:** [`mission/planner.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/mission/planner.py), [`mission/validator.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/mission/validator.py), [`mission/battery_estimator.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/mission/battery_estimator.py), [`mission/risk_engine.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/mission/risk_engine.py), [`mission/route_optimizer.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/mission/route_optimizer.py), [`mission/execution_engine.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/mission/execution_engine.py), [`mission/mission_timeline.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/mission/mission_timeline.py)
- **Features:** Lawnmower search grid generator, pre-flight safety audit enforcing $\ge 25\%$ battery RTL reserve, Bezier route smoothing, and milestone timeline tracker.

### Stage 9: Multiple Drones
- **Modules:** [`fleet/drone.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/fleet/drone.py), [`fleet/fleet_manager.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/fleet/fleet_manager.py)
- **Features:** 4-Drone Swarm coordinator (Alpha, Bravo, Charlie, Delta) with a thread-safe 20Hz physics simulation worker loop.

### Stage 10: Formation Engine
- **Modules:** [`fleet/formation_calculator.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/fleet/formation_calculator.py), [`fleet/formation_animator.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/fleet/formation_animator.py), [`fleet/formation_engine.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/fleet/formation_engine.py), [`fleet/collision_avoidance.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/fleet/collision_avoidance.py)
- **Features:** V-Formation Wedge, SAR Grid, Perimeter Box geometry, smooth setpoint interpolation, and **Gate G5 Verified ORCA 3D collision avoidance** guaranteeing $> 2.8\text{m}$ clearance.

### Stage 11: WebSocket + MAVLink
- **Modules:** [`communication/websocket_manager.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/communication/websocket_manager.py), [`communication/heartbeat.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/communication/heartbeat.py), [`communication/telemetry_stream.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/communication/telemetry_stream.py), [`communication/mavlink_parser.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/communication/mavlink_parser.py), [`communication/mavlink_encoder.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/communication/mavlink_encoder.py), [`communication/reconnect_manager.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/communication/reconnect_manager.py)
- **Features:** 10Hz SSE stream, MAVLink v2 encoder/parser, QGroundControl `.plan` JSON converter, link loss watchdog timer, and auto-reconnect backoff.

### Stage 12: HUD
- **Modules:** [`ui/hud/primary_flight_display.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/hud/primary_flight_display.py), [`ui/hud/artificial_horizon.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/hud/artificial_horizon.py), [`ui/hud/pitch_ladder.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/hud/pitch_ladder.py), [`ui/hud/compass.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/hud/compass.py), [`ui/hud/altimeter.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/hud/altimeter.py), [`ui/hud/speed_indicator.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/hud/speed_indicator.py), [`ui/hud/battery_gauge.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/hud/battery_gauge.py), [`ui/hud/gps_panel.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/hud/gps_panel.py), [`ui/hud/warning_strip.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ui/hud/warning_strip.py)
- **Features:** 60 FPS HTML5 Canvas Artificial Horizon, gyro roll/pitch ladders, magnetic compass tape, altitude/speed indicators, and master warning banner.

### Stage 13: AI / GIS
- **Modules:** [`ai/threat_detection.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ai/threat_detection.py), [`ai/target_tracker.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ai/target_tracker.py), [`ai/mission_advisor.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ai/mission_advisor.py), [`ai/sensor_fusion.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/ai/sensor_fusion.py), [`gis/terrain.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/gis/terrain.py), [`gis/elevation.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/gis/elevation.py), [`gis/line_of_sight.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/gis/line_of_sight.py), [`gis/rf_analysis.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/gis/rf_analysis.py), [`gis/weather.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/gis/weather.py)
- **Features:** YOLOv8 survivor detection, 3D camera raycast target geolocation, NLP voice/text prompt parsing, terrain elevation profiler, and RF 1st Fresnel Zone ($F_1$) clearance analyzer.

### Stage 14: Production Hardening
- **Modules:** [`services/logging_service.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/services/logging_service.py), [`services/persistence.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/services/persistence.py), [`tests/test_sutra_gcs.py`](file:///home/siva/Documents/DRONE_CONTROL/SUTRA/sutra_ws/src/sutra_gcs/tests/test_sutra_gcs.py)
- **Features:** 4-Tier RBAC command interlocks, structured security audit trails, thread safety (`threading.Lock`), graceful recovery, and full automated PyTest verification.
