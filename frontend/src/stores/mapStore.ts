/**
 * Smart Horizon GCS — Map Interaction & Tool State Store
 * Subsystem: Map Engine & Interactive Tools (Phase 13 Hardened)
 */

import { create } from 'zustand';

export type MapInteractionMode = 'SELECT' | 'PAN' | 'ADD_WAYPOINT' | 'DRAW_GEOFENCE' | 'MEASURE';

interface MapStoreState {
  interactionMode: MapInteractionMode;
  lastMapClick: { lat: number; lng: number } | null;
  lastWaypointCommandStatus: 'NONE' | 'SENT' | 'SUCCESS' | 'FAILED';
  previewWaypoint: { latitude: number; longitude: number; altitude: number; speed: number } | null;

  setInteractionMode: (mode: MapInteractionMode) => void;
  setLastMapClick: (lat: number, lng: number) => void;
  setLastWaypointCommandStatus: (status: 'NONE' | 'SENT' | 'SUCCESS' | 'FAILED') => void;
  setPreviewWaypoint: (wp: { latitude: number; longitude: number; altitude: number; speed: number } | null) => void;
}

export const useMapStore = create<MapStoreState>((set) => ({
  interactionMode: 'SELECT',
  lastMapClick: null,
  lastWaypointCommandStatus: 'NONE',
  previewWaypoint: null,

  setInteractionMode: (interactionMode) => set({ interactionMode }),
  setLastMapClick: (lat, lng) => set({ lastMapClick: { lat, lng } }),
  setLastWaypointCommandStatus: (lastWaypointCommandStatus) => set({ lastWaypointCommandStatus }),
  setPreviewWaypoint: (previewWaypoint) => set({ previewWaypoint }),
}));
