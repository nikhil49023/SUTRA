# Smart Horizon GCS — REST API & MAVLink Contract Specification

## 1. REST API Endpoints (FastAPI Backend)

### Auth & Security
- `POST /api/v1/auth/login`
  - Body: `{ callsign: string, passwordHash: string }`
  - Response: `{ token: string, user: UserSession }`
- `GET /api/v1/auth/me`
  - Response: `UserSession`

### Drone Operations
- `GET /api/v1/drones`
  - Response: `DroneAsset[]`
- `POST /api/v1/drones/{sysId}/command`
  - Body: `{ command: "ARM" | "DISARM" | "TAKEOFF" | "RTH" | "LAND" }`
  - Response: `{ status: "ACCEPTED" | "REJECTED" }`

### Mission Management
- `POST /api/v1/missions/upload`
  - Body: `{ waypoints: Waypoint[] }`
  - Response: `ValidationReport`

---

## 2. WebSocket Telemetry Stream
- **URL**: `ws://localhost:8080/mavlink`
- **Rate**: 5Hz
- **Frame Schema**:
```json
{
  "sysId": 1,
  "telemetry": {
    "pitch": -2.4,
    "roll": 1.1,
    "yaw": 315.0,
    "lat": 34.5225,
    "lng": 45.1082,
    "alt": 450.0,
    "speed": 54.0,
    "battery": 88
  }
}
```
