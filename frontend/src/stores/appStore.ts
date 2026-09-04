import { create } from 'zustand';
import { ApplicationState, NavigationSection, MapStyleType } from '../types/app';

const STORAGE_MAP_STYLE_KEY = 'sh_gcs_map_style_preference';

function loadStoredMapStyle(): MapStyleType {
  try {
    const saved = localStorage.getItem(STORAGE_MAP_STYLE_KEY);
    if (saved && ['tactical-dark', 'satellite', 'terrain', 'streets'].includes(saved)) {
      return saved as MapStyleType;
    }
  } catch (e) {
    // Ignore storage parse error
  }
  return 'tactical-dark';
}

function saveMapStyle(style: MapStyleType) {
  try {
    localStorage.setItem(STORAGE_MAP_STYLE_KEY, style);
  } catch (e) {
    // Ignore storage write error
  }
}

function getInitialSection(): NavigationSection {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const sec = params.get('section')?.toUpperCase();
    if (sec && ['COMMAND', 'MAPPING', 'MISSION', 'CAMERA', 'GEOFENCE', 'GIS', 'FLEET', 'AI', 'DISASTER_INTEL', 'RISK', 'SETTINGS'].includes(sec)) {
      return sec as NavigationSection;
    }
  }
  return 'MAPPING';
}

interface AppStoreState extends ApplicationState {
  activeSection: NavigationSection;
  isSidebarCollapsed: boolean;
  isInspectorOpen: boolean;
  isHudOpen: boolean;
  isConsoleOpen: boolean;
  activeConsoleTab: 'TELEMETRY' | 'MISSION' | 'SAFETY' | 'COMMUNICATION' | 'AI' | 'SYSTEM';
  theme: 'dark-tactical' | 'satellite' | 'high-contrast';
  units: 'metric' | 'imperial';
  mapStyle: MapStyleType;
  mapStyleLoading: boolean;
  telemetryRateHz: number;
  hudRefreshRateHz: number;
  emergencyModalOpen: boolean;
  emergencyTargetDrone: string;

  // Mode: Operations Mode vs Engineering Mode
  viewMode: 'OPERATIONS' | 'ENGINEERING';
  toggleViewMode: () => void;
  setViewMode: (mode: 'OPERATIONS' | 'ENGINEERING') => void;

  // Defensive Upgrades Modals
  failureLabOpen: boolean;
  setFailureLabOpen: (open: boolean) => void;
  replayOpen: boolean;
  setReplayOpen: (open: boolean) => void;
  rescueHandoffOpen: boolean;
  setRescueHandoffOpen: (open: boolean) => void;
  chargingLogisticsOpen: boolean;
  setChargingLogisticsOpen: (open: boolean) => void;
  provenanceOpen: boolean;
  setProvenanceOpen: (open: boolean) => void;
  halOpen: boolean;
  setHalOpen: (open: boolean) => void;
  degradationOpen: boolean;
  setDegradationOpen: (open: boolean) => void;
  architectureBoundaryOpen: boolean;
  setArchitectureBoundaryOpen: (open: boolean) => void;
  safetyGateOpen: boolean;
  setSafetyGateOpen: (open: boolean) => void;

  // Actions
  setActiveSection: (section: NavigationSection) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setInspectorOpen: (open: boolean) => void;
  toggleInspector: () => void;
  setHudOpen: (open: boolean) => void;
  toggleHud: () => void;
  setConsoleOpen: (open: boolean) => void;
  toggleConsole: () => void;
  setActiveConsoleTab: (tab: 'TELEMETRY' | 'MISSION' | 'SAFETY' | 'COMMUNICATION' | 'AI' | 'SYSTEM') => void;
  setTheme: (theme: 'dark-tactical' | 'satellite' | 'high-contrast') => void;
  setUnits: (units: 'metric' | 'imperial') => void;
  setMapStyle: (style: MapStyleType) => void;
  setMapStyleLoading: (loading: boolean) => void;
  setEmergencyModalOpen: (open: boolean, targetDrone?: string) => void;
  hydrateFromSnapshot: (appState: Partial<ApplicationState>) => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  application_status: 'READY',
  backend_connected: false,
  websocket_connected: false,
  mavlink_connected: false,
  simulation_mode: true,
  current_user: 'TACTICAL_OPERATOR',
  app_version: '1.0.0',

  activeSection: getInitialSection(),
  isSidebarCollapsed: false,
  isInspectorOpen: false,
  isHudOpen: false,
  isConsoleOpen: false,
  activeConsoleTab: 'TELEMETRY',
  theme: 'dark-tactical',
  units: 'metric',
  mapStyle: loadStoredMapStyle(),
  mapStyleLoading: false,
  telemetryRateHz: 10,
  hudRefreshRateHz: 60,
  emergencyModalOpen: false,
  emergencyTargetDrone: 'ALL',

  viewMode: 'OPERATIONS',
  failureLabOpen: false,
  replayOpen: false,
  rescueHandoffOpen: false,
  chargingLogisticsOpen: false,
  provenanceOpen: false,
  halOpen: false,
  degradationOpen: false,
  architectureBoundaryOpen: false,
  safetyGateOpen: false,

  toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === 'OPERATIONS' ? 'ENGINEERING' : 'OPERATIONS' })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFailureLabOpen: (open) => set({ failureLabOpen: open }),
  setReplayOpen: (open) => set({ replayOpen: open }),
  setRescueHandoffOpen: (open) => set({ rescueHandoffOpen: open }),
  setChargingLogisticsOpen: (open) => set({ chargingLogisticsOpen: open }),
  setProvenanceOpen: (open) => set({ provenanceOpen: open }),
  setHalOpen: (open) => set({ halOpen: open }),
  setDegradationOpen: (open) => set({ degradationOpen: open }),
  setArchitectureBoundaryOpen: (open) => set({ architectureBoundaryOpen: open }),
  setSafetyGateOpen: (open) => set({ safetyGateOpen: open }),

  setActiveSection: (section) => set({ activeSection: section }),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setInspectorOpen: (open) => set({ isInspectorOpen: open }),
  toggleInspector: () => set((s) => ({ isInspectorOpen: !s.isInspectorOpen })),
  setHudOpen: (open) => set({ isHudOpen: open }),
  toggleHud: () => set((s) => ({ isHudOpen: !s.isHudOpen })),
  setConsoleOpen: (open) => set({ isConsoleOpen: open }),
  toggleConsole: () => set((s) => ({ isConsoleOpen: !s.isConsoleOpen })),
  setActiveConsoleTab: (tab) => set({ activeConsoleTab: tab }),
  setTheme: (theme) => set({ theme }),
  setUnits: (units) => set({ units }),
  setMapStyle: (mapStyle) => {
    saveMapStyle(mapStyle);
    set({ mapStyle });
  },
  setMapStyleLoading: (mapStyleLoading) => set({ mapStyleLoading }),
  setEmergencyModalOpen: (open, targetDrone = 'ALL') =>
    set({ emergencyModalOpen: open, emergencyTargetDrone: targetDrone }),
  hydrateFromSnapshot: (appState) => set((s) => ({ ...s, ...appState })),
}));
