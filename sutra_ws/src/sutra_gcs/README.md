# 🚁 Smart Horizon Ground Control Station (GCS)
## Phase 1: Python Foundation, Centralized State Management & Event Bus

A professional, 100% Python-based tactical Ground Control Station engineered for multi-UAV autonomous Search-and-Rescue (SAR) operations, disaster reconnaissance, and swarm coordination.

---

## 🏛️ Architectural Principle: Single Source of Truth

The system enforces a strict unidirectional state architecture:
- **UI components NEVER directly maintain operational truth.**
- **Subsystems communicate exclusively through centralized `State` and `EventBus`.**

```
                    ┌─────────────────────┐
                    │    Application     │
                    │       State         │
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
      TelemetryState      MissionState       FleetState
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
                         EventBus
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
       Map                   HUD                  Mission
         │                                           │
         └──────────────────────┬────────────────────┘
                                ▼
                            Dashboard
```

---

## 📦 Project Structure

```
sutra_gcs/
│
├── main.py                    # PySide6 lifecycle bootstrap & clean shutdown
│
├── state/                     # Centralized Single-Source-of-Truth reactive state
│   ├── __init__.py
│   ├── application_state.py   # Root ApplicationState & StateStore
│   ├── telemetry_state.py     # Live aircraft telemetry model
│   ├── mission_state.py       # MissionStateEnum & Waypoint models
│   ├── fleet_state.py         # Multi-UAV swarm coordination models
│   ├── map_state.py           # Map viewport, layers & selection model
│   └── alert_state.py         # System alerts, warnings & fault management
│
├── services/                  # Core Infrastructure Services
│   ├── __init__.py
│   ├── event_bus.py           # Production thread-safe & async EventBus
│   └── logging_service.py     # Centralized structured logging
│
├── config/                    # Configuration Management
│   ├── __init__.py
│   └── settings.py            # Type-safe Settings with environment overrides
│
└── tests/                     # Verification Test Suite
    ├── __init__.py
    ├── test_event_bus.py      # EventBus unit & integration tests
    ├── test_state.py          # State store & subsystem state tests
    └── test_settings.py       # Configuration & env override tests
```

---

## ⚡ Quick Start

### 1. Requirements
* Python 3.11+
* PySide6
* pytest

### 2. Running Verification Tests
```bash
python3 -m pytest tests/ -v
```

### 3. Compilation Integrity Check
```bash
python3 -m compileall .
```

### 4. Starting the Application
```bash
python3 main.py
```
*(In headless or CI environments without X11, run `QT_QPA_PLATFORM=offscreen python3 main.py`)*

---

## 📜 Development & Architectural Rules

1. **State Isolation**: UI components must never own operational state.
2. **Event Taxonomy**: Use predefined constants from `EventNames` in `services.event_bus`.
3. **Error Isolation**: Event subscribers must never crash the bus.
4. **Thread Safety**: All state mutations must be performed via `StateStore.update_state()`.
5. **No Circular Imports**: Subsystems import state & services, never UI widgets.
