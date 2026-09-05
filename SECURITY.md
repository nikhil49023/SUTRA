# 🛡️ Security & System Integrity Policy

## Project SUTRA System Integrity & Hackathon Compliance

Project SUTRA is developed for search and rescue operations in hostile, GPS-denied, and electronic warfare environments. As such, system integrity, cryptographic validation of offboard commands, and strict adherence to academic and institutional ethics are top priorities.

---

## 🔒 1. Reporting a Vulnerability

If you discover a security vulnerability, buffer overflow, DDS message injection vector, or simulation escape within Project SUTRA, please report it directly to the Technical Architect:
* **Tech Lead / Maintainer**: Nikhil (`nikhil49023`)
* **Email / Contact**: Through official hackathon channels or GitHub Security Advisories.

---

## 🛡️ 2. Autonomous System Integrity Directives

1. **Airspace Failsafe Invariant**: All offboard velocity streaming nodes (`sutra_gnc`) must enforce a hardcoded heartbeat timeout (maximum 500ms). If offboard setpoints cease, the PX4 flight controller automatically triggers autonomous emergency hover or Return-to-Launch (RTL).
2. **Deterministic Verification Integrity**: In compliance with our Master Development Protocol (`AGENTS.md`), all benchmark metrics must be deterministically reproducible from live test execution with zero synthetic data.
3. **Cryptographic Mesh Validation**: Inter-UAV SwarmRAFT consensus frames and CoT tactical XML streams operate with message sequence validation to prevent spoofing and replay attacks in contested RF corridors.
