/**
 * Smart Horizon GCS — Real-Time Geofence Red Zone Notification Store
 * Subsystem: Tactical Airspace Containment & Safety Incident Logging
 */

import { create } from 'zustand';
import { ZoneType } from '../types/geofence';
import { commandManager } from '../communication/CommandManager';

export type NotificationSeverity = 'CRITICAL_RED_ZONE' | 'PROXIMITY_WARNING' | 'ALTITUDE_VIOLATION' | 'RESOLVED';

export interface GeofenceBreachNotification {
  id: string;
  timestamp: number;
  last_updated: number;
  drone_id: string;
  drone_name: string;
  geofence_id: string;
  geofence_name: string;
  zone_type: ZoneType;
  severity: NotificationSeverity;
  message: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  distance_to_boundary_m: number;
  time_to_breach_s: number | null;
  is_inside: boolean;
  acknowledged: boolean;
  acknowledged_at?: number;
  action_taken?: string;
}

interface GeofenceNotificationState {
  notifications: GeofenceBreachNotification[];
  isAudioMuted: boolean;
  filterSeverity: 'ALL' | NotificationSeverity;
  filterDroneId: string;
  searchQuery: string;

  // Actions
  ingestProximityEvaluation: (notifs: Omit<GeofenceBreachNotification, 'id' | 'timestamp' | 'last_updated' | 'acknowledged'>[]) => void;
  acknowledgeNotification: (id: string) => void;
  acknowledgeAll: () => void;
  clearNotifications: () => void;
  toggleAudioMute: () => void;
  setFilterSeverity: (sev: 'ALL' | NotificationSeverity) => void;
  setFilterDroneId: (droneId: string) => void;
  setSearchQuery: (query: string) => void;
  triggerEmergencyRtl: (droneId: string, notificationId?: string) => void;
  triggerAutoDeflect: (droneId: string, notificationId?: string) => void;
}

export const useGeofenceNotificationStore = create<GeofenceNotificationState>((set, get) => ({
  notifications: [],
  isAudioMuted: false,
  filterSeverity: 'ALL',
  filterDroneId: 'ALL',
  searchQuery: '',

  ingestProximityEvaluation: (incomingList) => {
    set((state) => {
      let updated = [...state.notifications];
      const now = Date.now();

      incomingList.forEach((incoming) => {
        // Only track real warnings or critical red zone breaches
        if (incoming.severity === 'RESOLVED') return;

        const existingIdx = updated.findIndex(
          (n) => n.drone_id === incoming.drone_id && n.geofence_id === incoming.geofence_id && !n.acknowledged
        );

        if (existingIdx >= 0) {
          // Update active existing notification
          updated[existingIdx] = {
            ...updated[existingIdx],
            last_updated: now,
            latitude: incoming.latitude,
            longitude: incoming.longitude,
            altitude: incoming.altitude,
            speed: incoming.speed,
            heading: incoming.heading,
            distance_to_boundary_m: incoming.distance_to_boundary_m,
            time_to_breach_s: incoming.time_to_breach_s,
            is_inside: incoming.is_inside,
            severity: incoming.severity,
            message: incoming.message,
          };
        } else {
          // Create new rising notification
          const newNotif: GeofenceBreachNotification = {
            ...incoming,
            id: `notif-gf-${now}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: now,
            last_updated: now,
            acknowledged: false,
          };
          updated.unshift(newNotif);
        }
      });

      // Keep max 50 recent notifications
      if (updated.length > 50) {
        updated = updated.slice(0, 50);
      }

      return { notifications: updated };
    });
  },

  acknowledgeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, acknowledged: true, acknowledged_at: Date.now() } : n
      ),
    }));
  },

  acknowledgeAll: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        acknowledged: true,
        acknowledged_at: Date.now(),
      })),
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },

  toggleAudioMute: () => {
    set((state) => ({ isAudioMuted: !state.isAudioMuted }));
  },

  setFilterSeverity: (filterSeverity) => set({ filterSeverity }),
  setFilterDroneId: (filterDroneId) => set({ filterDroneId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  triggerEmergencyRtl: (droneId, notificationId) => {
    commandManager.sendCommand('drone.rtl', { drone_id: droneId });
    if (notificationId) {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId
            ? { ...n, action_taken: 'EMERGENCY_RTL_ENGAGED', acknowledged: true, acknowledged_at: Date.now() }
            : n
        ),
      }));
    }
  },

  triggerAutoDeflect: (droneId, notificationId) => {
    commandManager.sendCommand('drone.auto_deflect', { drone_id: droneId });
    if (notificationId) {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId
            ? { ...n, action_taken: 'AUTO_DEFLECT_APPLIED', acknowledged: true, acknowledged_at: Date.now() }
            : n
        ),
      }));
    }
  },
}));
