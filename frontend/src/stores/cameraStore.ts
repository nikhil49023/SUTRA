/**
 * Smart Horizon GCS — Remote Multi-UAV & Multi-World Gazebo Camera Store
 * Subsystem: Subsystem D (3D GIS GCS / Remote Camera Receiver)
 *
 * Supports live camera feeds from BOTH external Gazebo simulation worlds:
 * - WORLD 1: Friend 1's Gazebo simulation (Nikhil / Primary Master)
 * - WORLD 2: Friend 2's Gazebo simulation (Recon Secondary)
 *
 * Manages live video frame buffers for UAV-1 through UAV-8 (RGB & Thermal),
 * computes real-time frame rates, latency, and feed connection status:
 *   - CONNECTED
 *   - CONNECTING
 *   - OFFLINE
 *
 * Strictly adheres to Zero-Mock Benchmark Rule:
 * Status reflects actual frame arrival and connection heartbeats.
 */

import { create } from 'zustand';
import { wsClient } from '../communication/WebSocketClient';

export type WorldId = 'WORLD_1' | 'WORLD_2';
export type Modality = 'RGB' | 'THERMAL';
export type FeedConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'OFFLINE';

export interface UavStreamInfo {
  id: string; // 'uav_1' through 'uav_8'
  label: string; // 'UAV-1'
  name: string; // 'Alpha Recon'
}

export interface WorldConfig {
  id: WorldId;
  label: string;
  name: string;
  owner: string;
  description: string;
  baseUrl: string;
  uavs: UavStreamInfo[];
}

export interface CameraFrameData {
  world_id?: string;
  drone_id: string;
  stream_type: Modality;
  image_b64?: string;
  stream_url?: string;
  topic?: string;
  timestamp: number;
  width?: number;
  height?: number;
  size_kb?: number;
  raw_size_kb?: number;
  compressed_size_kb?: number;
  reduction_pct?: number;
  latency_ms?: number;
}

export const DEFAULT_WORLDS: Record<WorldId, WorldConfig> = {
  WORLD_1: {
    id: 'WORLD_1',
    label: 'WORLD 1',
    name: "Friend 1's Gazebo World",
    owner: 'Friend 1 (Nikhil - Primary Master)',
    description: 'Disaster zone search & rescue flood basin simulation',
    baseUrl: 'http://10.152.0.191:8080',
    uavs: [
      { id: 'uav_1', label: 'UAV-1', name: 'Alpha Recon' },
      { id: 'uav_2', label: 'UAV-2', name: 'Bravo Scout' },
      { id: 'uav_3', label: 'UAV-3', name: 'Charlie Relay' },
      { id: 'uav_4', label: 'UAV-4', name: 'Delta SAR' },
      { id: 'uav_5', label: 'UAV-5', name: 'Echo Patrol' },
      { id: 'uav_6', label: 'UAV-6', name: 'Foxtrot Flank' },
      { id: 'uav_7', label: 'UAV-7', name: 'Golf Perimeter' },
      { id: 'uav_8', label: 'UAV-8', name: 'Hotel Rear' },
    ],
  },
  WORLD_2: {
    id: 'WORLD_2',
    label: 'WORLD 2',
    name: "Friend 2's Gazebo World",
    owner: 'Friend 2 (Recon Secondary)',
    description: 'Tactical perimeter & high-altitude corridor simulation',
    baseUrl: 'http://10.152.0.192:8080',
    uavs: [
      { id: 'uav_1', label: 'UAV-1', name: 'Vector-1 Alpha' },
      { id: 'uav_2', label: 'UAV-2', name: 'Vector-2 Bravo' },
      { id: 'uav_3', label: 'UAV-3', name: 'Vector-3 Charlie' },
      { id: 'uav_4', label: 'UAV-4', name: 'Vector-4 Delta' },
      { id: 'uav_5', label: 'UAV-5', name: 'Vector-5 Echo' },
      { id: 'uav_6', label: 'UAV-6', name: 'Vector-6 Foxtrot' },
      { id: 'uav_7', label: 'UAV-7', name: 'Vector-7 Golf' },
      { id: 'uav_8', label: 'UAV-8', name: 'Vector-8 Hotel' },
    ],
  },
};

export interface CameraStoreState {
  // Active Navigation & Viewport State
  activeWorld: WorldId;
  activeUav: string; // 'uav_1' through 'uav_8'
  modality: Modality;
  pictureInPicture: boolean;

  // World Configurations & Endpoints
  worlds: Record<WorldId, WorldConfig>;

