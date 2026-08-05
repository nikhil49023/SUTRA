import React, { useState, useEffect } from 'react';
import { TopBar } from './TopBar';
import { LeftSidebar, type NavTab } from '../../components/layout/LeftSidebar';
import { RightInspector } from './RightInspector';
import { BottomConsole } from './BottomConsole';

import { GISMap } from '../../components/views/GISMap';
import { MissionPlannerView } from '../../components/views/MissionPlannerView';
import { GISIntelligenceView } from '../../components/views/gis/GISIntelligenceView';
import { AIOperationsView } from '../../components/views/ai/AIOperationsView';
import { CommunicationConsole } from '../../components/views/communication/CommunicationConsole';
import { SwarmOperationsCenter } from '../../components/views/swarm/SwarmOperationsCenter';
import { OperationsCenterView } from '../../components/views/operations/OperationsCenterView';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

import { useMissionStore } from '../../store/MissionStore';
import { useFleetStore } from '../../store/FleetStore';
import { useTelemetryStore } from '../../services/telemetryStore';
import { emergencyManager } from '../../engine/execution/emergencyManager';
import type { TelemetryData } from '../../types';

export const MasterTacticalDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('DASHBOARD');

  // Unified Stores (Priority 6 & 7)
  const { waypoints, setWaypoints, estimates } = useMissionStore();
  const { drones, selectedDrone, updateDronePosition } = useFleetStore();
  const { currentTelemetry } = useTelemetryStore();

  const telemetryData: TelemetryData = {
    pitch: currentTelemetry?.pitch || 0,
    roll: currentTelemetry?.roll || 0,
    yaw: currentTelemetry?.yaw || 45,
    altitudeAGL: currentTelemetry?.altitudeAGL || 100,
    altitudeMSL: currentTelemetry?.altitudeMSL || 450,
    groundSpeed: currentTelemetry?.groundSpeed || 40,
    airSpeed: currentTelemetry?.airSpeed || 42,
    climbRate: currentTelemetry?.climbRate || 0,
    batteryVoltage: currentTelemetry?.batteryVoltage || 22.2,
    batteryCurrent: currentTelemetry?.batteryCurrent || 14.5,
    batteryRemaining: currentTelemetry?.batteryRemaining || 95,
    cellVoltages: [3.7, 3.7, 3.7, 3.7, 3.7, 3.7],
    motorRPM: [5400, 5400, 5400, 5400],
    temperatureAvionics: 38,
    temperatureESC: 42,
    satellites: currentTelemetry?.satellites || 18,
    linkLatencyMs: currentTelemetry?.linkLatencyMs || 18
  };

  const handleEmergencyRTL = () => {
    emergencyManager.triggerEmergency('TELEMETRY_LOST', 'Operator triggered manual emergency RTL.');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050811] text-slate-100 overflow-hidden font-mono select-none">
      {/* 1. MASTER TOP BAR */}
      <TopBar
        missionName="TACTICAL_RECON_ALPHA"
        missionStatus="IN_FLIGHT"
        connectedDroneCount={drones.length}
        onTriggerEmergency={handleEmergencyRTL}
      />

      {/* 2. MAIN MIDDLE BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR NAVIGATION */}
        <LeftSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          fleetCount={drones.length}
          alertCount={0}
        />

        {/* CENTER VIEWPORT CONTAINER */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#040710]">
          <ErrorBoundary fallbackTitle="TACTICAL MAP EXCEPTION">
            {/* PERSISTENT MAPLIBRE MAP (PRIORITY 3: NEVER RECREATED ON TAB SWITCH) */}
            <div className={`absolute inset-0 w-full h-full ${activeTab === 'DASHBOARD' ? 'z-10' : 'z-0 invisible'}`}>
              <GISMap
                activeDrone={selectedDrone}
                telemetry={telemetryData}
                waypoints={waypoints}
                aiDetections={[]}
                onUpdateWaypoints={setWaypoints}
                onUpdateDronePos={(pos) => updateDronePosition(selectedDrone.id, pos)}
              />
            </div>

            {/* TAB OVERLAY VIEWS */}
            {activeTab === 'MISSION_PLANNER' && (
              <div className="absolute inset-0 z-20 bg-[#050811]">
                <MissionPlannerView
                  activeDrone={selectedDrone}
                  telemetry={telemetryData}
                  waypoints={waypoints}
                  onUpdateWaypoints={setWaypoints}
                />
              </div>
            )}

            {activeTab === 'GIS_INTEL' && (
              <div className="absolute inset-0 z-20 bg-[#050811]">
                <GISIntelligenceView
                  activeDrone={selectedDrone}
                  telemetry={telemetryData}
                  waypoints={waypoints}
                />
              </div>
            )}

            {activeTab === 'FLEET' && (
              <div className="absolute inset-0 z-20 bg-[#050811]">
                <SwarmOperationsCenter
                  activeDrone={selectedDrone}
                  waypoints={waypoints}
                  drones={drones}
                />
              </div>
            )}

            {activeTab === 'LIVE_OPERATIONS' && (
              <div className="absolute inset-0 z-20 bg-[#050811]">
                <CommunicationConsole
                  activeDrone={selectedDrone}
                  telemetry={telemetryData}
                  waypoints={waypoints}
                />
              </div>
            )}

            {activeTab === 'AI_INTELLIGENCE' && (
              <div className="absolute inset-0 z-20 bg-[#050811]">
                <AIOperationsView
                  activeDrone={selectedDrone}
                  telemetry={telemetryData}
                  waypoints={waypoints}
                />
              </div>
            )}

            {activeTab === 'SETTINGS' && (
              <div className="absolute inset-0 z-20 bg-[#050811]">
                <OperationsCenterView
                  activeDrone={selectedDrone}
                  drones={drones}
                  waypoints={waypoints}
                />
              </div>
            )}
          </ErrorBoundary>
        </main>

        {/* RIGHT CONTEXT INSPECTOR */}
        <RightInspector
          activeDrone={selectedDrone}
          telemetry={telemetryData}
          waypoints={waypoints}
        />
      </div>

      {/* 3. MASTER BOTTOM CONSOLE */}
      <BottomConsole />
    </div>
  );
};
