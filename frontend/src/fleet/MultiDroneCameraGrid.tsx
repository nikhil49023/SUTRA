import React, { memo } from 'react';
import { useCameraStore } from '../stores/cameraStore';
import { useFleetStore } from '../stores/fleetStore';
import { DroneCameraFeed } from './DroneCameraFeed';
import { Video, X, LayoutGrid, Maximize2 } from 'lucide-react';

export const MultiDroneCameraGrid: React.FC = memo(() => {
  const isMultiGridOpen = useCameraStore((s) => s.isMultiGridOpen);
  const setMultiGridOpen = useCameraStore((s) => s.setMultiGridOpen);
  const drones = useFleetStore((s) => s.drones);

  if (!isMultiGridOpen) return null;

  const droneList = Object.values(drones).slice(0, 4);
  const displayDrones = droneList.length >= 2 
    ? droneList 
    : [
        { drone_id: 'uav_alpha', callsign: 'UAV-1 ALPHA' },
        { drone_id: 'uav_beta', callsign: 'UAV-2 BETA' },
      ];

  return (
    <div className="absolute top-16 left-20 z-40 w-[640px] bg-[#0B0F14]/95 border border-[#2B3743] rounded-lg shadow-2xl backdrop-blur-md overflow-hidden font-mono flex flex-col select-none">
      {/* Window Header */}
      <div className="bg-[#11171E] px-3 py-2 border-b border-[#2B3743] flex items-center justify-between text-[#E7EBEF]">
        <div className="flex items-center space-x-2 font-bold text-xs">
          <LayoutGrid className="w-4 h-4 text-[#5B8FB9]" />
          <span>MULTI-UAV LIVE TACTICAL VIDEO GRID</span>
          <span className="text-[10px] text-[#707C88] font-normal">
            ({displayDrones.length} SIMULTANEOUS STREAMS)
          </span>
        </div>

        <button
          onClick={() => setMultiGridOpen(false)}
          className="p-1 rounded text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
          title="Close Video Grid"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Content */}
      <div className="p-3 grid grid-cols-2 gap-3 max-h-[480px] overflow-y-auto custom-scrollbar">
        {displayDrones.map((d) => (
          <DroneCameraFeed
            key={d.drone_id}
            droneId={d.drone_id}
            callsign={d.callsign || d.drone_id.toUpperCase()}
            compact={true}
          />
        ))}
      </div>
    </div>
  );
});
