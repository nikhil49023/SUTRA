/**
 * Smart Horizon GCS — Remote Multi-UAV Camera Store
 * Subsystem: Subsystem D (3D GIS GCS / Remote Camera Receiver)
 *
 * Manages live video frame buffers for UAV-1 through UAV-8 (RGB & Thermal),
 * computes real-time frame rates, frame latency, and LIVE / NO SIGNAL status.
 * Strictly adheres to Zero-Mock Benchmark Rule:
 * If no frames are received from ROS 2, status remains NO SIGNAL.
 */

import { create } from 'zustand';

export interface CameraFrameData {
  drone_id: string;
  stream_type: 'RGB' | 'THERMAL';
  image_b64: string;
  timestamp: number;
  width?: number;
  height?: number;
  size_kb?: number;
  raw_size_kb?: number;
  compressed_size_kb?: number;
  reduction_pct?: number;
  latency_ms?: number;
}

export interface CameraStoreState {
  activeUav: string; // 'uav_1' through 'uav_8'
  modality: 'RGB' | 'THERMAL';
  pictureInPicture: boolean;
  
  // Stored frames keyed by `${drone_id}_${stream_type}`
  frames: Record<string, CameraFrameData>;
  
  // Real-time metrics
  frameCounts: Record<string, number>;
  lastFrameTimes: Record<string, number>;
  measuredFps: Record<string, number>;
  
  // Actions
  setActiveUav: (uav: string) => void;
  setModality: (modality: 'RGB' | 'THERMAL') => void;
  setPictureInPicture: (pip: boolean) => void;
  togglePictureInPicture: () => void;
  handleCameraFrame: (data: any) => void;
  getSignalStatus: (uav?: string, mod?: 'RGB' | 'THERMAL') => 'LIVE' | 'NO_SIGNAL';
}

const SIGNAL_TIMEOUT_MS = 1800; // If no frame received within 1.8s, signal is considered lost

export const useCameraStore = create<CameraStoreState>((set, get) => ({
  activeUav: 'uav_1',
  modality: 'RGB',
  pictureInPicture: false,
  frames: {},
  frameCounts: {},
  lastFrameTimes: {},
  measuredFps: {},

  setActiveUav: (uav: string) => set({ activeUav: uav }),
  
  setModality: (modality: 'RGB' | 'THERMAL') => set({ modality }),
  
  setPictureInPicture: (pip: boolean) => set({ pictureInPicture: pip }),
  
  togglePictureInPicture: () => set((s) => ({ pictureInPicture: !s.pictureInPicture })),

  handleCameraFrame: (data: any) => {
    if (!data || !data.drone_id) return;
    const droneId = String(data.drone_id).toLowerCase();
    const streamType = (data.stream_type || 'RGB').toUpperCase() as 'RGB' | 'THERMAL';
    const key = `${droneId}_${streamType}`;
    const now = Date.now();

    const currentTimes = get().lastFrameTimes;
    const lastTime = currentTimes[key] || 0;
    const dt = (now - lastTime) / 1000;
    
    // Smooth FPS computation
    let fps = 0;
    if (dt > 0 && dt < 2.0) {
      const instantFps = 1.0 / dt;
      const prevFps = get().measuredFps[key] || instantFps;
      fps = Math.round((prevFps * 0.7 + instantFps * 0.3) * 10) / 10;
    } else if (dt <= 0) {
      fps = get().measuredFps[key] || 0;
    }

    const frameData: CameraFrameData = {
      drone_id: droneId,
      stream_type: streamType,
      image_b64: data.image_b64,
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
      },
      lastFrameTimes: {
        ...state.lastFrameTimes,
        [key]: now,
      },
      frameCounts: {
        ...state.frameCounts,
        [key]: (state.frameCounts[key] || 0) + 1,
      },
      measuredFps: {
        ...state.measuredFps,
        [key]: fps,
      },
    }));
  },

  getSignalStatus: (uav?: string, mod?: 'RGB' | 'THERMAL') => {
    const targetUav = (uav || get().activeUav).toLowerCase();
    const targetMod = mod || get().modality;
    const key = `${targetUav}_${targetMod}`;
    const lastTime = get().lastFrameTimes[key] || 0;
    const isLive = Date.now() - lastTime < SIGNAL_TIMEOUT_MS;
    return isLive ? 'LIVE' : 'NO_SIGNAL';
  },
}));
