/**
 * Smart Horizon GCS — Master Tactical Layout Shell
 * Includes fault-isolated Subsystem ErrorBoundaries and Developer Debug Panel.
 */

import React, { useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { TopBar } from '../topbar/TopBar';
import { Sidebar } from '../sidebar/Sidebar';
import { RightInspector } from '../inspector/RightInspector';
import { BottomConsole } from '../console/BottomConsole';
import { AlertManager } from '../alerts/AlertManager';
import { EmergencyModal } from '../common/EmergencyModal';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { DebugPanel } from '../debug/DebugPanel';
import { MapView } from '../../map/MapView';
import { PrimaryFlightDisplay } from '../../hud/PrimaryFlightDisplay';
import { MultiDroneDebugPanel } from '../../hud/MultiDroneDebugPanel';
import { MissionPlanner } from '../../mission/MissionPlanner';
import { GeofenceSidebar } from '../../geofence/GeofenceSidebar';
import { GeofenceToolbar } from '../../geofence/GeofenceToolbar';
import { FleetPanel } from '../../fleet/FleetPanel';
import { GisPanel } from '../../gis/GisPanel';
import { AiPanel } from '../../ai/AiPanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import { wsClient } from '../../communication/WebSocketClient';

export const TacticalLayout: React.FC = () => {
  const { activeSection, isHudOpen, setActiveSection, setEmergencyModalOpen } = useAppStore();

  // Connect WebSocket client on startup
  useEffect(() => {
    wsClient.connect();
    return () => {
      wsClient.disconnect();
    };
  }, []);

  // Global Keyboard Shortcuts (M=Mission, G=Geofence, F=Fleet, I=GIS, A=AI, H=HUD, R=RTL, Esc=Clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore inputs in text fields
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.key.toUpperCase()) {
        case 'M':
          setActiveSection('MISSION');
          break;
        case 'G':
          setActiveSection('GIS');
          break;
        case 'F':
          setActiveSection('FLEET');
          break;
        case 'I':
          setActiveSection('GIS');
          break;
        case 'A':
          setActiveSection('AI');
          break;
        case 'H':
          useAppStore.getState().toggleHud();
          break;
        case 'R':
          setEmergencyModalOpen(true, 'ALL');
          break;
        case 'ESCAPE':
          useAppStore.getState().setActiveSection('COMMAND');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0d12] text-slate-100 overflow-hidden select-none">
      {/* 1. TOP BAR */}
      <ErrorBoundary fallbackTitle="TOP BAR">
        <TopBar />
      </ErrorBoundary>

      {/* 2. MAIN CENTER BODY (Sidebar + Map/Panels + Inspector) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <ErrorBoundary fallbackTitle="SIDEBAR">
          <Sidebar />
        </ErrorBoundary>

        {/* Central Map & Overlaid Context Panels */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Persistent MapLibre Instance (Always Mounted in DOM) */}
          <div className="absolute inset-0 z-0">
            <ErrorBoundary fallbackTitle="MAP ENGINE">
              <MapView />
            </ErrorBoundary>
          </div>

          {/* Contextual Overlays / Tabs when not in plain COMMAND view */}
          {activeSection !== 'COMMAND' && activeSection !== 'LIVEOPS' && (
            <div className="absolute inset-0 z-20 bg-[#0a0d12]/85 backdrop-blur-md overflow-hidden">
              <ErrorBoundary fallbackTitle={`${activeSection} SUBSYSTEM`}>
                {activeSection === 'MISSION' && <MissionPlanner />}
                {activeSection === 'GIS' && <GisPanel />}
                {activeSection === 'FLEET' && <FleetPanel />}
                {activeSection === 'AI' && <AiPanel />}
                {activeSection === 'SETTINGS' && <SettingsPanel />}
              </ErrorBoundary>
            </div>
          )}

          {/* Multi-Drone & Waypoint Diagnostic HUD (floats at bottom-right of map canvas) */}
          <ErrorBoundary fallbackTitle="DIAGNOSTIC HUD">
            <MultiDroneDebugPanel />
          </ErrorBoundary>
        </div>

        {/* Right Inspector */}
        <ErrorBoundary fallbackTitle="INSPECTOR">
          <RightInspector />
        </ErrorBoundary>
      </div>

      {/* 3. PRIMARY FLIGHT DISPLAY (HUD) */}
      {isHudOpen && (
        <ErrorBoundary fallbackTitle="PRIMARY FLIGHT DISPLAY">
          <PrimaryFlightDisplay />
        </ErrorBoundary>
      )}

      {/* 4. BOTTOM CONSOLE */}
      <ErrorBoundary fallbackTitle="STREAM CONSOLE">
        <BottomConsole />
      </ErrorBoundary>

      {/* Global Alerts, Emergency Confirmation Modal & Developer Debug HUD */}
      <AlertManager />
      <EmergencyModal />
      <DebugPanel />
    </div>
  );
};
