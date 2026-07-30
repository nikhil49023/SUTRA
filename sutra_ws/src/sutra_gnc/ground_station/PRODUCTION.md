# Smart Horizon Ground Control Station — Production Guide

## Overview
Smart Horizon GCS is a military-grade, operator-centric web application designed for real-world drone operations, GIS mission planning, real-time MAVLink telemetry streaming, and computer vision AI threat tracking.

## Architecture Stack
- **Frontend Core**: React 19 + TypeScript 6 + Vite 8
- **Styling**: Tailwind CSS v4 + Lucide React
- **Data & Caching**: TanStack React Query + Zustand Global Store
- **GIS Engine**: SVG Vector Engine + Leaflet + Turf.js
- **Communication Architecture**: Generic `IDroneAdapter` supporting MAVLink 1.0/2.0, PX4, ArduPilot, and MAVSDK
- **Security & Access Control**: RBACService (Level 4 Commander, Level 3 Operator, Level 2 Analyst, Level 1 Viewer)
- **Database Layer**: SQLite WASM / Local Edge Storage with PostgreSQL / TimescaleDB migration readiness

## Deployment & Docker
Build and run the production container:

```bash
# Build Docker image
docker build -t smart-horizon-gcs:latest .

# Run containerized application
docker-compose up -d
```

## Key Keyboard Shortcuts
- **R / Space**: Trigger Emergency Return to Home (RTH)
- **F**: Toggle Contextual Fleet Drawer
- **L**: Switch to Live Operations Center
- **A**: Switch to AI Intelligence View
- **D**: Switch to Dashboard View

## Security Clearance Matrix
- **COMMANDER (Level 4)**: All permissions (Command execution, RTH, Mission editing, User management, AI settings).
- **OPERATOR (Level 3)**: Command execution, RTH, Mission editing, AI tracking.
- **ANALYST (Level 2)**: Telemetry viewing, Analytics export, AI tracking.
- **VIEWER (Level 1)**: Read-only telemetry viewing.
