# SMART HORIZON GCS — Tactical Ground Control Station (React Frontend)

**Phase 11 — React Tactical GCS Frontend**

## 1. Architecture

- **Authoritative System:** Python Backend (`StateStore`, `EventBus`, `MissionManager`, `FleetManager`, `FormationEngine`, `GeofenceController`, `GISController`, `AIManager`).
- **Presentation & Interaction Layer:** React, TypeScript, Vite, Tailwind CSS, Zustand, MapLibre GL JS, Lucide React.
- **Bi-Directional Communication:** Real-time WebSocket protocol (`ws://127.0.0.1:8765`) exchanging structured `COMMAND` messages, `EVENT` notifications, and full authoritative `STATE_SNAPSHOT` payloads.

```
                    REACT FRONTEND
                         │
                    WebSocket
                         │
                         ▼
                 PYTHON BACKEND
                         │
        ┌────────────────┼────────────────┐
        │                │                │
     Mission           Fleet            GIS
        │                │                │
     Geofence         Telemetry          AI
        │                │                │
        └────────────────┼────────────────┘
                         │
                  ApplicationState
```

## 2. Quick Start

### 1. Launch Python Authoritative Backend
```bash
python3 run_gcs_server.py
```

### 2. Launch React Tactical Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Automated Tests & Build
```bash
cd frontend
npm test
npm run build
```

## 3. Keyboard Shortcuts

- `M` — Mission Planner
- `G` — Geofence Tools
- `F` — Swarm Fleet Panel
- `I` — GIS Intelligence
- `A` — AI Advisor
- `H` — Toggle Primary Flight Display (HUD)
- `R` — Open Emergency Return-To-Launch (RTL) confirmation modal
- `Esc` — Return to tactical command view / close overlay
