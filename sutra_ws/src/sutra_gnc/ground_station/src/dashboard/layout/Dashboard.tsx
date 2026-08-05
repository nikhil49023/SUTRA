import React, { useState } from 'react';
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

import { useTelemetryStore } from '../../services/telemetryStore';
import { emergencyManager } from '../../engine/execution/emergencyManager';
import type { DroneAsset, Waypoint, TelemetryData } from '../../types';

export const MasterTacticalDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('DASHBOARD');
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

  const [activeDrone, setActiveDrone] = useState<DroneAsset>({
    id: 'DRONE_01',
    callsign: 'Alpha Leader',
    model: 'HEXAROTOR',
    status: 'IN_FLIGHT',
    battery: 95,
    lat: 45.1082,
    lng: 34.5225,
    altitude: 100,
    heading: 45,
    groundSpeed: 40,
    signalStrength: 98,
    payload: '4K EO / IR',
    mission: 'RECON_ALPHA',
    satellites: 18,
    flightTime: '00:14:22'
  });

  const [drones] = useState<DroneAsset[]>([
    activeDrone,
    { id: 'DRONE_02', callsign: 'Bravo Wingman', model: 'QUADROUTER', status: 'IN_FLIGHT', battery: 91, lat: 45.1090, lng: 34.5235, altitude: 100, heading: 45, groundSpeed: 40, signalStrength: 95, payload: 'Thermal', mission: 'RECON_ALPHA', satellites: 18, flightTime: '00:14:22' },
    { id: 'DRONE_03', callsign: 'Charlie Scout', model: 'FIXED_WING', status: 'IN_FLIGHT', battery: 88, lat: 45.1075, lng: 34.5215, altitude: 100, heading: 45, groundSpeed: 40, signalStrength: 92, payload: 'LiDAR', mission: 'RECON_ALPHA', satellites: 18, flightTime: '00:14:22' }
  ]);

  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { id: 1, lat: 45.1082, lng: 34.5225, alt: 50, action: 'TAKEOFF', completed: true },
    { id: 2, lat: 45.1100, lng: 34.5240, alt: 60, action: 'WAYPOINT', completed: false },
    { id: 3, lat: 45.1120, lng: 34.5260, alt: 75, action: 'SEARCH_GRID', completed: false },
    { id: 4, lat: 45.1082, lng: 34.5225, alt: 50, action: 'RTH & LAND', completed: false }
  ]);

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

        {/* CENTER VIEWPORT SWITCHER */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#040710]">
          <ErrorBoundary fallbackTitle="CENTER VIEWPORT EXCEPTION">
            {activeTab === 'DASHBOARD' ? (
              <GISMap
                activeDrone={activeDrone}
                telemetry={telemetryData}
                waypoints={waypoints}
                aiDetections={[]}
                onUpdateWaypoints={setWaypoints}
                onUpdateDronePos={(pos) => setActiveDrone((prev) => ({ ...prev, ...pos }))}
              />
            ) : activeTab === 'MISSION_PLANNER' ? (
              <MissionPlannerView
                activeDrone={activeDrone}
                telemetry={telemetryData}
                waypoints={waypoints}
                onUpdateWaypoints={setWaypoints}
              />
            ) : activeTab === 'GIS_INTEL' ? (
              <GISIntelligenceView
                activeDrone={activeDrone}
                telemetry={telemetryData}
                waypoints={waypoints}
              />
            ) : activeTab === 'FLEET' ? (
              <SwarmOperationsCenter
                activeDrone={activeDrone}
                waypoints={waypoints}
                drones={drones}
              />
            ) : activeTab === 'LIVE_OPERATIONS' ? (
              <CommunicationConsole
                activeDrone={activeDrone}
                telemetry={telemetryData}
                waypoints={waypoints}
              />
            ) : activeTab === 'AI_INTELLIGENCE' ? (
              <AIOperationsView
                activeDrone={activeDrone}
                telemetry={telemetryData}
                waypoints={waypoints}
              />
            ) : (
              <OperationsCenterView
                activeDrone={activeDrone}
                drones={drones}
                waypoints={waypoints}
              />
            )}
          </ErrorBoundary>
        </main>

        {/* RIGHT CONTEXT INSPECTOR */}
        <RightInspector
          activeDrone={activeDrone}
          telemetry={telemetryData}
          waypoints={waypoints}
        />
      </div>

      {/* 3. MASTER BOTTOM CONSOLE */}
      <BottomConsole />
    </div>
  );
};
