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
import { MapView } from '../../map/MapView';
import { PrimaryFlightDisplay } from '../../hud/PrimaryFlightDisplay';
import { MultiDroneDebugPanel } from '../../hud/MultiDroneDebugPanel';
import { MissionPlanner } from '../../mission/MissionPlanner';
import { GeofenceSidebar } from '../../geofence/GeofenceSidebar';
import { FleetPanel } from '../../fleet/FleetPanel';
import { GisPanel } from '../../gis/GisPanel';
import { AiPanel } from '../../ai/AiPanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import { wsClient } from '../../communication/WebSocketClient';
import { NavigationSection } from '../../types/app';

// ── Memoized panels — mount once, stay mounted, toggled via CSS visibility ─────
const MissionPlannerPanel = memo(() => <MissionPlanner />);
const FleetPanelMemo = memo(() => <FleetPanel />);
const GisPanelMemo = memo(() => <GisPanel />);
const AiPanelMemo = memo(() => <AiPanel />);
const SettingsPanelMemo = memo(() => <SettingsPanel />);

const OVERLAY_SECTIONS: NavigationSection[] = ['MISSION', 'FLEET', 'GIS', 'AI', 'SETTINGS'];

export const TacticalLayout: React.FC = () => {
  const activeSection = useAppStore((s) => s.activeSection);
  const isHudOpen = useAppStore((s) => s.isHudOpen);
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
        case 'F': setActiveSection('FLEET'); break;
        case 'I': setActiveSection('GIS'); break;
        case 'A': setActiveSection('AI'); break;
        case 'H': useAppStore.getState().toggleHud(); break;
        case 'R': setEmergencyModalOpen(true, 'ALL'); break;
        case 'ESCAPE': useAppStore.getState().setActiveSection('COMMAND'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showOverlay = OVERLAY_SECTIONS.includes(activeSection);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B0F14] text-[#E7EBEF] overflow-hidden select-none">
      {/* 1. TOP BAR */}
      <ErrorBoundary fallbackTitle="TOP BAR">
        <TopBar />
      </ErrorBoundary>

      {/* 2. MAIN CENTER BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <ErrorBoundary fallbackTitle="SIDEBAR">
          <Sidebar />
        </ErrorBoundary>

        {/* Central Map & Overlaid Context Panels */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Persistent MapLibre Instance (always in DOM) */}
          <div className="absolute inset-0 z-0">
            <ErrorBoundary fallbackTitle="MAP ENGINE">
              <MapView />
            </ErrorBoundary>
          </div>

          {/*
            Contextual Overlay Container:
            - Always mounted (avoids heavy re-mount cost on every section switch)
            - Visibility toggled via `display` style (instant, no paint cost)
            - NO backdrop-blur-md — GPU blur was causing frame drops on section change
            - Each inner panel is React.memo — stable after first mount
          */}
          <div
            className="absolute inset-0 z-20 overflow-hidden"
            style={{ display: showOverlay ? 'block' : 'none' }}
          >
            <div className="w-full h-full bg-[#0B0F14]/92 overflow-hidden">
              <ErrorBoundary fallbackTitle="MISSION SUBSYSTEM">
                <div style={{ display: activeSection === 'MISSION' ? 'block' : 'none', width: '100%', height: '100%' }}>
                  <MissionPlannerPanel />
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
              <ErrorBoundary fallbackTitle="SETTINGS SUBSYSTEM">
                <div style={{ display: activeSection === 'SETTINGS' ? 'block' : 'none', width: '100%', height: '100%' }}>
                  <SettingsPanelMemo />
                </div>
              </ErrorBoundary>
            </div>
          </div>

          {/* Multi-Drone Diagnostic HUD */}
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

      {/* Global Alerts, Emergency Modal & Debug Panel */}
      <AlertManager />
      <EmergencyModal />
      <DebugPanel />
    </div>
  );
};
