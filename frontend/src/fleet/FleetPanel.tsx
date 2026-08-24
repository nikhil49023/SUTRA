import React from 'react';
import { DroneList } from './DroneList';
import { DroneInspector } from './DroneInspector';
import { FormationPanel } from './FormationPanel';
import { FormationStatus } from './FormationStatus';

export const FleetPanel: React.FC = () => {
  return (
    <div className="h-full flex flex-col space-y-3 p-3 overflow-y-auto">
      <FormationPanel />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
        <DroneList />
        <div className="space-y-3">
          <DroneInspector />
          <FormationStatus />
        </div>
      </div>
    </div>
  );
};
