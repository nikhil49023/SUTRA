import React from 'react';
import { useMissionStore } from '../stores/missionStore';
import { useSelectionStore } from '../stores/selectionStore';
import { wsClient } from '../communication/WebSocketClient';
import { Waypoint } from '../types/mission';
import { Trash2, Edit3, ArrowUp, ArrowDown, MapPin } from 'lucide-react';

export const WaypointList: React.FC = () => {
  const { waypoints, active_waypoint_index } = useMissionStore();
  const { selected_type, selected_id, selectWaypoint } = useSelectionStore();

  const handleSelect = (wp: Waypoint) => {
    selectWaypoint(wp.id || wp.index);
    wsClient.sendCommand('WAYPOINT_SELECT', { waypoint_id: wp.id || wp.index });
  };

  const handleDelete = (e: React.MouseEvent, wp: Waypoint) => {
    e.stopPropagation();
    wsClient.sendCommand('WAYPOINT_DELETE', { waypoint_id: wp.id || wp.index });
  };

  const handleMoveUp = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index > 1) {
      wsClient.sendCommand('WAYPOINT_REORDER', { from_index: index, to_index: index - 1 });
    }
  };

  const handleMoveDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index < waypoints.length) {
      wsClient.sendCommand('WAYPOINT_REORDER', { from_index: index, to_index: index + 1 });
    }
  };

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg overflow-hidden flex flex-col font-mono text-xs select-none">
      <div className="bg-slate-900/80 px-3 py-2 border-b border-slate-800 flex justify-between items-center text-slate-300 font-bold">
        <div className="flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>WAYPOINT CORRIDOR ({waypoints.length})</span>
        </div>
        <span className="text-[10px] text-slate-500 font-normal">DRAG MAP TO REPOSITION</span>
      </div>

      <div className="divide-y divide-slate-800/80 max-h-64 overflow-y-auto">
        {waypoints.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">
            No waypoints defined. Click "ADD WAYPOINT" and click on the map.
          </div>
        ) : (
          waypoints.map((wp) => {
            const isSelected = selected_type === 'WAYPOINT' && (selected_id === wp.id || selected_id === String(wp.index));
            const isActive = active_waypoint_index === wp.index;

            return (
              <div
                key={wp.id || wp.index}
                onClick={() => handleSelect(wp)}
                className={`px-3 py-2 flex items-center justify-between cursor-pointer transition ${
                  isSelected
                    ? 'bg-cyan-950/60 border-l-4 border-l-cyan-400 text-cyan-200'
                    : isActive
                    ? 'bg-emerald-950/40 border-l-4 border-l-emerald-400 text-slate-200'
                    : 'hover:bg-slate-800/40 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                      isSelected
                        ? 'bg-cyan-500 text-black'
                        : isActive
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800 text-cyan-300 border border-slate-700'
                    }`}
                  >
                    {wp.index}
                  </div>
                  <div>
                    <div className="font-bold text-[11px] flex items-center space-x-1.5">
                      <span>{wp.command || 'WAYPOINT'}</span>
                      {isActive && (
                        <span className="px-1 py-0.2 bg-emerald-900/80 text-emerald-300 rounded text-[9px]">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 tabular-nums">
                      ALT: {wp.altitude}m · SPD: {wp.speed}m/s
                    </div>
                  </div>
                </div>

                {/* Actions: Reorder / Delete */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => handleMoveUp(e, wp.index)}
                    disabled={wp.index === 1}
                    className="p-1 hover:text-cyan-400 disabled:opacity-30 transition"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleMoveDown(e, wp.index)}
                    disabled={wp.index === waypoints.length}
                    className="p-1 hover:text-cyan-400 disabled:opacity-30 transition"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, wp)}
                    className="p-1 hover:text-rose-400 transition"
                    title="Delete Waypoint"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
