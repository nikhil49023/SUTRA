# SUTRA Ground Control Station — System Architecture

## Overview
SUTRA GCS is a production-grade, modular Ground Control Station for multi-UAV autonomous operations, GIS analytics, AI threat decision support, and MAVLink hardware communication.

## Subsystem Hierarchy
1. **Core Dashboard & GIS Engine** (`src/gis/`, `src/components/map/`): WebGL MapLibre 3D renderer, DEM terrain, vector layers.
2. **Geofence Safety Module**: Polygon/circle geofences, node markers, altitude safety bounds, live breach alerts.
3. **Mission Planning & Execution Engine** (`src/engine/`): 13-state machine, route optimizer, 60 FPS telemetry interpolator, failsafes.
4. **GIS Intelligence Subsystem**: Line-of-sight raycasting, RF signal coverage, weather scoring, search grid generator.
5. **AI Decision Support System** (`src/ai/`): Threat matrix, target tracker, battery/ETA predictor, natural language assistant.
6. **Hardware & SITL Communication Subsystem** (`src/communication/`): MAVLink v2 parser, PX4/ArduPilot adapters, RTSP camera gateway, watchdog.
7. **Multi-Drone Swarm Coordination System** (`src/swarm/`): Fleet registry, V-formation controller, task allocator, 3D collision avoidance.
8. **Production Hardening** (`src/security/`, `src/monitoring/`, `src/logging/`, `src/recovery/`): RBAC, audit logging, crash recovery, Docker containerization.
