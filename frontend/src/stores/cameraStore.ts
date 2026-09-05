import { create } from 'zustand';

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

export interface DroneCameraFrame {
  drone_id: string;
  stream_type: 'RGB' | 'THERMAL';
  image_b64?: string;
  pose: CameraPoseSync;
  imu?: Record<string, any>;
  gps?: Record<string, any>;
  depth_m?: number;
  jscc?: DeepJsccMetrics;
  timestamp: number;
}

interface CameraStoreState {
  frames: Record<string, DroneCameraFrame>;
  activeStreamDrone: string;
  activeModality: 'RGB' | 'THERMAL';
  isMultiGridOpen: boolean;
  videoSourceMode: 'MJPEG' | 'WEBSOCKET';
  simHost: string;

  updateFrame: (frame: DroneCameraFrame) => void;
  setActiveStreamDrone: (droneId: string) => void;
  setActiveModality: (modality: 'RGB' | 'THERMAL') => void;
  toggleMultiGrid: () => void;
  setMultiGridOpen: (open: boolean) => void;
  setVideoSourceMode: (mode: 'MJPEG' | 'WEBSOCKET') => void;
  setSimHost: (host: string) => void;
}

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

export const useCameraStore = create<CameraStoreState>((set) => ({
  frames: {},
  activeStreamDrone: 'uav_alpha',
  activeModality: 'RGB',
  isMultiGridOpen: false,
  videoSourceMode: 'MJPEG',
  simHost: getInitialSimHost(),

  updateFrame: (frame) =>
    set((state) => ({
      frames: {
        ...state.frames,
        [frame.drone_id]: frame,
      },
    })),

  setActiveStreamDrone: (droneId) => set({ activeStreamDrone: droneId }),
  setActiveModality: (modality) => set({ activeModality: modality }),
  toggleMultiGrid: () => set((state) => ({ isMultiGridOpen: !state.isMultiGridOpen })),
  setMultiGridOpen: (open) => set({ isMultiGridOpen: open }),
  setVideoSourceMode: (mode) => set({ videoSourceMode: mode }),
  setSimHost: (host) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sutra_sim_host', host);
    }
    set({ simHost: host });
  },
}));
