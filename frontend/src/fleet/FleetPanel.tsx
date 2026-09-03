import React from 'react';
import { DroneList } from './DroneList';
import { DroneInspector } from './DroneInspector';
import { FormationPanel } from './FormationPanel';
import { FormationStatus } from './FormationStatus';

export const FleetPanel: React.FC = () => {
  return (
    <div className="h-full w-full overflow-y-auto p-3 sm:p-4 md:p-6 custom-scrollbar">
      <div className="max-w-7xl mx-auto flex flex-col space-y-3 sm:space-y-4">
        {/* Top Swarm Formation Dispatcher */}
        <FormationPanel />

        {/* Main 12-Col Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
          {/* Left: Swarm Fleet Registry (6 cols) */}
          <div className="lg:col-span-6">
            <DroneList />
          </div>

          {/* Right: Selected UAV Inspector & Kinematics (6 cols) */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            <DroneInspector />
            <FormationStatus />
          </div>
        </div>
      </div>
    </div>
  );
};