  // Feed Connection State: Keyed by `${world_id}_${drone_id}` or `${world_id}_${drone_id}_${stream_type}`
  feedStatuses: Record<string, FeedConnectionStatus>;

  // Stored frames keyed by `${world_id}_${drone_id}_${stream_type}` and `${drone_id}_${stream_type}`
  frames: Record<string, CameraFrameData>;

  // Real-time telemetry metrics
  frameCounts: Record<string, number>;
  lastFrameTimes: Record<string, number>;
  measuredFps: Record<string, number>;

  // Actions
  setActiveWorld: (world: WorldId) => void;
  setActiveUav: (uav: string) => void;
  setModality: (modality: Modality) => void;
  selectFeed: (world: WorldId, uav: string, modality?: Modality) => void;
  setPictureInPicture: (pip: boolean) => void;
  togglePictureInPicture: () => void;
  setWorldBaseUrl: (world: WorldId, url: string) => void;

  // Feed status reporting & manipulation
  markFeedConnected: (world?: WorldId, uav?: string, mod?: Modality) => void;
  markFeedConnecting: (world?: WorldId, uav?: string, mod?: Modality) => void;
  markFeedOffline: (world?: WorldId, uav?: string, mod?: Modality) => void;
  getFeedStatus: (world?: WorldId, uav?: string, mod?: Modality) => FeedConnectionStatus;
  getWorldStatus: (world: WorldId) => FeedConnectionStatus;

  // Signal status compatibility helper (Returns 'LIVE' | 'NO_SIGNAL' for backward test compatibility)
  getSignalStatus: (uav?: string, mod?: Modality, world?: WorldId) => 'LIVE' | 'NO_SIGNAL';

  // Feed identification & stream resolution helpers
  getStreamUrl: (world?: WorldId, uav?: string, mod?: Modality) => string;
  getStreamTopic: (world?: WorldId, uav?: string, mod?: Modality) => string;

  // Ingestion
  handleCameraFrame: (data: any) => void;
}

const SIGNAL_TIMEOUT_MS = 1800; // If no frame received within 1.8s, signal is considered lost

const getSavedWorldUrls = (): Record<WorldId, string> => {
  if (typeof window === 'undefined') {
    return {
      WORLD_1: DEFAULT_WORLDS.WORLD_1.baseUrl,
      WORLD_2: DEFAULT_WORLDS.WORLD_2.baseUrl,
    };
  }
  try {
    const raw = localStorage.getItem('sutra_world_base_urls');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        WORLD_1: parsed.WORLD_1 || DEFAULT_WORLDS.WORLD_1.baseUrl,
        WORLD_2: parsed.WORLD_2 || DEFAULT_WORLDS.WORLD_2.baseUrl,
      };
    }
  } catch {
    // ignore
  }
  return {
    WORLD_1: DEFAULT_WORLDS.WORLD_1.baseUrl,
    WORLD_2: DEFAULT_WORLDS.WORLD_2.baseUrl,
  };
};

const savedUrls = getSavedWorldUrls();
const initialWorlds: Record<WorldId, WorldConfig> = {
  WORLD_1: { ...DEFAULT_WORLDS.WORLD_1, baseUrl: savedUrls.WORLD_1 },
  WORLD_2: { ...DEFAULT_WORLDS.WORLD_2, baseUrl: savedUrls.WORLD_2 },
};

