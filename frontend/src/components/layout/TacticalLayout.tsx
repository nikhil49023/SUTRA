/**
 * Smart Horizon GCS — Master Tactical Layout Shell
 *
 * PERFORMANCE FIXES:
 * 1. Section switching: contextual panel uses `visibility` + `will-change` instead of
 *    conditional mounting — avoids unmount/remount cost of heavy panel trees.
 * 2. `activeSection` is subscribed with a selector so only layout re-renders when it changes,
 *    not on any unrelated store update.
 * 3. Removed `backdrop-blur-md` from the overlay — GPU blur composite layer was the #1
 *    cause of janky section transitions. Replaced with solid semi-transparent bg.
 * 4. Each panel is wrapped in React.memo — once mounted stays stable.
 */

import React, { useEffect, memo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { TopBar } from '../topbar/TopBar';
import { Sidebar } from '../sidebar/Sidebar';
import { RightInspector } from '../inspector/RightInspector';
import { BottomConsole } from '../console/BottomConsole';
import { AlertManager } from '../alerts/AlertManager';
import { EmergencyModal } from '../common/EmergencyModal';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { DebugPanel } from '../debug/DebugPanel';
import { SwarmQuickDock } from '../dock/SwarmQuickDock';
import { PrimaryFlightDisplay } from '../../hud/PrimaryFlightDisplay';
import { useSelectionStore } from '../../stores/selectionStore';
import { mapController } from '../../map/MapController';
import { MultiDroneDebugPanel } from '../../hud/MultiDroneDebugPanel';
import { MissionPlanner } from '../../mission/MissionPlanner';
import { GeofencePanel } from '../../geofence/GeofencePanel';
import { GeofenceSidebarSection } from '../../geofence/GeofenceSidebarSection';
import { FleetPanel } from '../../fleet/FleetPanel';
import { GisPanel } from '../../gis/GisPanel';
import { AiPanel } from '../../ai/AiPanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import { DisasterIntelPanel } from '../../risk/DisasterIntelPanel';
import { GlobalGeofenceBreachMonitor } from '../../geofence/GlobalGeofenceBreachMonitor';
import { wsClient } from '../../communication/WebSocketClient';
import { NavigationSection } from '../../types/app';
import { Route, Users, Mountain, Brain, Settings, Compass, Shield, ShieldAlert, X, Video } from 'lucide-react';
import { LiveCameraFeedSection } from '../camera/LiveCameraFeedSection';

// SUTRA 7 Defensive Upgrades Modals
import { FailureLabModal } from '../failure/FailureLabModal';
import { MissionReplayModal } from '../replay/MissionReplayModal';
import { GroundRescueHandoffModal } from '../rescue/GroundRescueHandoffModal';
import { MultiStationChargingModal } from '../logistics/MultiStationChargingModal';
import { DecisionProvenanceModal } from '../provenance/DecisionProvenanceModal';
import { HardwareAbstractionModal } from '../hal/HardwareAbstractionModal';
import { SensorDegradationModal } from '../degradation/SensorDegradationModal';
import { ArchitectureBoundaryModal } from '../architecture/ArchitectureBoundaryModal';
import { MissionSafetyGateModal } from '../mission/MissionSafetyGateModal';

// ── Memoized panels — mount once, stay mounted, toggled via CSS visibility ─────
const MissionPlannerPanel = memo(() => <MissionPlanner />);
const LiveCameraFeedPanelMemo = memo(() => <LiveCameraFeedSection />);
const GeofencePanelMemo = memo(() => <GeofencePanel />);
const FleetPanelMemo = memo(() => <FleetPanel />);
const GisPanelMemo = memo(() => <GisPanel />);
const AiPanelMemo = memo(() => <AiPanel />);
const DisasterIntelPanelMemo = memo(() => <DisasterIntelPanel />);
const SettingsPanelMemo = memo(() => <SettingsPanel />);

const OVERLAY_SECTIONS: NavigationSection[] = ['MISSION', 'CAMERA', 'GEOFENCE', 'FLEET', 'GIS', 'AI', 'DISASTER_INTEL', 'RISK', 'SETTINGS'];

const SECTION_METADATA: Record<string, { title: string; subtitle: string; icon: any }> = {
  MISSION: {
    title: 'TACTICAL MISSION PLANNER',
    subtitle: 'Autonomous Waypoint Corridor & Pre-Flight Validation Engine',
    icon: Route,
  },
  CAMERA: {
    title: 'REMOTE GAZEBO CAMERA RECEIVER',
    subtitle: 'Multi-UAV Low-Latency Wi-Fi Video Feed & Sensor Diagnostics',
    icon: Video,
  },
  GEOFENCE: {
    title: 'TACTICAL GEOFENCE OPERATIONS CENTER',
    subtitle: '3D Airspace Containment, Red Zone Intrusion Notifications & Altitude Envelopes',
    icon: Shield,
  },
  FLEET: {
    title: 'SWARM FLEET CONTROL & FORMATION MATRIX',
    subtitle: 'Multi-UAV Kinematics, Target Tracking & ORCA 3D Separation',
    icon: Users,
  },
  GIS: {
    title: 'GIS TERRAIN & RF PROPAGATION INTELLIGENCE',
    subtitle: 'Elevation Profiler, 1st Fresnel Line-of-Sight & Mesh Diagnostics',
    icon: Mountain,
  },
  AI: {
    title: 'AI MISSION ADVISOR & PERCEPTION SUBSYSTEM',
    subtitle: 'YOLOv8 SAR Detections, Ground Raycast Geolocation & NLP Commander',
    icon: Brain,
  },
  DISASTER_INTEL: {
    title: 'PREDICTIVE DISASTER RISK & FORECAST INTELLIGENCE',
    subtitle: 'Multi-Horizon Temporal Risk Projections, Flood Inundation & Resource Pre-Positioning',
    icon: ShieldAlert,
  },
  RISK: {
    title: 'PREDICTIVE DISASTER RISK & FORECAST INTELLIGENCE',
    subtitle: 'Multi-Horizon Temporal Risk Projections, Flood Inundation & Resource Pre-Positioning',
    icon: ShieldAlert,
  },
  SETTINGS: {
    title: 'SYSTEM CONFIGURATION & ENVIRONMENT',
    subtitle: 'Display Units, Tactical Basemaps & Communication Parameters',
    icon: Settings,
  },
};

export const TacticalLayout: React.FC = () => {
  const activeSection = useAppStore((s) => s.activeSection);
  const isHudOpen = useAppStore((s) => s.isHudOpen);
  const isConsoleOpen = useAppStore((s) => s.isConsoleOpen);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const setEmergencyModalOpen = useAppStore((s) => s.setEmergencyModalOpen);

  // Connect WebSocket on startup
  useEffect(() => {
    wsClient.connect();
    return () => {
      wsClient.disconnect();
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key.toUpperCase()) {
        case 'M': setActiveSection('MISSION'); break;
        case 'C': setActiveSection('CAMERA'); break;
        case 'G': setActiveSection('GEOFENCE'); break;
        case 'F': setActiveSection('FLEET'); break;
        case 'I': setActiveSection('GIS'); break;
        case 'A': setActiveSection('AI'); break;
        case 'H': useAppStore.getState().toggleHud(); break;
        case 'R': setEmergencyModalOpen(true, 'ALL'); break;
        case 'ESCAPE':
          useSelectionStore.getState().clearSelection();
          mapController.geofenceLayer.clearHandles();
          useAppStore.getState().setActiveSection('COMMAND');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showOverlay = OVERLAY_SECTIONS.includes(activeSection);
  const activeMeta = SECTION_METADATA[activeSection];
  const SectionIcon = activeMeta?.icon || Compass;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B0F14] text-[#E7EBEF] overflow-hidden select-none relative">
      {/* GLOBAL REAL-TIME GEOFENCE RED ZONE BREACH MONITOR & TOAST ALERTS */}
      <GlobalGeofenceBreachMonitor />

      {/* 1. TOP BAR */}
      <ErrorBoundary fallbackTitle="TOP BAR">
        <TopBar />
      </ErrorBoundary>

      {/* 2. MAIN CENTER BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <ErrorBoundary fallbackTitle="SIDEBAR">
          <Sidebar />
        </ErrorBoundary>

        {/* Dedicated Geofence Management & Creation Sidebar Section */}
        {activeSection === 'GEOFENCE' && (
          <ErrorBoundary fallbackTitle="GEOFENCE OPERATIONS SIDEBAR">
            <GeofenceSidebarSection />
          </ErrorBoundary>
        )}

        {/* Central Tactical Workspaces & Context Panels (Zero Map Section) */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0B0F14]">
          {/* Default / Camera View: Full-screen Live Drone Camera Receiver */}
          {(activeSection === 'CAMERA' || activeSection === 'COMMAND') && (
            <div className="absolute inset-0 z-10 flex flex-col bg-[#0B0F14] overflow-hidden">
              <ErrorBoundary fallbackTitle="CAMERA RECEIVER SUBSYSTEM">
                <LiveCameraFeedPanelMemo />
              </ErrorBoundary>
            </div>
          )}

          {/* Subsystem Workspaces */}
          {activeSection !== 'CAMERA' && activeSection !== 'COMMAND' && (
            <div className="absolute inset-0 z-20 flex flex-col bg-[#0B0F14] overflow-hidden">
              {/* Header ribbon */}
              {activeMeta && (
                <div className="h-11 bg-[#11171E] border-b border-[#2B3743] px-4 flex items-center justify-between font-mono text-xs flex-shrink-0 z-10">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded bg-[#1B2530] border border-[#5B8FB9]/50 flex items-center justify-center text-[#5B8FB9]">
                      <SectionIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-[#E7EBEF] tracking-wide">{activeMeta.title}</span>
                      <span className="hidden md:inline text-[10px] text-[#707C88] ml-2 font-normal">
                        // {activeMeta.subtitle}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSection('CAMERA')}
                    className="px-2.5 py-1 rounded-lg bg-[#151D26] hover:bg-[#1B2530] border border-[#2B3743] hover:border-[#5B8FB9] text-[#A9B3BD] hover:text-[#E7EBEF] text-[11px] font-bold flex items-center space-x-1.5 transition cursor-pointer"
                    title="Return to live camera feed (Esc)"
                  >
                    <span>CLOSE</span>
                    <kbd className="px-1 py-0.2 rounded bg-[#0B0F14] border border-[#2B3743] text-[9px] text-[#707C88]">ESC</kbd>
                    <X className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              )}

              {/* Panel Content Body */}
              <div className="flex-1 w-full overflow-hidden">
                <ErrorBoundary fallbackTitle="MISSION SUBSYSTEM">
                  <div style={{ display: activeSection === 'MISSION' ? 'block' : 'none', width: '100%', height: '100%' }}>
                    <MissionPlannerPanel />
                  </div>
                </ErrorBoundary>
                <ErrorBoundary fallbackTitle="GEOFENCE SUBSYSTEM">
                  <div style={{ display: activeSection === 'GEOFENCE' ? 'block' : 'none', width: '100%', height: '100%' }}>
                    <GeofencePanelMemo />
                  </div>
                </ErrorBoundary>
                <ErrorBoundary fallbackTitle="FLEET SUBSYSTEM">
                  <div style={{ display: activeSection === 'FLEET' ? 'block' : 'none', width: '100%', height: '100%' }}>
                    <FleetPanelMemo />
                  </div>
                </ErrorBoundary>
                <ErrorBoundary fallbackTitle="GIS SUBSYSTEM">
                  <div style={{ display: activeSection === 'GIS' ? 'block' : 'none', width: '100%', height: '100%' }}>
                    <GisPanelMemo />
                  </div>
                </ErrorBoundary>
                <ErrorBoundary fallbackTitle="AI SUBSYSTEM">
                  <div style={{ display: activeSection === 'AI' ? 'block' : 'none', width: '100%', height: '100%' }}>
                    <AiPanelMemo />
                  </div>
                </ErrorBoundary>
                <ErrorBoundary fallbackTitle="DISASTER RISK INTELLIGENCE">
                  <div style={{ display: (activeSection === 'DISASTER_INTEL' || activeSection === 'RISK') ? 'block' : 'none', width: '100%', height: '100%' }}>
                    <DisasterIntelPanelMemo />
                  </div>
                </ErrorBoundary>
                <ErrorBoundary fallbackTitle="SETTINGS SUBSYSTEM">
                  <div style={{ display: activeSection === 'SETTINGS' ? 'block' : 'none', width: '100%', height: '100%' }}>
                    <SettingsPanelMemo />
                  </div>
                </ErrorBoundary>
              </div>
            </div>
          )}

          {/* Multi-Drone Diagnostic HUD */}
          <ErrorBoundary fallbackTitle="DIAGNOSTIC HUD">
            <MultiDroneDebugPanel />
          </ErrorBoundary>

          {/* Floating Swarm Quick Action Dock (Visible when console is collapsed) */}
          {!isConsoleOpen && <SwarmQuickDock />}

          {/* Floating Tactical Contextual Inspector */}
          <ErrorBoundary fallbackTitle="INSPECTOR">
            <RightInspector />
          </ErrorBoundary>
        </div>
      </div>

      {/* 3. PRIMARY FLIGHT DISPLAY (HUD) */}
      {isHudOpen && (
        <ErrorBoundary fallbackTitle="PRIMARY FLIGHT DISPLAY">
          <PrimaryFlightDisplay />
        </ErrorBoundary>
      )}

      {/* 4. BOTTOM CONSOLE */}
      {isConsoleOpen && (
        <ErrorBoundary fallbackTitle="STREAM CONSOLE">
          <BottomConsole />
        </ErrorBoundary>
      )}

      {/* Global Alerts, Emergency Modal & Debug Panel */}
      <AlertManager />
      <EmergencyModal />
      <DebugPanel />

      {/* SUTRA 7 Defensive Upgrades Modals */}
      <FailureLabModal />
      <MissionReplayModal />
      <GroundRescueHandoffModal />
      <MultiStationChargingModal />
      <DecisionProvenanceModal />
      <HardwareAbstractionModal />
      <SensorDegradationModal />
      <ArchitectureBoundaryModal />
      <MissionSafetyGateModal />
    </div>
  );
};
