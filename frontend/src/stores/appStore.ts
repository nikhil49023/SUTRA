import { create } from 'zustand';
import { ApplicationState, NavigationSection } from '../types/app';

interface AppStoreState extends ApplicationState {
  activeSection: NavigationSection;
  isSidebarCollapsed: boolean;
  isInspectorOpen: boolean;
  isHudOpen: boolean;
  isConsoleOpen: boolean;
  activeConsoleTab: 'TELEMETRY' | 'MISSION' | 'SAFETY' | 'COMMUNICATION' | 'AI' | 'SYSTEM';
  theme: 'dark-tactical' | 'satellite' | 'high-contrast';
  units: 'metric' | 'imperial';
  mapStyle: 'tactical-dark' | 'satellite' | 'terrain';
  telemetryRateHz: number;
  hudRefreshRateHz: number;
  emergencyModalOpen: boolean;
  emergencyTargetDrone: string;

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
  setMapStyle: (style: 'tactical-dark' | 'satellite' | 'terrain') => void;
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

  activeSection: 'COMMAND',
  isSidebarCollapsed: false,
  isInspectorOpen: true,
  isHudOpen: true,
  isConsoleOpen: true,
  activeConsoleTab: 'TELEMETRY',
  theme: 'dark-tactical',
  units: 'metric',
  mapStyle: 'tactical-dark',
  telemetryRateHz: 10,
  hudRefreshRateHz: 60,
  emergencyModalOpen: false,
  emergencyTargetDrone: 'ALL',

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
  setMapStyle: (mapStyle) => set({ mapStyle }),
  setEmergencyModalOpen: (open, targetDrone = 'ALL') =>
    set({ emergencyModalOpen: open, emergencyTargetDrone: targetDrone }),
  hydrateFromSnapshot: (appState) => set((s) => ({ ...s, ...appState })),
}));
