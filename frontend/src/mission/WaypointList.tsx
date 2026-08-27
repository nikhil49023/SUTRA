import React, { memo } from 'react';
import { useMissionStore } from '../stores/missionStore';
import { useSelectionStore } from '../stores/selectionStore';
import { commandManager } from '../communication/CommandManager';
import { Waypoint } from '../types/mission';
import { Trash2, ArrowUp, ArrowDown, MapPin } from 'lucide-react';

export const WaypointList: React.FC = memo(() => {
  const waypoints = useMissionStore((s) => s.waypoints);
  const activeWaypointIndex = useMissionStore((s) => s.active_waypoint_index);
  const selectedType = useSelectionStore((s) => s.selected_type);
  const selectedId = useSelectionStore((s) => s.selected_id);
  const selectWaypoint = useSelectionStore((s) => s.selectWaypoint);

  const handleSelect = (wp: Waypoint) => {
    const id = wp.id || wp.index;
    selectWaypoint(id);
    commandManager.sendCommand('mission.select_waypoint', { waypoint_id: id });
  };

  const handleDelete = (e: React.MouseEvent, wp: Waypoint) => {
    e.stopPropagation();
    commandManager.sendCommand('mission.delete_waypoint', { waypoint_id: wp.id || wp.index });
  };

  const handleMoveUp = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index > 1) {
      commandManager.sendCommand('mission.reorder_waypoint', { from_index: index, to_index: index - 1 });
    }
  };

  const handleMoveDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index < waypoints.length) {
      commandManager.sendCommand('mission.reorder_waypoint', { from_index: index, to_index: index + 1 });
    }
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg overflow-hidden flex flex-col font-mono text-xs select-none">
      <div className="bg-[#151D26] px-3 py-2 border-b border-[#2B3743] flex justify-between items-center text-[#E7EBEF] font-bold">
        <div className="flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span>WAYPOINT CORRIDOR ({waypoints.length})</span>
        </div>
        <span className="text-[10px] text-[#707C88] font-normal">DRAG MAP TO REPOSITION</span>
      </div>

      <div className="divide-y divide-[#2B3743]/60 max-h-64 overflow-y-auto">
        {waypoints.length === 0 ? (
          <div className="p-4 text-center text-[#707C88] text-xs">
            No waypoints defined. Click "ADD WAYPOINT" and click on the map.
          </div>
        ) : (
          waypoints.map((wp) => {
            const isSelected = selectedType === 'WAYPOINT' && (selectedId === wp.id || selectedId === String(wp.index));
            const isActive = activeWaypointIndex === wp.index;

            return (
              <div
                key={wp.id || wp.index}
                onClick={() => handleSelect(wp)}
                className={`px-3 py-2 flex items-center justify-between cursor-pointer transition ${
                  isSelected
                    ? 'bg-[#1B2530] border-l-4 border-l-[#5B8FB9] text-[#E7EBEF]'
                    : isActive
                    ? 'bg-[#151D26] border-l-4 border-l-[#4F9A72] text-[#E7EBEF]'
                    : 'hover:bg-[#151D26] text-[#A9B3BD]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                      isSelected
                        ? 'bg-[#5B8FB9] text-[#0B0F14]'
                        : isActive
                        ? 'bg-[#4F9A72] text-white'
                        : 'bg-[#0B0F14] text-[#5B8FB9] border border-[#2B3743]'
                    }`}
                  >
                    {wp.index}
                  </div>
                  <div>
                    <div className="font-bold text-[11px] flex items-center space-x-1.5">
                      <span>{wp.command || 'WAYPOINT'}</span>
                      {isActive && (
                        <span className="px-1.5 py-0.2 bg-[#1B2530] border border-[#4F9A72]/40 text-[#4F9A72] rounded text-[9px]">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#707C88] tabular-nums">
                      ALT: {wp.altitude}m · SPD: {wp.speed}m/s
                    </div>
                  </div>
                </div>

                {/* Actions: Reorder / Delete */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => handleMoveUp(e, wp.index)}
                    disabled={wp.index === 1}
                    className="p-1 hover:text-[#5B8FB9] text-[#707C88] disabled:opacity-20 transition"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleMoveDown(e, wp.index)}
                    disabled={wp.index === waypoints.length}
                    className="p-1 hover:text-[#5B8FB9] text-[#707C88] disabled:opacity-20 transition"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, wp)}
                    className="p-1 hover:text-[#C75A5A] text-[#707C88] transition"
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
});
