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
import { useTelemetryStore } from './services/telemetryStore';

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
  const { currentTelemetry } = useTelemetryStore();

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
    <div className="flex flex-col h-screen w-screen bg-[#07090e] text-slate-300 font-sans overflow-hidden select-none">
      {/* 1. TOP NAVIGATION */}
      <TopNavbar activeDrone={activeDrone} systemStatus="NOMINAL" />

      {/* 2. MAIN OPERATIONAL WORKSPACE (LEFT NAV + CENTER VIEWS + RIGHT PANEL) */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Navigation Bar */}
        <LeftSidebar
          activeTab={activeTab}
          setActiveTab={handleNavClick}
          fleetCount={drones.length}
          alertCount={alerts.filter((a) => !a.acknowledged).length}
        />

        {/* Contextual Fleet Drawer Panel */}
        <FleetPanel
          drones={drones}
          activeDrone={activeDrone}
          onSelectDrone={handleSelectDrone}
          isOpen={isFleetOpen}
          onClose={() => setIsFleetOpen(false)}
        />

        {/* CENTER VIEW SWITCHER: GIS MAP / LIVE OPS / AI INTELLIGENCE / ANALYTICS */}
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

        {/* Right Panel Stack (Camera, Telemetry Grid, Alerts, Mission Summary) */}
        <RightPanel
          activeDrone={activeDrone}
          telemetry={currentTelemetry}
          alerts={alerts}
          onAcknowledgeAlert={handleAcknowledgeAlert}
        />
      </div>

      {/* 3. BOTTOM PANEL (PFD, Timeline, Live Graphs, Diagnostics) */}
      <BottomPanel telemetry={currentTelemetry} waypoints={waypoints} />
    </div>
  );
}

export default App;
