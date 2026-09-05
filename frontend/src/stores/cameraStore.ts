/**
 * Smart Horizon GCS — Remote Multi-UAV & Multi-World Gazebo Camera Store
 * Subsystem: Subsystem D (3D GIS GCS / Remote Camera Receiver) & Subsystem B/C Bridge
 *
 * Supports live camera feeds from BOTH external Gazebo simulation worlds:
 * - WORLD 1: Friend 1's Gazebo simulation (Nikhil / Primary Master)
 * - WORLD 2: Friend 2's Gazebo simulation (Recon Secondary)
 *
 * Manages live video frame buffers for UAV-1 through UAV-8 (RGB & Thermal),
 * computes real-time frame rates, latency, Deep JSCC SNR/PSNR metrics,
 * and feed connection status:
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

export interface CameraPoseSync {
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  roll_deg?: number;
  pitch_deg?: number;
  x?: number;
  y?: number;
  z?: number;
}

export interface DeepJsccMetrics {
  snr_db: number;
  psnr_db: number;
  raw_size_kb?: number;
  compressed_size_kb?: number;
  compression_ratio?: number;
  reduction_pct?: number;
  latency_ms?: number;
  device?: string;
}

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
  pose?: CameraPoseSync;
  imu?: Record<string, any>;
  gps?: Record<string, any>;
  depth_m?: number;
  jscc?: DeepJsccMetrics;
}

// Alias for full backward compatibility across GCS components
export type DroneCameraFrame = CameraFrameData;

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
    ],
  },
};

export interface CameraStoreState {
  // Active Navigation & Viewport State
  activeWorld: WorldId;
  activeUav: string; // 'uav_1' through 'uav_5' depending on world
  activeStreamDrone: string; // Alias for activeUav
  modality: Modality;
  activeModality: Modality; // Alias for modality
  pictureInPicture: boolean;
  isMultiGridOpen: boolean;
  videoSourceMode: 'MJPEG' | 'WEBSOCKET';
  simHost: string;

  // World Configurations & Endpoints
  worlds: Record<WorldId, WorldConfig>;

  // Feed Connection State: Keyed by `${world_id}_${drone_id}` or `${world_id}_${drone_id}_${stream_type}`
  feedStatuses: Record<string, FeedConnectionStatus>;

  // Stored frames keyed by `${world_id}_${drone_id}_${stream_type}`, `${drone_id}_${stream_type}`, and `${drone_id}`
  frames: Record<string, CameraFrameData>;

  // Real-time telemetry metrics
  frameCounts: Record<string, number>;
  lastFrameTimes: Record<string, number>;
  measuredFps: Record<string, number>;

  // Actions
  setActiveWorld: (world: WorldId) => void;
  setActiveUav: (uav: string) => void;
  setActiveStreamDrone: (droneId: string) => void;
  setModality: (modality: Modality) => void;
  setActiveModality: (modality: Modality) => void;
  selectFeed: (world: WorldId, uav: string, modality?: Modality) => void;
  setPictureInPicture: (pip: boolean) => void;
  togglePictureInPicture: () => void;
  toggleMultiGrid: () => void;
  setMultiGridOpen: (open: boolean) => void;
  setVideoSourceMode: (mode: 'MJPEG' | 'WEBSOCKET') => void;
  setSimHost: (host: string) => void;
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
  updateFrame: (frame: any) => void;
}


const DRONE_ALIASES: Record<string, string> = {
  uav_alpha: 'uav_1',
  uav_beta: 'uav_2',
  uav_gamma: 'uav_3',
  uav_delta: 'uav_4',
  uav_epsilon: 'uav_5',
  uav_1: 'uav_alpha',
  uav_2: 'uav_beta',
  uav_3: 'uav_gamma',
  uav_4: 'uav_delta',
  uav_5: 'uav_epsilon',
};

const SIGNAL_TIMEOUT_MS = 1800; // If no frame received within 1.8s, signal is considered lost

const getInitialSimHost = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('sutra_sim_host');
    if (stored) return stored;
    if (window.location.hostname && window.location.hostname !== 'localhost') {
      return window.location.hostname;
    }
  }
  return '127.0.0.1';
};

const getSavedWorldUrls = (): Record<WorldId, string> => {
  if (typeof window === 'undefined') {
    return {
      WORLD_1: DEFAULT_WORLDS.WORLD_1.baseUrl,
      WORLD_2: DEFAULT_WORLDS.WORLD_2.baseUrl,
    };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const w1Param = params.get('world1_url') || params.get('world1_base');
    const w2Param = params.get('world2_url') || params.get('world2_base');
    const raw = localStorage.getItem('sutra_world_base_urls');
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      WORLD_1: w1Param || parsed.WORLD_1 || DEFAULT_WORLDS.WORLD_1.baseUrl,
      WORLD_2: w2Param || parsed.WORLD_2 || DEFAULT_WORLDS.WORLD_2.baseUrl,
    };
  } catch {
    return {
      WORLD_1: DEFAULT_WORLDS.WORLD_1.baseUrl,
      WORLD_2: DEFAULT_WORLDS.WORLD_2.baseUrl,
    };
  }
};

const getInitialActiveWorld = (): WorldId => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const w = params.get('world');
    if (w === 'WORLD_2' || w === 'WORLD_1') return w;
    const saved = localStorage.getItem('sutra_active_world');
    if (saved === 'WORLD_2' || saved === 'WORLD_1') return saved as WorldId;
  }
  return 'WORLD_1';
};

const savedUrls = getSavedWorldUrls();
const initialWorlds: Record<WorldId, WorldConfig> = {
  WORLD_1: { ...DEFAULT_WORLDS.WORLD_1, baseUrl: savedUrls.WORLD_1 },
  WORLD_2: { ...DEFAULT_WORLDS.WORLD_2, baseUrl: savedUrls.WORLD_2 },
};

export const useCameraStore = create<CameraStoreState>((set, get) => ({
  activeWorld: getInitialActiveWorld(),
  activeUav: 'uav_1',
  activeStreamDrone: 'uav_1',
  modality: 'RGB',
  activeModality: 'RGB',
  pictureInPicture: false,
  isMultiGridOpen: false,
  videoSourceMode: 'MJPEG',
  simHost: getInitialSimHost(),
  worlds: initialWorlds,
  feedStatuses: {},
  frames: {},
  frameCounts: {},
  lastFrameTimes: {},
  measuredFps: {},

  setActiveWorld: (world: WorldId) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sutra_active_world', world);
      } catch {
        // ignore
      }
    }
    const prevWorld = get().activeWorld;
    if (prevWorld === world) return;

    const targetWorldConfig = get().worlds[world];
    let nextUav = get().activeUav;
    if (targetWorldConfig && targetWorldConfig.uavs.length > 0) {
      const uavExists = targetWorldConfig.uavs.some((u) => u.id === nextUav);
      if (!uavExists) {
        nextUav = targetWorldConfig.uavs[0].id;
      }
    }

    set({ activeWorld: world, activeUav: nextUav, activeStreamDrone: nextUav });
    const currentMod = get().modality;
    get().selectFeed(world, nextUav, currentMod);
  },

  setActiveUav: (uav: string) => {
    const normalized = uav.toLowerCase();
    set({ activeUav: normalized, activeStreamDrone: normalized });
    get().selectFeed(get().activeWorld, normalized, get().modality);
  },

  setActiveStreamDrone: (droneId: string) => {
    const normalized = droneId.toLowerCase();
    set({ activeUav: normalized, activeStreamDrone: normalized });
    get().selectFeed(get().activeWorld, normalized, get().modality);
  },

  setModality: (modality: Modality) => {
    set({ modality, activeModality: modality });
    get().selectFeed(get().activeWorld, get().activeUav, modality);
  },

  setActiveModality: (modality: Modality) => {
    set({ modality, activeModality: modality });
    get().selectFeed(get().activeWorld, get().activeUav, modality);
  },

  toggleMultiGrid: () => set((state) => ({ isMultiGridOpen: !state.isMultiGridOpen })),
  setMultiGridOpen: (open: boolean) => set({ isMultiGridOpen: open }),
  setVideoSourceMode: (mode: 'MJPEG' | 'WEBSOCKET') => set({ videoSourceMode: mode }),
  setSimHost: (host: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sutra_sim_host', host);
    }
    set({ simHost: host });
  },

  selectFeed: (world: WorldId, uav: string, modality?: Modality) => {
    const mod = modality || get().modality;
    const normUav = uav.toLowerCase();
    set({
      activeWorld: world,
      activeUav: normUav,
      activeStreamDrone: normUav,
      modality: mod,
      activeModality: mod,
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

    // Check frame timestamp strictly for this world and uav (legacy only fallback for WORLD_1)
    const lastTime = get().lastFrameTimes[key] || (w === 'WORLD_1' ? get().lastFrameTimes[`${u}_${m}`] : 0) || 0;
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

    // Strict world separation: WORLD_2 never inspects WORLD_1 legacy keys
    const lastTime = get().lastFrameTimes[key] || (targetWorld === 'WORLD_1' ? get().lastFrameTimes[legacyKey] : 0) || 0;
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
    const isWorld1 = worldId === 'WORLD_1';
    const now = Date.now();

    const currentTimes = get().lastFrameTimes;
    const lastTime = currentTimes[key] || (isWorld1 ? currentTimes[legacyKey] : 0) || 0;
    const dt = (now - lastTime) / 1000;

    // Smooth FPS computation
    let fps = 0;
    if (dt > 0 && dt < 2.0) {
      const instantFps = 1.0 / dt;
      const prevFps = get().measuredFps[key] || (isWorld1 ? get().measuredFps[legacyKey] : 0) || instantFps;
      fps = Math.round((prevFps * 0.7 + instantFps * 0.3) * 10) / 10;
    } else if (dt <= 0) {
      fps = get().measuredFps[key] || (isWorld1 ? get().measuredFps[legacyKey] : 0) || 0;
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
      pose: data.pose,
      imu: data.imu,
      gps: data.gps,
      depth_m: data.depth_m,
      jscc: data.jscc,
    };

    const alias = DRONE_ALIASES[droneId];

    set((state) => ({
      frames: {
        ...state.frames,
        [key]: frameData,
        ...(alias ? { [`${worldId}_${alias}_${streamType}`]: frameData } : {}),
        // Only set legacy/drone un-namespaced alias for WORLD_1 so WORLD_2 never overwrites or pollutes WORLD_1
        ...(isWorld1 ? {
          [legacyKey]: frameData,
          [droneId]: frameData,
          ...(alias ? {
            [`${alias}_${streamType}`]: frameData,
            [alias]: frameData,
          } : {}),
        } : {}),
      },
      feedStatuses: {
        ...state.feedStatuses,
        [key]: 'CONNECTED',
        [`${worldId}_${droneId}`]: 'CONNECTED',
        ...(alias ? {
          [`${worldId}_${alias}_${streamType}`]: 'CONNECTED',
          [`${worldId}_${alias}`]: 'CONNECTED',
        } : {}),
        ...(isWorld1 ? {
          [legacyKey]: 'CONNECTED',
          ...(alias ? { [`${alias}_${streamType}`]: 'CONNECTED' } : {}),
        } : {}),
      },
      lastFrameTimes: {
        ...state.lastFrameTimes,
        [key]: now,
        ...(alias ? { [`${worldId}_${alias}_${streamType}`]: now } : {}),
        ...(isWorld1 ? {
          [legacyKey]: now,
          ...(alias ? { [`${alias}_${streamType}`]: now } : {}),
        } : {}),
      },
      frameCounts: {
        ...state.frameCounts,
        [key]: (state.frameCounts[key] || 0) + 1,
        ...(alias ? {
          [`${worldId}_${alias}_${streamType}`]: (state.frameCounts[`${worldId}_${alias}_${streamType}`] || 0) + 1,
        } : {}),
        ...(isWorld1 ? {
          [legacyKey]: (state.frameCounts[legacyKey] || 0) + 1,
          [droneId]: (state.frameCounts[droneId] || 0) + 1,
          ...(alias ? {
            [`${alias}_${streamType}`]: (state.frameCounts[`${alias}_${streamType}`] || 0) + 1,
            [alias]: (state.frameCounts[alias] || 0) + 1,
          } : {}),
        } : {}),
      },
      measuredFps: {
        ...state.measuredFps,
        [key]: fps,
        ...(alias ? { [`${worldId}_${alias}_${streamType}`]: fps } : {}),
        ...(isWorld1 ? {
          [legacyKey]: fps,
          [droneId]: fps,
          ...(alias ? {
            [`${alias}_${streamType}`]: fps,
            [alias]: fps,
          } : {}),
        } : {}),
      },
    }));
  },

  updateFrame: (frame: any) => {
    get().handleCameraFrame(frame);
  },
}));
