# 📡 SUTRA Communication System: Packet Structure & Size Specifications

**Author & Tech Architect:** Nikhil  
**Subsystem:** Subsystem B (Swarm Mesh, Deep JSCC & Telemetry)  
**Active Branch:** `feature/subsystem-b-comms`

---

## 🎯 Executive Packet Size Overview

Project SUTRA uses a **3-Tier Tiered Packet Sizing Architecture** to match physical wireless channel constraints:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 WIRELESS PACKET SIZE SUMMARY                                │
├───────────────────────────────┬─────────────────┬───────────────────┬───────────────────────┤
│ COMMUNICATION LAYER           │ FREQUENCY       │ PACKET SIZE       │ DATA PAYLOAD          │
├───────────────────────────────┼─────────────────┼───────────────────┼───────────────────────┤
│ 1. LoRa Tactical Backhaul     │ 433MHz          │ **64 Bytes**      │ WGS84 Target & Raft   │
│ 2. Deep JSCC Semantic Mesh    │ 2.4GHz ESP-NOW  │ **96 Bytes**      │ 16-dim Latent Vector  │
│ 3. GCS Serial Telemetry Bridge│ UART / USB      │ **256 Bytes**     │ JSON Telemetry Frame  │
└───────────────────────────────┴─────────────────┴───────────────────┴───────────────────────┘
```

---

## 📻 1. Layer 1: Long-Range LoRa Telemetry Packet (433MHz / SX1278)

- **Total Packet Size**: **64 Bytes** (Fixed-width binary payload for zero packet fragmentation).
- **Physical Rate**: 125 kHz bandwidth, Spreading Factor SF7, Coding Rate 4/5.
- **Transmission Time**: $\approx 18.5\text{ ms}$ per packet over 5km distance.

### Byte-by-Byte Memory Layout (64-Byte Binary Frame):

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                 MAGIC_HEADER (0x53555452 = "SUTR")            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          NODE_ID (2B)         |    SEQUENCE_NUM   |   RAFT_TERM   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     WGS84_LATITUDE (float64 - 8B)             |
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     WGS84_LONGITUDE (float64 - 8B)            |
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|        WGS84_ALT (float32 - 4B)       | TARGET_CONFIDENCE(2B) |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     SWARM_RAFT_STATE_MASK (uint64 - 8B)       |
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   BATTERY_%   |         STATUS_FLAGS (3B)     |   RESERVED(4B)|
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     CRC16_CHECKSUM (uint16 - 2B)              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

---

## 🌐 2. Layer 2: Deep JSCC Semantic Mesh Packet (2.4GHz ESP-NOW)

- **Total Packet Size**: **96 Bytes** per semantic frame (Well within 250-byte ESP-NOW limit).
- **Physical Rate**: 54 Mbps 802.11s Wi-Fi.
- **Latency**: **4.2 ms** per hop.

### Field Breakdown:
1. **Packet Header**: 16 Bytes (Magic header, Sender UAV ID, Frame Index, Timestamp).
2. **PyTorch Perceptron Latent Feature Vector**: 64 Bytes ($16 \times 4\text{-byte float32}$ continuous symbols).
3. **CRC & Error Correction**: 16 Bytes.
4. **Total Size**: **96 Bytes**.

---

## 💻 3. Layer 3: GCS Laptop Serial Telemetry Frame (UART @ 115200 Baud)

- **Total Packet Size**: **256 Bytes** (ASCII JSON formatted string).
- **Transmission Time**: $\approx 22.2\text{ ms}$ over CP2102 serial link.

### Sample Serial JSON Frame:
```json
{
  "uav_id": "uav_alpha",
  "pos": [0.0, 0.0, 15.0],
  "wgs84": {"lat": 37.774929, "lon": -122.419416, "alt": 15.0},
  "snr_db": 33.19,
  "latency_ms": 4.2,
  "battery_pct": 87,
  "victim_alert": {"confidence": 0.942, "status": "CONFIRMED"}
}
```
