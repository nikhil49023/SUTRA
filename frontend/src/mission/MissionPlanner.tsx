import React from 'react';
import { MissionSummary } from './MissionSummary';
import { MissionToolbar } from './MissionToolbar';
import { WaypointList } from './WaypointList';
import { WaypointEditor } from './WaypointEditor';
import { MissionTimeline } from './MissionTimeline';

export const MissionPlanner: React.FC = () => {
  return (
    <div className="h-full flex flex-col space-y-3 p-3 overflow-y-auto">
      <MissionSummary />
      <MissionToolbar />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
        <WaypointList />
        <div className="space-y-3">
          <WaypointEditor />
          <MissionTimeline />
        </div>
      </div>
    </div>
  );
};
