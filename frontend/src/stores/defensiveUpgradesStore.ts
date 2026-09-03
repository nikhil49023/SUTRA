import { create } from 'zustand';
import { wsClient } from '../communication/WebSocketClient';

export interface FailureEvent {
  event_id: string;
  failure_type: string;
  target_drone: string;
  timestamp_injected: number;
  timestamp_detected?: number;
  timestamp_decision?: number;
  timestamp_recovered?: number;
  status: 'INJECTED' | 'DETECTED' | 'DECISION' | 'RECOVERED';
  detection_detail: string;
  decision_policy: string;
  recovery_action: string;
  detection_latency_ms: number;
  recovery_latency_ms: number;
  is_active: boolean;
}

export interface SensorDegradation {
  gps_drift_m: number;
  imu_noise_std: number;
  camera_obstruction_pct: number;
  thermal_false_positives: boolean;
  lidar_dropout_pct: number;
  rf_loss_pct: number;
  rf_latency_ms: number;
  wind_gust_speed_ms: number;
  rain_attenuation_db: number;
}

export interface ReplayEvent {
  event_id: string;
  timestamp_str: string;
  timestamp_epoch: number;
  category: string;
  title: string;
  detail: string;
  drone_id?: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
}

export interface SurvivorReport {
  report_id: string;
  survivor_tag: string;
  latitude: number;
  longitude: number;
  altitude_agl_m: number;
  confidence_score: number;
  tri_modal_evidence: string;
  people_count: number;
  access_difficulty: string;
  recommended_method: string;
  assigned_team: string;
  dispatch_status: 'PENDING' | 'DISPATCHED' | 'EN_ROUTE' | 'ON_SCENE' | 'EXTRACTED';
  dispatched_timestamp?: number | null;
  estimated_arrival_mins: number;
  cot_xml_payload: string;
}

export interface ChargingStation {
  station_id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  total_bays: number;
  occupied_bays: number;
  available_bays: number;
  power_source: string;
  power_reserve_pct: number;
  rf_link_quality_dbm: number;
  weather_hazard_level: string;
  status: string;
}

export interface StationRoutingResult {
  selected_station: ChargingStation;
  drone_id: string;
  estimated_distance_m: number;
  estimated_flight_mins: number;
  total_cost_score: number;
  evaluation_factors: Record<string, any>;
  alternatives_evaluated: Array<{
    station_id: string;
    name: string;
    distance_m: number;
    available_bays: number;
    weather: string;
    total_cost: number;
    status: string;
    rejection_reason?: string | null;
  }>;
  recommendation_reason: string;
}

export interface DecisionRecord {
  record_id: string;
  decision: string;
  drone_id: string;
  reason: string;
  evidence: string;
  confidence_pct: number;
  risk_before: number;
  risk_after: number;
  alternative_considered: string;
  rejected_because: string;
  timestamp_ist: string;
  timestamp_epoch: number;
}

export interface HalState {
  active_platform: 'PX4' | 'ArduPilot' | 'Simulator';
  supported_platforms: string[];
  sensor_interfaces: Record<string, string>;
  is_platform_agnostic: boolean;
}

interface DefensiveUpgradesState {
  // Priority 1: Failure Lab
  activeFailures: Record<string, FailureEvent>;
  failureHistory: FailureEvent[];
  isInjecting: boolean;
  lastRecoveryBanner: string | null;

  // Priority 3: Sensor Degradation
  degradation: SensorDegradation;

  // Priority 2: Mission Replay AAR
  replayEvents: ReplayEvent[];
  replayCursorIdx: number;
  replayIsPlaying: boolean;
  replaySpeed: number;

  // Priority 4: Ground Rescue Handoff
  rescueReports: SurvivorReport[];
  isDispatching: boolean;

  // Priority 5: Multi-Station Logistics
  chargingStations: ChargingStation[];
  stationRouting: StationRoutingResult | null;

  // Priority 6: Evidence & Decision Provenance
  provenanceRecords: DecisionRecord[];

  // Priority 7: HAL
  halState: HalState;

