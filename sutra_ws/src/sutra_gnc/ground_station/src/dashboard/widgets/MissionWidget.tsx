import React from 'react';
import { Compass } from 'lucide-react';

interface MissionWidgetProps {
  waypointCount: number;
  missionStatus: string;
}

export const MissionWidget: React.FC<MissionWidgetProps> = ({ waypointCount, missionStatus }) => {
  return (
    <div className="bg-[#070d1a]/90 backdrop-blur border border-[#1b253b] p-3 rounded-xl shadow-xl text-xs font-mono space-y-1">
      <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800 pb-1">
        <span className="flex items-center space-x-1.5">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>MISSION ENGINE</span>
        </span>
        <span className="text-[10px] text-cyan-400 font-bold">{missionStatus}</span>
      </div>
      <div className="flex justify-between text-slate-300 pt-1">
        <span>Waypoints Loaded:</span>
        <span className="text-white font-bold">{waypointCount} Items</span>
      </div>
    </div>
  );
};
