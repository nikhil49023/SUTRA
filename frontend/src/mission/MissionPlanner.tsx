import React from 'react';
import { MissionSummary } from './MissionSummary';
import { MissionToolbar } from './MissionToolbar';
import { WaypointList } from './WaypointList';
import { WaypointEditor } from './WaypointEditor';
import { MissionTimeline } from './MissionTimeline';

export const MissionPlanner: React.FC = () => {
  return (
    <div className="h-full w-full overflow-y-auto p-3 sm:p-4 md:p-6 custom-scrollbar">
      <div className="max-w-7xl mx-auto flex flex-col space-y-3 sm:space-y-4">
        {/* Top Mission Metrics & Health */}
        <MissionSummary />

        {/* Tactical Actions Toolbar */}
        <MissionToolbar />

        {/* Main Work Area: 12-Column Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
          {/* Left: Waypoint Corridor (7 cols) */}
          <div className="lg:col-span-7">
            <WaypointList />
          </div>

          {/* Right: Waypoint Editor & Progression (5 cols) */}
          <div className="lg:col-span-5 space-y-3 sm:space-y-4">
            <WaypointEditor />
            <MissionTimeline />
          </div>
        </div>
      </div>
    </div>
  );
};
