# 🗺️ Subsystem D — 3D GIS GCS Dashboard Documentation

[![Build Status](https://img.shields.io/badge/Vite_Build-SUCCESS-brightgreen.svg)]()
[![Gate G6 Metric](https://img.shields.io/badge/Gate_G6-UNTESTED-red.svg)]()

**Subsystem Lead:** Siva Kesava  
**Branch:** `feature/subsystem-d-gcs`  
**Location:** `sutra_ws/src/sutra_gcs/`

> ⚠️ **Benchmark Integrity Notice (2026-07-31):** All previous benchmark values (60.0 FPS locked, 1.20 ms serial latency, 2.10 ms RTL latency) were estimated targets. This file now reflects only empirical findings from actual production build verification (`npm run build`). Runtime telemetry metrics are explicitly marked `❓ UNTESTED`.

---

## 📊 Statistical Benchmarks & Performance Metrics

**Verification command:** `cd sutra_ws/src/sutra_gcs && npm run build`  
**Live result:** `✓ built in 1.29s` *(captured 2026-07-31 11:08 IST)*

| Metric | Target Threshold | Measured Empirical Value | Evidence Type | Status |
|---|:---:|:---:|:---:|:---:|
| **TypeScript / Vite Production Build** | Clean build (0 errors) | **`1,396 modules transformed` (178.83 kB bundle, 1.29s)** | `npm run build` stdout | ✅ VERIFIED |
| **ATAK/WinTAK CoT Serializer Integration** | MIL-STD-2525 XML | **Module compiled without errors** | `npm run build` stdout | ✅ VERIFIED |
| **3D Satellite Telemetry HUD FPS (Gate G6)** | 60.0 FPS | ❓ UNTESTED — **requires browser runtime evaluation** | Headless Browser / Playwright HUD FPS test required | ❌ BLOCKED |
| **Serial Telemetry Stream Latency** | < 5.0 ms | ❓ UNTESTED — **requires live WebSocket / Serial bridge hardware loop** | End-to-end telemetry ping required | ❌ BLOCKED |
| **Emergency RTL Command Latency** | < 10.0 ms | ❓ UNTESTED — **requires live GCS to Flight Controller link** | Serial bridge loopback test required | ❌ BLOCKED |

---

## 🎯 Gate Status

| Gate | Metric | Required | Measured | Status |
|---|---|:---:|:---:|:---:|
| **G6** | 3D GIS Telemetry HUD FPS | 60.0 FPS | ❓ UNTESTED — Build passes, runtime FPS unmeasured | ❌ BLOCKED |

---

## 🌳 Subsystem D Dependency Tree

```
sutra_gcs (React 18 + Mapbox GL JS Web Application)
├── src/
│   ├── App.tsx                        # Main 3D Satellite COP Interface
│   ├── utils/atakCotStreamer.ts       # ATAK/WinTAK Cursor-on-Target XML Serializer
│   ├── components/SwarmCommsPhysicsSim.tsx # Multi-Radio Physics Sim Widget
│   └── components/DeepJsccComparisonWidget.tsx # Deep JSCC vs H.264 Benchmark Widget
└── dependencies:
    ├── React 18, TypeScript 5.2+
    ├── Mapbox GL JS 3.0+ (3D Terrain & Satellite)
    └── Lucide React, WebGL / WebGPU Shaders
```
