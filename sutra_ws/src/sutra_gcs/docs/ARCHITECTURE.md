# 🚁 Smart Horizon GCS — Architecture Specification (Phase 1)

## 1. System Topology & Data Flow

```
+=============================================================================+
|                      APPLICATION STATE (Single Source of Truth)              |
+=============================================================================+
|                                                                             |
|  +-------------------+  +-------------------+  +-------------------------+  |
|  |  TelemetryState   |  |   MissionState    |  |       FleetState        |  |
|  |-------------------|  |-------------------|  |-------------------------|  |
|  | - lat, lon, alt   |  | - mission_id      |  | - drones: Dict[str, ..] |  |
|  | - roll, pitch, yaw|  | - state (enum)    |  | - leader_id             |  |
|  | - battery_pct, V  |  | - waypoints: List |  | - add/remove/set_leader |  |
|  | - satellites, fix |  | - progress, ETA   |  |                         |  |
|  +-------------------+  +-------------------+  +-------------------------+  |
|                                                                             |
|  +-------------------+  +-------------------+  +-------------------------+  |
|  |     MapState      |  |    AlertState     |  |       StateStore        |  |
|  |-------------------|  |-------------------|  |-------------------------|  |
|  | - center_lat, lon |  | - alerts: List    |  | - subscribe(cb)         |  |
|  | - zoom, bearing   |  | - severity: Enum  |  | - update_state(mutator) |  |
|  | - visible_layers  |  | - acknowledge()   |  | - get_state()           |  |
|  +-------------------+  +-------------------+  +-------------------------+  |
|                                                                             |
+======================================+======================================+
                                       |
                                       | Thread-Safe Functional Mutations
                                       v
+=============================================================================+
|                         EVENT BUS (Reactive Broker)                         |
+=============================================================================+
|  Topics / Namespaces:                                                       |
|   • telemetry.updated / telemetry.lost                                      |
|   • mission.created / started / paused / completed / aborted                |
|   • fleet.drone_added / removed / updated / formation_changed               |
|   • map.camera_changed / layer_changed                                      |
|   • geofence.created / updated / deleted                                    |
|   • alert.created / acknowledged                                            |
|   • communication.connected / disconnected / reconnecting                   |
|   • system.error / shutdown                                                 |
|                                                                             |
|  Capabilities:                                                              |
|   • Synchronous & Async (emit_async) publishing                             |
|   • Wildcard pattern matching (e.g. 'telemetry.*' and '*')                  |
|   • Complete Exception Isolation (failing subscriber cannot crash bus)      |
+======================================+======================================+
                                       |
                                       | Event Distribution
                                       v
+=============================================================================+
|                      FUTURE SUBSYSTEMS & UI CONSUMERS                       |
+=============================================================================+
|                                                                             |
|   [MAVLink Gateway]         [AI Perception]             [GIS Engine]        |
|          |                         |                         |              |
|          +------------+------------+------------+------------+              |
|                       |                         |                           |
|                       v                         v                           |
|              [Primary Flight HUD]       [Tactical GIS Map]                  |
|                                                                             |
+=============================================================================+
```

---

## 2. Dependency Inversion Rules

```
       UI (PySide6 QMainWindow / Widgets)
                    ↓ (consumes)
       Services (EventBus, Logging, Config)
                    ↓ (coordinates)
       State (ApplicationState, TelemetryState, etc.)
                    ↓ (pure dataclasses)
       Infrastructure (Python standard library)
```
