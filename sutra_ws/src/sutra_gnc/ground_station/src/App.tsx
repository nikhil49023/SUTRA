import React, { useState, useEffect } from 'react';
import { TopNavbar } from './components/layout/TopNavbar';
import { LeftSidebar, NavTab } from './components/layout/LeftSidebar';
import { FleetPanel } from './components/views/FleetPanel';
import { GISMap } from './components/views/GISMap';
import { RightPanel } from './components/views/RightPanel';
import { BottomPanel } from './components/views/BottomPanel';
import { LiveOpsCenter } from './components/views/LiveOpsCenter';
import { AIIntelligenceView } from './components/views/AIIntelligenceView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NotificationToastContainer } from './components/common/NotificationToast';
import { useTelemetryStore } from './services/telemetryStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNotificationStore } from './store/notificationStore';
import { eventBus } from './services/eventBus';

import { 
  INITIAL_DRONES, 
  MOCK_ALERTS, 
  MOCK_WAYPOINTS, 
  MOCK_AI_DETECTIONS 
} from './lib/mockData';
import type { DroneAsset, OperationalAlert, Waypoint } from './types';

export function App() {
  const [drones] = useState<DroneAsset[]>(INITIAL_DRONES);
  const [activeDrone, setActiveDrone] = useState<DroneAsset>(INITIAL_DRONES[0]);
  const [alerts, setAlerts] = useState<OperationalAlert[]>(MOCK_ALERTS);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(MOCK_WAYPOINTS);
  const [activeTab, setActiveTab] = useState<NavTab>('DASHBOARD');
  const [isFleetOpen, setIsFleetOpen] = useState(false);

  // Real-time Telemetry Service Store
  const { currentTelemetry, triggerRTH } = useTelemetryStore();
  const { addToast } = useNotificationStore();

  // Keyboard Shortcuts Hook (R=RTH, F=Fleet, L=LiveOps, A=AI, D=Dashboard)
  useKeyboardShortcuts({
    onTriggerRTH: () => {
      triggerRTH();
      setActiveDrone((prev) => ({ ...prev, status: 'RTH' }));
      addToast({
        type: 'WARNING',
        title: 'EMERGENCY RTH TRIGGERED',
        message: 'Return to Launch command dispatched via shortcut [R].'
      });
    },
    onToggleFleet: () => setIsFleetOpen((prev) => !prev),
    onSelectNavTab: (tab) => setActiveTab(tab)
  });

  // Cross-module Event Bus Listener
  useEffect(() => {
    eventBus.subscribe('AI_TARGET_DETECTED', (evt) => {
      addToast({
        type: 'WARNING',
        title: 'AI TARGET DETECTED',
        message: `${evt.data.class || 'Target'} detected at ${evt.data.confidence}% confidence.`
      });
    });

    eventBus.subscribe('BATTERY_CRITICAL', () => {
      addToast({
        type: 'CRITICAL',
        title: 'BATTERY CRITICAL',
        message: 'Voltage below 21.6V. Land immediately!'
      });
    });
  }, [addToast]);

  const handleAcknowledgeAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const handleSelectDrone = (drone: DroneAsset) => {
    setActiveDrone(drone);
  };

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'FLEET') {
      setIsFleetOpen(!isFleetOpen);
    } else {
      setIsFleetOpen(false);
    }
  };

  const handleUpdateWaypoints = (newWps: Waypoint[]) => {
    setWaypoints(newWps);
  };

  const handleUpdateDronePos = (pos: Partial<DroneAsset>) => {
    setActiveDrone((prev) => ({ ...prev, ...pos }));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#07090e] text-slate-300 font-sans overflow-hidden select-none relative">
      {/* GLOBAL TOAST NOTIFICATION CONTAINER */}
      <NotificationToastContainer />

      {/* 1. TOP NAVIGATION */}
      <ErrorBoundary fallbackTitle="TOP NAVBAR EXCEPTION">
        <TopNavbar activeDrone={activeDrone} systemStatus="NOMINAL" />
      </ErrorBoundary>

      {/* 2. MAIN OPERATIONAL WORKSPACE (LEFT NAV + CENTER VIEWS + RIGHT PANEL) */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Navigation Bar */}
        <ErrorBoundary fallbackTitle="SIDEBAR NAVIGATION EXCEPTION">
          <LeftSidebar
            activeTab={activeTab}
            setActiveTab={handleNavClick}
            fleetCount={drones.length}
            alertCount={alerts.filter((a) => !a.acknowledged).length}
          />
        </ErrorBoundary>

        {/* Contextual Fleet Drawer Panel */}
        <ErrorBoundary fallbackTitle="FLEET PANEL EXCEPTION">
          <FleetPanel
            drones={drones}
            activeDrone={activeDrone}
            onSelectDrone={handleSelectDrone}
            isOpen={isFleetOpen}
            onClose={() => setIsFleetOpen(false)}
          />
        </ErrorBoundary>

        {/* CENTER VIEW SWITCHER: GIS MAP / LIVE OPS / AI INTELLIGENCE / ANALYTICS */}
        <ErrorBoundary fallbackTitle="CENTER VIEWPORT EXCEPTION">
          {activeTab === 'LIVE_OPERATIONS' ? (
            <LiveOpsCenter />
          ) : activeTab === 'AI_INTELLIGENCE' ? (
            <AIIntelligenceView />
          ) : activeTab === 'ANALYTICS' ? (
            <AnalyticsView />
          ) : (
            <GISMap
              activeDrone={activeDrone}
              telemetry={currentTelemetry}
              waypoints={waypoints}
              aiDetections={MOCK_AI_DETECTIONS}
              onUpdateWaypoints={handleUpdateWaypoints}
              onUpdateDronePos={handleUpdateDronePos}
            />
          )}
        </ErrorBoundary>

        {/* Right Panel Stack (Camera, Telemetry Grid, Alerts, Mission Summary) */}
        <ErrorBoundary fallbackTitle="RIGHT PANEL EXCEPTION">
          <RightPanel
            activeDrone={activeDrone}
            telemetry={currentTelemetry}
            alerts={alerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
          />
        </ErrorBoundary>
      </div>

      {/* 3. BOTTOM PANEL (PFD, Timeline, Live Graphs, Diagnostics) */}
      <ErrorBoundary fallbackTitle="BOTTOM PANEL EXCEPTION">
        <BottomPanel telemetry={currentTelemetry} waypoints={waypoints} />
      </ErrorBoundary>
    </div>
  );
}

export default App;
