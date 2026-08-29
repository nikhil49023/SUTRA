import React, { memo } from 'react';
import { useSelectionStore } from '../../stores/selectionStore';
import { useAppStore } from '../../stores/appStore';
import { useFleetStore } from '../../stores/fleetStore';
import { useMissionStore } from '../../stores/missionStore';
import { useGeofenceStore } from '../../stores/geofenceStore';
import { DroneInspector } from '../../fleet/DroneInspector';
import { WaypointEditor } from '../../mission/WaypointEditor';
import { GeofenceEditor } from '../../geofence/GeofenceEditor';
import { GeofenceProperties } from '../../geofence/GeofenceProperties';
import { GeofenceSidebar } from '../../geofence/GeofenceSidebar';
import { ChevronRight, ChevronLeft, Cpu, Activity } from 'lucide-react';

export const RightInspector: React.FC = memo(() => {
  const selectedType = useSelectionStore((s) => s.selected_type);
  const isInspectorOpen = useAppStore((s) => s.isInspectorOpen);
  const toggleInspector = useAppStore((s) => s.toggleInspector);

  if (!isInspectorOpen) {
    return (
      <button
        onClick={toggleInspector}
        className="absolute right-0 top-16 z-30 p-1.5 bg-[#11171E] border border-r-0 border-[#2B3743] rounded-l text-[#707C88] hover:text-[#5B8FB9] hover:bg-[#151D26] transition"
        title="Open Inspector"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    );
  }

  return (
    <aside className="w-80 h-full bg-[#0B0F14]/95 border-l border-[#2B3743] flex flex-col p-3 font-mono text-xs z-30 select-none overflow-y-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-[#E7EBEF]">
          <Cpu className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span>TACTICAL INSPECTOR</span>
        </div>
        <button
          onClick={toggleInspector}
          className="p-1 rounded text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
          title="Collapse Inspector"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Context-Sensitive Content */}
      {selectedType === 'DRONE' ? (
        <DroneInspector />
      ) : selectedType === 'WAYPOINT' ? (
        <WaypointEditor />
      ) : selectedType === 'GEOFENCE' ? (
        <div className="space-y-3">
          <GeofenceEditor />
          <GeofenceProperties />
          <GeofenceSidebar />
        </div>
      ) : (
        <div className="space-y-3">
          <SystemOverview />
          <GeofenceSidebar />
        </div>
      )}
    </aside>
  );
});

const SystemOverview: React.FC = memo(() => {
  const droneCount = useFleetStore((s) => Object.keys(s.drones).length);
  const waypointCount = useMissionStore((s) => s.waypoints.length);
  const geofenceCount = useGeofenceStore((s) => s.geofences.length);

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 space-y-3">
      <div className="text-[#A9B3BD] font-bold border-b border-[#2B3743] pb-1.5 flex items-center space-x-1.5">
        <Activity className="w-3.5 h-3.5 text-[#4F9A72]" />
        <span>SYSTEM TELEMETRY SUMMARY</span>
      </div>

      <div className="space-y-2 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-[#707C88]">ACTIVE DRONES:</span>
          <span className="font-bold text-[#E7EBEF] tabular-nums">{droneCount} Connected</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#707C88]">MISSION WAYPOINTS:</span>
          <span className="font-bold text-[#E7EBEF] tabular-nums">{waypointCount} Setpoints</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#707C88]">GEOFENCE ZONES:</span>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-[#E7EBEF] tabular-nums">{geofenceCount} Active</span>
            <button
              onClick={() => {
                const gfs = useGeofenceStore.getState().geofences;
                if (gfs.length > 0) {
                  useSelectionStore.getState().selectGeofence(gfs[0].id);
                } else {
                  useSelectionStore.getState().selectObject('GEOFENCE', null);
                }
              }}
              className="px-1.5 py-0.5 rounded bg-[#1B2530] border border-[#5B8FB9]/60 hover:bg-[#223040] hover:border-[#5B8FB9] text-[#5B8FB9] font-bold text-[10px] transition"
              title="Access & Edit Geofences"
            >
              EDIT
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#707C88]">ORCA COLLISION BUFFER:</span>
          <span className="font-bold text-[#4F9A72]">&gt; 2.8m (SAFE)</span>
        </div>
      </div>

      <div className="text-[10px] text-[#707C88] pt-2 border-t border-[#2B3743]">
        Click any drone, waypoint, or geofence on the map to inspect its parameters.
      </div>
    </div>
  );
});