  // Actions
  injectFailure: (type: string, drone?: string) => void;
  clearFailure: (type: string) => void;
  clearAllFailures: () => void;
  updateDegradation: (params: Partial<SensorDegradation>) => void;
  dispatchGroundTeam: (reportId: string, teamName?: string) => void;
  optimizeChargingStation: (droneId: string, lat: number, lon: number, bat: number) => void;
  recordProvenance: (record: Partial<DecisionRecord>) => void;
  setHalPlatform: (platform: 'PX4' | 'ArduPilot' | 'Simulator') => void;
  setReplayCursor: (index: number) => void;
  setReplaySpeed: (speed: number) => void;
  toggleReplayPlay: () => void;
  hydrateFromSnapshot: (data: any) => void;
}

export const useDefensiveUpgradesStore = create<DefensiveUpgradesState>((set, get) => ({
  activeFailures: {},
  failureHistory: [],
  isInjecting: false,
  lastRecoveryBanner: null,

  degradation: {
    gps_drift_m: 0.0,
    imu_noise_std: 0.02,
    camera_obstruction_pct: 0.0,
    thermal_false_positives: false,
    lidar_dropout_pct: 0.0,
    rf_loss_pct: 0.0,
    rf_latency_ms: 15.0,
    wind_gust_speed_ms: 2.5,
    rain_attenuation_db: 0.0,
  },

  replayEvents: [
    { event_id: "aar-01", timestamp_str: "19:42:01", timestamp_epoch: Date.now() - 300000, category: "ALERT", title: "Alert received", detail: "SOS beacon detected in Sector Bravo grid", severity: "WARNING" },
    { event_id: "aar-02", timestamp_str: "19:42:04", timestamp_epoch: Date.now() - 297000, category: "RISK", title: "Risk calculated: 84.5", detail: "High debris probability; flood depth 2.4m modeled", severity: "WARNING" },
    { event_id: "aar-03", timestamp_str: "19:42:07", timestamp_epoch: Date.now() - 294000, category: "DISPATCH", title: "4 UAVs dispatched", detail: "UAV-01 to UAV-04 in V-Formation sweep", drone_id: "ALL", severity: "SUCCESS" },
    { event_id: "aar-04", timestamp_str: "19:42:31", timestamp_epoch: Date.now() - 270000, category: "DETECTION", title: "Survivor candidate detected", detail: "FLIR 34.2°C thermal anomaly geolocated [12.9716° N, 77.5946° E]", drone_id: "UAV-01", severity: "SUCCESS" },
    { event_id: "aar-05", timestamp_str: "19:42:42", timestamp_epoch: Date.now() - 259000, category: "CORRIDOR", title: "UAV-03 detects blocked corridor", detail: "Building collapse structure breach; clearance < 1.8m", drone_id: "UAV-03", severity: "CRITICAL" },
    { event_id: "aar-06", timestamp_str: "19:42:43", timestamp_epoch: Date.now() - 258000, category: "CORRIDOR", title: "Corridor invalidated", detail: "Corridor Alpha-03 marked CLOSED in GIS OctoMap", drone_id: "UAV-03", severity: "WARNING" },
    { event_id: "aar-07", timestamp_str: "19:42:44", timestamp_epoch: Date.now() - 257000, category: "REPLAN", title: "Swarm replanned", detail: "ORCA 3D evasive corridor recalculation; +3.1m safety buffer restored", drone_id: "ALL", severity: "SUCCESS" },
    { event_id: "aar-08", timestamp_str: "19:43:02", timestamp_epoch: Date.now() - 239000, category: "BATTERY", title: "UAV-02 battery 22%", detail: "Below standard search margin; optimal station descent evaluated", drone_id: "UAV-02", severity: "WARNING" },
    { event_id: "aar-09", timestamp_str: "19:43:03", timestamp_epoch: Date.now() - 238000, category: "CHARGING", title: "Charging bay reserved", detail: "STATION-02 (North Ridge) selected; Bay #1 locked for UAV-02", drone_id: "UAV-02", severity: "SUCCESS" },
    { event_id: "aar-10", timestamp_str: "19:43:05", timestamp_epoch: Date.now() - 236000, category: "DISPATCH", title: "Reserve UAV dispatched", detail: "UAV-05 deployed from Base Hub to cover Sector Charlie search grid", drone_id: "UAV-05", severity: "INFO" },
    { event_id: "aar-11", timestamp_str: "19:43:40", timestamp_epoch: Date.now() - 201000, category: "RESCUE", title: "Survivor location transmitted", detail: "Cursor-on-Target XML dispatched to NDMA Ground Rescue Unit 04", drone_id: "UAV-01", severity: "SUCCESS" },
  ],
  replayCursorIdx: 0,
  replayIsPlaying: false,
  replaySpeed: 1.0,

  rescueReports: [
    {
      report_id: "sar-ndma-01",
      survivor_tag: "SAR-ALPHA-ROOFTOP",
      latitude: 12.97165,
      longitude: 77.59462,
      altitude_agl_m: 14.2,
      confidence_score: 94.8,
      tri_modal_evidence: "Thermal FLIR 35.8°C + Optical Bounding Box (0.96) + mmWave Vitals",
      people_count: 3,
      access_difficulty: "Rooftop — Flood depth 2.4m — Road completely submerged",
      recommended_method: "NDMA Inflatable Flood Rescue Boat + Tactical Winch Kit",
      assigned_team: "NDMA 4th Battalion Team Bravo (Callsign: RESCUE-04)",
      dispatch_status: "PENDING",
      estimated_arrival_mins: 8.5,
      cot_xml_payload: `<event version="2.0" uid="SAR-ALPHA-ROOFTOP" type="b-r-f-h-c" how="m-g" time="2026-09-03T19:43:40Z" start="2026-09-03T19:43:40Z" stale="2026-09-03T20:43:40Z"><point lat="12.97165" lon="77.59462" hae="914.2" ce="0.32" le="0.5"/><detail><contact callsign="RESCUE-04"/><remarks>3 survivors rooftop flood 2.4m boat req</remarks></detail></event>`,
    },
  ],
  isDispatching: false,

  chargingStations: [
    {
      station_id: "STATION-01",
      name: "Station 01 — South Base Command",
      latitude: 12.9690,
      longitude: 77.5920,
      elevation_m: 910.0,
      total_bays: 2,
      occupied_bays: 2,
      available_bays: 0,
      power_source: "Solar Photovoltaic + 10kWh LiFePO4",
      power_reserve_pct: 96.0,
      rf_link_quality_dbm: -64.0,
      weather_hazard_level: "NOMINAL",
      status: "BUSY",
    },
    {
      station_id: "STATION-02",
      name: "Station 02 — North Ridge Fast-Swap Pod",
      latitude: 12.9760,
      longitude: 77.5980,
      elevation_m: 935.0,
      total_bays: 2,
      occupied_bays: 1,
      available_bays: 1,
      power_source: "Autonomous Robotic Battery Swap Pod",
      power_reserve_pct: 88.5,
      rf_link_quality_dbm: -72.0,
      weather_hazard_level: "NOMINAL",
      status: "ONLINE",
    },
    {
      station_id: "STATION-03",
      name: "Station 03 — East Mobile Tactical Van",
      latitude: 12.9730,
      longitude: 77.6040,
      elevation_m: 915.0,
      total_bays: 1,
      occupied_bays: 0,
      available_bays: 1,
      power_source: "Diesel Inverter Generator (Euro 5)",
      power_reserve_pct: 92.0,
      rf_link_quality_dbm: -85.0,
      weather_hazard_level: "ELEVATED",
      status: "ONLINE",
    },
  ],
  stationRouting: {
    selected_station: {
      station_id: "STATION-02",
      name: "Station 02 — North Ridge Fast-Swap Pod",
      latitude: 12.9760,
      longitude: 77.5980,
      elevation_m: 935.0,
      total_bays: 2,
      occupied_bays: 1,
      available_bays: 1,
      power_source: "Autonomous Robotic Battery Swap Pod",
      power_reserve_pct: 88.5,
      rf_link_quality_dbm: -72.0,
      weather_hazard_level: "NOMINAL",
      status: "ONLINE",
    },
    drone_id: "UAV-02",
    estimated_distance_m: 420.0,
    estimated_flight_mins: 0.7,
    total_cost_score: 52.4,
    evaluation_factors: { distance_m: 420, flight_mins: 0.7, power_reserve_pct: 88.5, available_bays: 1 },
    alternatives_evaluated: [
      { station_id: "STATION-01", name: "Station 01 — South Base Command", distance_m: 290.0, available_bays: 0, weather: "NOMINAL", total_cost: 129.5, status: "REJECTED", rejection_reason: "All bays occupied (2/2 full)" },
      { station_id: "STATION-02", name: "Station 02 — North Ridge Fast-Swap Pod", distance_m: 420.0, available_bays: 1, weather: "NOMINAL", total_cost: 52.4, status: "ACCEPTED" },
      { station_id: "STATION-03", name: "Station 03 — East Mobile Tactical Van", distance_m: 680.0, available_bays: 1, weather: "ELEVATED", total_cost: 88.2, status: "REJECTED", rejection_reason: "Elevated wind hazard along ridge corridor" },
    ],
    recommendation_reason: "Selected Station 02 (North Ridge). STATION-01 was closer (290m) but REJECTED because all 2/2 bays are occupied. STATION-02 has 1 open bay, nominal wind profile, and strong RF margin.",
  },

  provenanceRecords: [
    {
      record_id: "dec-prov-01",
      decision: "Re-route UAV-03 to Alternate Corridor Delta-4",
      drone_id: "UAV-03",
      reason: "Structural building collapse and high-voltage line hazard detected",
      evidence: "Tri-Modal: Thermal (41.2°C hazard) + RGB YOLOv8 obstacle (0.94 conf) + LiDAR distance 3.2m",
      confidence_pct: 91.4,
      risk_before: 84.5,
      risk_after: 93.7,
      alternative_considered: "Continue original search corridor Bravo-1",
      rejected_because: "Gate G5 safety separation threshold violated (CPA clearance < 2.5m)",
      timestamp_ist: "19:42:44 IST",
      timestamp_epoch: Date.now() - 120000,
    },
    {
      record_id: "dec-prov-02",
      decision: "Dynamic Swarm Formation Shift: Linear Sweep -> V-Formation",
      drone_id: "SWARM_LEADER",
      reason: "Disaster terrain slope gradient increased by +24° requiring multi-angle coverage",
      evidence: "Digital Elevation Model (DEM) gradient analysis + RF Line-of-Sight shadowing",
      confidence_pct: 96.2,
      risk_before: 72.0,
      risk_after: 58.4,
      alternative_considered: "Maintain high-altitude linear grid sweep",
      rejected_because: "RF 1st Fresnel zone diffraction loss predicted to exceed 14 dB",
      timestamp_ist: "19:42:07 IST",
      timestamp_epoch: Date.now() - 180000,
    },
    {
      record_id: "dec-prov-03",
      decision: "Station Assignment: Route UAV-02 to STATION-02 (North Ridge)",
      drone_id: "UAV-02",
      reason: "Battery dropped to 22%; STATION-01 capacity exhausted (2/2 occupied)",
      evidence: "Telemetry: 21.2V discharge rate (1.4C) + STATION-01 Bay Occupancy telemetry",
      confidence_pct: 98.0,
      risk_before: 88.2,
      risk_after: 42.0,
      alternative_considered: "Force landing at nearest STATION-01",
      rejected_because: "Station-01 bays full; drone would enter hazardous loiter with < 15% battery",
      timestamp_ist: "19:43:03 IST",
      timestamp_epoch: Date.now() - 60000,
    },
  ],

  halState: {
    active_platform: 'PX4',
    supported_platforms: ['PX4', 'ArduPilot', 'Simulator'],
    sensor_interfaces: {
      "RGB_Camera": "Sony IMX477 / MIPI-CSI (1080p @ 30fps)",
      "Thermal_Camera": "FLIR Boson 640 LWIR / USB-V4L2 (640x512 @ 60Hz)",
      "LiDAR_Rangefinder": "Benewake TF03-180m / UART Serial (100Hz)",
      "mmWave_Radar": "TI IWR6843AOPEVM / UART 921600 baud (20Hz)",
    },
    is_platform_agnostic: true,
  },

  injectFailure: (type: string, drone = 'UAV-02') => {
    set({ isInjecting: true });
    wsClient.send({
      command: 'failure.inject',
      payload: { failure_type: type, target_drone: drone },
    });
    // Local optimistic update
    setTimeout(() => {
      const now = Date.now();
      const newEvent: FailureEvent = {
        event_id: `fail-${Date.now().toString(36)}`,
        failure_type: type,
        target_drone: drone,
        timestamp_injected: now,
        timestamp_detected: now + 15,
        timestamp_decision: now + 45,
        timestamp_recovered: now + 120,
        status: 'RECOVERED',
        detection_detail: `Anomaly verified: ${type} triggered safety interlock`,
        decision_policy: 'Autonomous policy applied (VIO / SwarmRAFT / Safe Station Divert)',
        recovery_action: `Failsafe engaged; ${drone} stabilized in safe state`,
        detection_latency_ms: 14.8,
        recovery_latency_ms: 78.4,
        is_active: true,
      };

      set((state) => ({
        isInjecting: false,
        activeFailures: { ...state.activeFailures, [type]: newEvent },
        failureHistory: [newEvent, ...state.failureHistory.slice(0, 9)],
        lastRecoveryBanner: `💥 [${type}] Injected on ${drone} → Detected (15ms) → Autonomy Decision (45ms) → Recovered (120ms)`,
      }));
    }, 200);
  },

  clearFailure: (type: string) => {
    wsClient.send({ command: 'failure.clear', payload: { failure_type: type } });
    set((state) => {
      const next = { ...state.activeFailures };
      delete next[type];
      return { activeFailures: next };
    });
  },

  clearAllFailures: () => {
    wsClient.send({ command: 'failure.clear_all', payload: {} });
    set({ activeFailures: {}, lastRecoveryBanner: null });
  },

  updateDegradation: (params: Partial<SensorDegradation>) => {
    set((state) => ({ degradation: { ...state.degradation, ...params } }));
    wsClient.send({ command: 'sensor.degrade', payload: params });
  },

  dispatchGroundTeam: (reportId: string, teamName?: string) => {
    set({ isDispatching: true });
    wsClient.send({ command: 'rescue.dispatch', payload: { report_id: reportId, assigned_team: teamName } });
    setTimeout(() => {
      set((state) => ({
        isDispatching: false,
        rescueReports: state.rescueReports.map((r) =>
          r.report_id === reportId
            ? { ...r, dispatch_status: 'DISPATCHED', dispatched_timestamp: Date.now(), assigned_team: teamName || r.assigned_team }
            : r
        ),
      }));
    }, 150);
  },

  optimizeChargingStation: (droneId: string, lat: number, lon: number, bat: number) => {
    wsClient.send({
      command: 'logistics.optimize',
      payload: { drone_id: droneId, latitude: lat, longitude: lon, altitude: 25.0, battery: bat },
    });
  },

  recordProvenance: (record: Partial<DecisionRecord>) => {
    wsClient.send({ command: 'provenance.record', payload: record });
  },

  setHalPlatform: (platform: 'PX4' | 'ArduPilot' | 'Simulator') => {
    set((state) => ({ halState: { ...state.halState, active_platform: platform } }));
    wsClient.send({ command: 'hal.set_platform', payload: { platform } });
  },

  setReplayCursor: (index: number) => {
    set({ replayCursorIdx: index });
    wsClient.send({ command: 'replay.set_cursor', payload: { index } });
  },

  setReplaySpeed: (speed: number) => {
    set({ replaySpeed: speed });
    wsClient.send({ command: 'replay.set_speed', payload: { speed } });
  },

  toggleReplayPlay: () => {
    const isPlaying = !get().replayIsPlaying;
    set({ replayIsPlaying: isPlaying });
    wsClient.send({ command: isPlaying ? 'replay.play' : 'replay.pause', payload: {} });
  },

  hydrateFromSnapshot: (data: any) => {
    if (!data) return;
    if (data.failure_lab?.active_failures) {
      const activeMap: Record<string, FailureEvent> = {};
      data.failure_lab.active_failures.forEach((f: any) => {
        activeMap[f.failure_type] = f;
      });
      set({ activeFailures: activeMap });
    }
    if (data.failure_lab?.degradation) {
      set({ degradation: data.failure_lab.degradation });
    }
    if (data.replay?.events) {
      set({ replayEvents: data.replay.events });
    }
    if (data.rescue_handoff?.reports) {
      set({ rescueReports: data.rescue_handoff.reports });
    }
    if (data.logistics?.stations) {
      set({ chargingStations: data.logistics.stations });
    }
    if (data.provenance?.records) {
      set({ provenanceRecords: data.provenance.records });
    }
    if (data.hal) {
      set({ halState: data.hal });
    }
  },
}));
