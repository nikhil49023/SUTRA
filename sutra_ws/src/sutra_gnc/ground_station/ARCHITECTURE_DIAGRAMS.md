# Smart Horizon GCS — Architecture & Sequence Diagrams

## 1. MAVLink Telemetry Streaming Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant FlightController as PX4 / ArduPilot Drone
    participant Socket as WebSocket / MAVLink Manager
    participant Store as TelemetryStore
    participant EventBus as GCSGlobalEventBus
    participant PFD as Primary Flight Display HUD
    participant GIS as 3D GIS Map Centerpiece

    FlightController->>Socket: 100Hz MAVLink Packet (ATTITUDE, GLOBAL_POS)
    Socket->>Store: Ingest Raw Telemetry Buffer
    Store->>EventBus: Emit 20Hz Throttled Telemetry Update
    EventBus->>PFD: Render Gyro Pitch/Roll/Yaw (60 FPS)
    EventBus->>GIS: Update Drone Marker Coordinates (Lat/Lng)
```

---

## 2. MAVLink Mission Upload Handshake Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Operator as GCS Operator
    participant Validator as MissionValidator
    participant Transfer as MissionTransferManager
    participant Drone as Flight Controller (SysID 1)

    Operator->>Validator: Click Upload Mission (Waypoints 1..N)
    Validator->>Validator: Validate Altitude, Geofence & Battery Reserve
    Validator-->>Transfer: Validation Passed (Report Valid = true)
    Transfer->>Drone: MAVLink MISSION_COUNT (count = N)
    Drone-->>Transfer: MAVLink MISSION_REQUEST_INT (seq = 0)
    Transfer->>Drone: MAVLink MISSION_ITEM_INT (seq = 0, Lat, Lng, Alt)
    Drone-->>Transfer: MAVLink MISSION_REQUEST_INT (seq = 1)
    Transfer->>Drone: MAVLink MISSION_ITEM_INT (seq = 1...)
    Drone-->>Transfer: MAVLink MISSION_ACK (MAV_MISSION_ACCEPTED)
    Transfer-->>Operator: Display Mission Uploaded Success Toast
```

---

## 3. UAV Adapter Pattern UML Class Diagram

```mermaid
classDiagram
    class IDroneAdapter {
        <<interface>>
        +connect() Promise~boolean~
        +disconnect() Promise~void~
        +sendCommand(cmd) Promise~MAVLinkCommandAck~
        +uploadMission(waypoints) Promise~boolean~
        +downloadMission() Promise~Array~
    }

    class PX4AutopilotAdapter {
        -sysId: number
        -endpoint: string
        +connect()
        +mapPX4Mode(customMode)
    }

    class ArduPilotAdapter {
        -sysId: number
        -endpoint: string
        +connect()
        +mapArduPilotMode(customMode)
    }

    class SimulatedDroneAdapter {
        -sysId: number
        +connect()
    }

    IDroneAdapter <|.. PX4AutopilotAdapter
    IDroneAdapter <|.. ArduPilotAdapter
    IDroneAdapter <|.. SimulatedDroneAdapter
```