export const useCameraStore = create<CameraStoreState>((set, get) => ({
  activeWorld: 'WORLD_1',
  activeUav: 'uav_1',
  modality: 'RGB',
  pictureInPicture: false,
  worlds: initialWorlds,
  feedStatuses: {},
  frames: {},
  frameCounts: {},
  lastFrameTimes: {},
  measuredFps: {},

  setActiveWorld: (world: WorldId) => {
    const prevWorld = get().activeWorld;
    if (prevWorld === world) return;

    set({ activeWorld: world });
    const currentUav = get().activeUav;
    const currentMod = get().modality;
    get().selectFeed(world, currentUav, currentMod);
  },

  setActiveUav: (uav: string) => {
    const normalized = uav.toLowerCase();
    set({ activeUav: normalized });
    get().selectFeed(get().activeWorld, normalized, get().modality);
  },

  setModality: (modality: Modality) => {
    set({ modality });
    get().selectFeed(get().activeWorld, get().activeUav, modality);
  },

  selectFeed: (world: WorldId, uav: string, modality?: Modality) => {
    const mod = modality || get().modality;
    const normUav = uav.toLowerCase();
    set({
      activeWorld: world,
      activeUav: normUav,
      modality: mod,
    });

    const streamUrl = get().getStreamUrl(world, normUav, mod);
    const topic = get().getStreamTopic(world, normUav, mod);
    const now = Date.now();

    // Mark active feed connecting
    get().markFeedConnecting(world, normUav, mod);

    // Notify backend and Subsystem C via WebSocket
    try {
      const selectPacket = {
        type: 'SELECT_STREAM',
        command: 'camera.select_stream',
        world_id: world,
        drone_id: normUav,
        modality: mod,
        stream_url: streamUrl,
        topic,
        timestamp: now,
        payload: {
          world_id: world,
          drone_id: normUav,
          modality: mod,
          stream_url: streamUrl,
          topic,
          timestamp: now,
        },
      };
      wsClient.sendRaw(JSON.stringify(selectPacket));
    } catch {
      // ignore WS dispatch error in tests
    }
  },

  setPictureInPicture: (pip: boolean) => set({ pictureInPicture: pip }),

  togglePictureInPicture: () => set((s) => ({ pictureInPicture: !s.pictureInPicture })),

  setWorldBaseUrl: (world: WorldId, url: string) => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    set((state) => {
      const updated = {
        ...state.worlds,
        [world]: {
          ...state.worlds[world],
          baseUrl: cleanUrl,
        },
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            'sutra_world_base_urls',
            JSON.stringify({
              WORLD_1: updated.WORLD_1.baseUrl,
              WORLD_2: updated.WORLD_2.baseUrl,
            })
          );
        } catch {
          // ignore
        }
      }
      return { worlds: updated };
    });
  },

  markFeedConnected: (world?: WorldId, uav?: string, mod?: Modality) => {
    const w = world || get().activeWorld;
    const u = (uav || get().activeUav).toLowerCase();
    const m = mod || get().modality;
    const key = `${w}_${u}_${m}`;
    const legacyKey = `${u}_${m}`;
    const now = Date.now();

    set((s) => ({
      feedStatuses: {
        ...s.feedStatuses,
        [key]: 'CONNECTED',
        [`${w}_${u}`]: 'CONNECTED',
      },
      lastFrameTimes: {
        ...s.lastFrameTimes,
        [key]: now,
        [legacyKey]: now,
      },
    }));
  },

  markFeedConnecting: (world?: WorldId, uav?: string, mod?: Modality) => {
    const w = world || get().activeWorld;
    const u = (uav || get().activeUav).toLowerCase();
    const m = mod || get().modality;
    const key = `${w}_${u}_${m}`;

    set((s) => ({
      feedStatuses: {
        ...s.feedStatuses,
        [key]: 'CONNECTING',
        [`${w}_${u}`]: 'CONNECTING',
      },
    }));
  },

  markFeedOffline: (world?: WorldId, uav?: string, mod?: Modality) => {
    const w = world || get().activeWorld;
    const u = (uav || get().activeUav).toLowerCase();
    const m = mod || get().modality;
    const key = `${w}_${u}_${m}`;

    set((s) => ({
      feedStatuses: {
        ...s.feedStatuses,
        [key]: 'OFFLINE',
        [`${w}_${u}`]: 'OFFLINE',
      },
    }));
  },

  getFeedStatus: (world?: WorldId, uav?: string, mod?: Modality): FeedConnectionStatus => {
    const w = world || get().activeWorld;
    const u = (uav || get().activeUav).toLowerCase();
    const m = mod || get().modality;
    const key = `${w}_${u}_${m}`;

    // Check explicit feed status
    const explicit = get().feedStatuses[key] || get().feedStatuses[`${w}_${u}`];
    if (explicit) return explicit;

    // Check frame timestamp strictly for this world and uav
    const lastTime = get().lastFrameTimes[key] || 0;
    if (lastTime > 0 && Date.now() - lastTime < SIGNAL_TIMEOUT_MS) {
      return 'CONNECTED';
    }
    return 'OFFLINE';
  },

  getWorldStatus: (world: WorldId): FeedConnectionStatus => {
    const wConfig = get().worlds[world];
    if (!wConfig) return 'OFFLINE';

    let hasConnected = false;
    let hasConnecting = false;

    for (const uav of wConfig.uavs) {
      const status = get().getFeedStatus(world, uav.id);
      if (status === 'CONNECTED') {
        hasConnected = true;
        break;
      }
      if (status === 'CONNECTING') {
        hasConnecting = true;
      }
    }

    if (hasConnected) return 'CONNECTED';
    if (hasConnecting) return 'CONNECTING';
    return 'OFFLINE';
  },

  getSignalStatus: (uav?: string, mod?: Modality, world?: WorldId): 'LIVE' | 'NO_SIGNAL' => {
    const targetWorld = world || get().activeWorld;
    const targetUav = (uav || get().activeUav).toLowerCase();
    const targetMod = mod || get().modality;
    const key = `${targetWorld}_${targetUav}_${targetMod}`;
    const legacyKey = `${targetUav}_${targetMod}`;

    const lastTime = get().lastFrameTimes[key] || get().lastFrameTimes[legacyKey] || 0;
    const isLive = Date.now() - lastTime < SIGNAL_TIMEOUT_MS;
    return isLive ? 'LIVE' : 'NO_SIGNAL';
  },

  getStreamUrl: (world?: WorldId, uav?: string, mod?: Modality): string => {
    const w = world || get().activeWorld;
    const u = (uav || get().activeUav).toLowerCase();
    const m = mod || get().modality;
    const baseUrl = get().worlds[w]?.baseUrl || DEFAULT_WORLDS[w].baseUrl;

    if (m === 'THERMAL') {
      return `${baseUrl}/stream/${u}/thermal`;
    }
    return `${baseUrl}/stream/${u}`;
  },

  getStreamTopic: (world?: WorldId, uav?: string, mod?: Modality): string => {
    const w = world || get().activeWorld;
    const u = (uav || get().activeUav).toLowerCase();
    const m = mod || get().modality;
    const prefix = w === 'WORLD_2' ? '/world_2' : '';

    if (m === 'THERMAL') {
      return `${prefix}/${u}/thermal/image_raw`;
    }
    return `${prefix}/${u}/camera/image_raw`;
  },

  handleCameraFrame: (data: any) => {
    if (!data || !data.drone_id) return;
    const worldId = (data.world_id ? String(data.world_id).toUpperCase() : get().activeWorld) as WorldId;
    const droneId = String(data.drone_id).toLowerCase();
    const streamType = (data.stream_type || 'RGB').toUpperCase() as Modality;
    const key = `${worldId}_${droneId}_${streamType}`;
    const legacyKey = `${droneId}_${streamType}`;
    const now = Date.now();

    const currentTimes = get().lastFrameTimes;
    const lastTime = currentTimes[key] || currentTimes[legacyKey] || 0;
    const dt = (now - lastTime) / 1000;

    // Smooth FPS computation
    let fps = 0;
    if (dt > 0 && dt < 2.0) {
      const instantFps = 1.0 / dt;
      const prevFps = get().measuredFps[key] || get().measuredFps[legacyKey] || instantFps;
      fps = Math.round((prevFps * 0.7 + instantFps * 0.3) * 10) / 10;
    } else if (dt <= 0) {
      fps = get().measuredFps[key] || get().measuredFps[legacyKey] || 0;
    }

    const frameData: CameraFrameData = {
      world_id: worldId,
      drone_id: droneId,
      stream_type: streamType,
      image_b64: data.image_b64,
      stream_url: data.stream_url || get().getStreamUrl(worldId, droneId, streamType),
      topic: data.topic || get().getStreamTopic(worldId, droneId, streamType),
      timestamp: data.timestamp || now,
      width: data.width || 640,
      height: data.height || 360,
      size_kb: data.size_kb || data.compressed_size_kb || Math.round(((data.image_b64?.length || 0) * 0.75) / 1024),
      raw_size_kb: data.raw_size_kb,
      compressed_size_kb: data.compressed_size_kb,
      reduction_pct: data.reduction_pct,
      latency_ms: data.latency_ms || Math.max(5, Math.round(now - (data.timestamp || now))),
    };

    set((state) => ({
      frames: {
        ...state.frames,
        [key]: frameData,
        [legacyKey]: frameData, // Alias for backward compatibility
      },
      feedStatuses: {
        ...state.feedStatuses,
        [key]: 'CONNECTED',
        [`${worldId}_${droneId}`]: 'CONNECTED',
      },
      lastFrameTimes: {
        ...state.lastFrameTimes,
        [key]: now,
        [legacyKey]: now,
      },
      frameCounts: {
        ...state.frameCounts,
        [key]: (state.frameCounts[key] || 0) + 1,
        [legacyKey]: (state.frameCounts[legacyKey] || 0) + 1,
      },
      measuredFps: {
        ...state.measuredFps,
        [key]: fps,
        [legacyKey]: fps,
      },
    }));
  },
}));
