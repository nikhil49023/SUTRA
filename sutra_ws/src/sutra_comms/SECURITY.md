# 🛡️ SECURITY.md — Subsystem B Tactical Cybersecurity Rules

## Overview
Subsystem B implements **MIL-STD-2525 compliant tactical security rules** to protect inter-node swarm communications, SwarmRAFT consensus heartbeats, and Deep JSCC neural feature vectors against eavesdropping, RF jamming, replay attacks, and rogue node injection.

---

## 🔒 4 Core Security Rules

### Rule 1: AES-128-GCM Authenticated Payload Encryption
- All over-the-air binary frames (802.11s Wi-Fi, ESP-NOW, and LoRa) MUST be encrypted using **AES-128-GCM** (Galois/Counter Mode).
- Provides both **confidentiality** and **authenticated integrity** (128-bit authentication tag).

### Rule 2: Anti-Replay Counter & Rolling HMAC
- Every packet header contains a monotonically increasing `uint32_t seq_num`.
- Receivers maintain a sliding window to reject any packet with a sequence number less than or equal to the highest verified sequence number.
- Replayed packets are silently dropped and logged.

### Rule 3: SwarmRAFT Consensus Pre-Vote Authentication
- Before a node transitions to `CANDIDATE` and increments its `currentTerm`, it MUST conduct a **Pre-Vote phase**.
- A Pre-Vote request verifies whether a majority quorum of peers can be reached. This prevents isolated or compromised nodes from forcing unnecessary cluster elections.

### Rule 4: Serial Framing & CRC16 Integrity
- High-speed UART bridges (921600 baud) between ESP32-S3 CAM and host microcontrollers enforce CRC16-CCITT checksum validation on every payload.

---

## 🔑 Key Management
- Symmetric AES-128 keys are pre-shared or derived via Elliptic-Curve Diffie-Hellman (ECDH-25519) during initial swarm pairing.
