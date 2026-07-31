export type GCSEventType = 
  | 'AI_TARGET_DETECTED'
  | 'WAYPOINT_REACHED'
  | 'BATTERY_CRITICAL'
  | 'FLIGHT_MODE_CHANGED'
  | 'RTH_TRIGGERED'
  | 'SYSTEM_ALERT';

export interface GCSEventPayload {
  type: GCSEventType;
  timestamp: string;
  data: any;
}

export type GCSEventListener = (payload: GCSEventPayload) => void;

export class GCSGlobalEventBus {
  private static instance: GCSGlobalEventBus;
  private listeners: Map<GCSEventType, Set<GCSEventListener>> = new Map();

  private constructor() {}

  public static getInstance(): GCSGlobalEventBus {
    if (!GCSGlobalEventBus.instance) {
      GCSGlobalEventBus.instance = new GCSGlobalEventBus();
    }
    return GCSGlobalEventBus.instance;
  }

  public subscribe(eventType: GCSEventType, listener: GCSEventListener) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  public unsubscribe(eventType: GCSEventType, listener: GCSEventListener) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType)!.delete(listener);
    }
  }

  public emit(eventType: GCSEventType, data: any) {
    const payload: GCSEventPayload = {
      type: eventType,
      timestamp: new Date().toTimeString().split(' ')[0],
      data
    };

    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType)!.forEach((fn) => fn(payload));
    }
  }
}

export const eventBus = GCSGlobalEventBus.getInstance();
