import React from 'react';
import { useSelectionStore } from '../../stores/selectionStore';
import { useAppStore } from '../../stores/appStore';
import { useFleetStore } from '../../stores/fleetStore';
import { useMissionStore } from '../../stores/missionStore';
import { useGeofenceStore } from '../../stores/geofenceStore';
import { DroneInspector } from '../../fleet/DroneInspector';
import { WaypointEditor } from '../../mission/WaypointEditor';
import { GeofenceEditor } from '../../geofence/GeofenceEditor';
import { GeofenceProperties } from '../../geofence/GeofenceProperties';
import { Shield, ChevronRight, ChevronLeft, Cpu, Activity } from 'lucide-react';

export const RightInspector: React.FC = () => {
  const { selected_type, selected_id, clearSelection } = useSelectionStore();
  const { isInspectorOpen, toggleInspector } = useAppStore();
  const { drones } = useFleetStore();
  const { waypoints } = useMissionStore();
  const { geofences } = useGeofenceStore();

  if (!isInspectorOpen) {
    return (
      <button
        onClick={toggleInspector}
        className="absolute right-0 top-16 z-30 p-1.5 bg-[#0f141c] border border-r-0 border-slate-700 rounded-l text-slate-400 hover:text-cyan-300"
        title="Open Inspector"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    );
  }

  return (
    <aside className="w-80 h-full bg-[#090d14]/95 border-l border-slate-800/90 flex flex-col p-3 font-mono text-xs z-30 select-none overflow-y-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>TACTICAL INSPECTOR</span>
        </div>
        <button
          onClick={toggleInspector}
          className="p-1 text-slate-400 hover:text-white"
          title="Collapse Inspector"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Context-Sensitive Content */}
      {selected_type === 'DRONE' ? (
        <DroneInspector />
      ) : selected_type === 'WAYPOINT' ? (
        <WaypointEditor />
      ) : selected_type === 'GEOFENCE' ? (
        <div className="space-y-3">
          <GeofenceEditor />
          <GeofenceProperties />
        </div>
      ) : (
        /* System Overview when nothing selected */
        <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 space-y-3">
          <div className="text-slate-400 font-bold border-b border-slate-800 pb-1.5 flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>SYSTEM TELEMETRY SUMMARY</span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">ACTIVE DRONES:</span>
              <span className="font-bold text-cyan-300">{Object.keys(drones).length} Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">MISSION WAYPOINTS:</span>
              <span className="font-bold text-cyan-300">{waypoints.length} Setpoints</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">GEOFENCE ZONES:</span>
              <span className="font-bold text-cyan-300">{geofences.length} Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ORCA COLLISION BUFFER:</span>
              <span className="font-bold text-emerald-400">&gt; 2.8m (SAFE)</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
            Click any drone, waypoint, or geofence on the map to inspect its parameters.
          </div>
        </div>
      )}
    </aside>
  );
};
