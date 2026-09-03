import { create } from 'zustand';
import { TelemetryState } from '../types/telemetry';

type TelemetryListener = (droneId: string, telem: TelemetryState) => void;

interface TelemetryStoreState {
  activeDroneId: string;
  telemetryCache: Record<string, TelemetryState>;
  setActiveDroneId: (droneId: string) => void;
  updateTelemetry: (arg1: string | Partial<TelemetryState>, arg2?: Partial<TelemetryState>) => void;
  getTelemetry: (droneId?: string) => TelemetryState | undefined;
  subscribeToDrone: (droneId: string, listener: (telem: TelemetryState) => void) => () => void;
  hydrateFromSnapshot: (telemetryState: Partial<TelemetryState> | Record<string, TelemetryState>) => void;
}

const globalListeners = new Set<TelemetryListener>();
const droneListeners = new Map<string, Set<(telem: TelemetryState) => void>>();

export const registerTelemetryListener = (listener: TelemetryListener) => {
  globalListeners.add(listener);
  return () => {
    globalListeners.delete(listener);
  };
};

export const useTelemetryStore = create<TelemetryStoreState>((set, get) => ({
  activeDroneId: 'drone_alpha',
  telemetryCache: {
    drone_alpha: {
      drone_id: 'drone_alpha',
      timestamp: Date.now(),
      latitude: 37.774929,
      longitude: -122.419416,
      altitude_msl: 35.0,
      altitude_agl: 25.0,
      heading: 45.0,
      pitch: 1.2,
      roll: -0.5,
      yaw: 45.0,
      ground_speed: 6.5,
      air_speed: 6.8,
      vertical_speed: 0.0,
      battery_percent: 98.0,
      battery_voltage: 25.2,
      battery_current: 12.4,
      temperature: 28.5,
      satellites: 18,
      hdop: 0.8,
      gps_fix: 3,
      rssi: -58.0,
      latency_ms: 12,
      flight_mode: 'MISSION',
    },
  },

  setActiveDroneId: (activeDroneId) => set({ activeDroneId }),

  updateTelemetry: (arg1, arg2) => {
    let droneId = 'drone_alpha';
    let telemPartial: Partial<TelemetryState> = {};

    if (typeof arg1 === 'string') {
      droneId = arg1;
      telemPartial = arg2 || {};
    } else if (arg1 && typeof arg1 === 'object') {
      droneId = (arg1 as any).drone_id || 'drone_alpha';
      telemPartial = arg1;
    }

    set((s) => {
      const existing = s.telemetryCache[droneId] || {
        drone_id: droneId,
        timestamp: Date.now(),
        latitude: 37.774929,
        longitude: -122.419416,
        altitude_msl: 35.0,
        altitude_agl: 25.0,
        heading: 0,
        pitch: 0,
        roll: 0,
        yaw: 0,
        ground_speed: 0,
        air_speed: 0,
        vertical_speed: 0,
        battery_percent: 100,
        battery_voltage: 25.2,
        battery_current: 0,
        temperature: 25.0,
        satellites: 18,
        hdop: 0.8,
        gps_fix: 3,
        rssi: -60.0,
        latency_ms: 0,
        flight_mode: 'MISSION',
      };

      const updated = { ...existing, ...telemPartial, timestamp: Date.now() };

      // Dispatch to global rAF listeners
      globalListeners.forEach((fn) => fn(droneId, updated));

      // Dispatch to single-drone listeners
      const listeners = droneListeners.get(droneId);
      if (listeners) {
        listeners.forEach((fn) => fn(updated));
      }

      return {
        telemetryCache: {
          ...s.telemetryCache,
          [droneId]: updated,
        },
      };
    });
  },

  getTelemetry: (droneId) => {
    const id = droneId || get().activeDroneId;
    return get().telemetryCache[id];
  },

  subscribeToDrone: (droneId, listener) => {
    if (!droneListeners.has(droneId)) {
      droneListeners.set(droneId, new Set());
    }
    droneListeners.get(droneId)!.add(listener);

    return () => {
      const setRef = droneListeners.get(droneId);
      if (setRef) {
        setRef.delete(listener);
        if (setRef.size === 0) droneListeners.delete(droneId);
      }
    };
  },

  hydrateFromSnapshot: (telemetryState) =>
    set((s) => {
      if ((telemetryState as any).drone_id) {
        const single = telemetryState as TelemetryState;
        return {
          telemetryCache: {
            ...s.telemetryCache,
            [single.drone_id]: single,
          },
        };
      }
      return {
        telemetryCache: { ...s.telemetryCache, ...(telemetryState as Record<string, TelemetryState>) },
      };
    }),
}));
