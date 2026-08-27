/**
 * Smart Horizon GCS — Drone Status & Diagnostic Panel UI State Store
 *
 * Manages presentation/visibility state for MultiDroneDebugPanel:
 * - Only Dashboard (COMMAND / LIVEOPS) defaults to EXPANDED
 * - All other full-screen workspaces (MISSION, FLEET, GEOFENCE, GIS, AI, SETTINGS, LOGS) default to COLLAPSED
 * - User expand/collapse preferences are persisted per section in localStorage
 * - Keyboard shortcut toggle (Ctrl+D)
 * - Independent from backend and mission/fleet operational stores
 */

import { create } from 'zustand';

export type PanelDisplayMode = 'EXPANDED' | 'COLLAPSED' | 'HIDDEN';

export type PanelSectionKey =
  | 'COMMAND'
  | 'LIVEOPS'
  | 'MISSION'
  | 'FLEET'
  | 'GEOFENCE'
  | 'GIS'
  | 'AI'
  | 'SETTINGS'
  | 'LOGS';

const DEFAULT_SECTION_MODES: Record<string, PanelDisplayMode> = {
  COMMAND: 'EXPANDED',
  LIVEOPS: 'EXPANDED',
  MISSION: 'COLLAPSED',
  FLEET: 'COLLAPSED',
  GEOFENCE: 'COLLAPSED',
  GIS: 'COLLAPSED',
  AI: 'COLLAPSED',
  SETTINGS: 'COLLAPSED',
  LOGS: 'COLLAPSED',
};

const STORAGE_KEY = 'sh_gcs_drone_status_panel_preferences_v3';

function loadStoredPreferences(): Record<string, PanelDisplayMode> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SECTION_MODES, ...parsed };
    }
  } catch (e) {
    // Ignore storage parse errors
  }
  return { ...DEFAULT_SECTION_MODES };
}

function savePreferences(preferences: Record<string, PanelDisplayMode>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (e) {
    // Ignore storage write errors
  }
}

interface DroneStatusPanelState {
  sectionModes: Record<string, PanelDisplayMode>;
  isGloballyHidden: boolean;

  getModeForSection: (section: string) => PanelDisplayMode;
  setModeForSection: (section: string, mode: PanelDisplayMode) => void;
  toggleModeForSection: (section: string) => void;
  toggleGlobalVisibility: () => void;
  setGloballyHidden: (hidden: boolean) => void;
  resetToDefaults: () => void;
}

export const useDroneStatusPanelStore = create<DroneStatusPanelState>((set, get) => ({
  sectionModes: loadStoredPreferences(),
  isGloballyHidden: false,

  getModeForSection: (section: string) => {
    if (get().isGloballyHidden) return 'HIDDEN';
    const modes = get().sectionModes;
    return modes[section] || DEFAULT_SECTION_MODES[section] || 'COLLAPSED';
  },

  setModeForSection: (section: string, mode: PanelDisplayMode) => {
    set((state) => {
      const updated = { ...state.sectionModes, [section]: mode };
      savePreferences(updated);
      return { sectionModes: updated, isGloballyHidden: false };
    });
  },

  toggleModeForSection: (section: string) => {
    const currentMode = get().getModeForSection(section);
    const newMode: PanelDisplayMode = currentMode === 'EXPANDED' ? 'COLLAPSED' : 'EXPANDED';
    get().setModeForSection(section, newMode);
  },

  toggleGlobalVisibility: () => {
    set((state) => ({ isGloballyHidden: !state.isGloballyHidden }));
  },

  setGloballyHidden: (hidden: boolean) => {
    set({ isGloballyHidden: hidden });
  },

  resetToDefaults: () => {
    savePreferences(DEFAULT_SECTION_MODES);
    set({ sectionModes: { ...DEFAULT_SECTION_MODES }, isGloballyHidden: false });
  },
}));
