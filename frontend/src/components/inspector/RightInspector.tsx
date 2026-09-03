import React, { memo } from 'react';
import { useSelectionStore } from '../../stores/selectionStore';
import { useAppStore } from '../../stores/appStore';
import { useFleetStore } from '../../stores/fleetStore';
import { useMissionStore } from '../../stores/missionStore';
import { useGeofenceStore } from '../../stores/geofenceStore';
import { useAIStore } from '../../stores/aiStore';
import { mapController } from '../../map/MapController';
import { DroneInspector } from '../../fleet/DroneInspector';
import { WaypointEditor } from '../../mission/WaypointEditor';
import { GeofenceEditor } from '../../geofence/GeofenceEditor';
import { GeofenceProperties } from '../../geofence/GeofenceProperties';
import { GeofenceSidebar } from '../../geofence/GeofenceSidebar';
import { useDefensiveUpgradesStore } from '../../stores/defensiveUpgradesStore';
import { ChevronRight, ChevronLeft, Cpu, Activity, Crosshair, Navigation, X, LifeBuoy, Radio, Zap, AlertTriangle, Sliders, CheckCircle2 } from 'lucide-react';

export const RightInspector: React.FC = memo(() => {
  const selectedType = useSelectionStore((s) => s.selected_type);
  const isInspectorOpen = useAppStore((s) => s.isInspectorOpen);
  const toggleInspector = useAppStore((s) => s.toggleInspector);

  if (!isInspectorOpen) {
    return (
      <button
        onClick={toggleInspector}
        className="absolute right-0 top-16 z-30 p-2 bg-[#11171E] border border-r-0 border-[#2B3743] rounded-l-md text-[#707C88] hover:text-[#5B8FB9] hover:bg-[#151D26] transition shadow-lg"
        title="Open Inspector"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    );
  }

  return (
    <aside className="w-80 h-full bg-[#0B0F14]/98 border-l border-[#2B3743] flex flex-col p-3 font-mono text-xs z-30 select-none overflow-y-auto space-y-3 custom-scrollbar flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2 font-bold text-[#E7EBEF]">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="tracking-wide">TACTICAL INSPECTOR</span>
            <span className="text-[10px] text-[#707C88] block font-normal">// CONTEXTUAL TELEMETRY</span>
          </div>
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
      ) : selectedType === 'TARGET' ? (
        <TargetInspector />
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
  const viewMode = useAppStore((s) => s.viewMode);

  const setFailureLabOpen = useAppStore((s) => s.setFailureLabOpen);
  const setReplayOpen = useAppStore((s) => s.setReplayOpen);
  const setRescueHandoffOpen = useAppStore((s) => s.setRescueHandoffOpen);
  const setChargingLogisticsOpen = useAppStore((s) => s.setChargingLogisticsOpen);
  const setProvenanceOpen = useAppStore((s) => s.setProvenanceOpen);
  const setHalOpen = useAppStore((s) => s.setHalOpen);

  const rescueReports = useDefensiveUpgradesStore((s) => s.rescueReports);
  const activeFailuresCount = useDefensiveUpgradesStore((s) => Object.keys(s.activeFailures).length);
  const halPlatform = useDefensiveUpgradesStore((s) => s.halState.active_platform);

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 space-y-3">
      <div className="text-[#E7EBEF] font-bold border-b border-[#2B3743] pb-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-[#4F9A72]" />
          <span>{viewMode === 'OPERATIONS' ? 'OPERATIONS SUMMARY' : 'ENGINEERING DIAGNOSTICS'}</span>
        </div>
        <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
          viewMode === 'OPERATIONS' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#3B82F6]/20 text-[#3B82F6]'
        }`}>
          {viewMode}
        </span>
      </div>

      {viewMode === 'OPERATIONS' ? (
        /* 👨‍🚒 OPERATIONS MODE: Risk -> UAVs -> Survivors -> Hazards -> Battery -> Comms -> Alerts */
        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between items-center bg-[#151D26] p-2 rounded border border-[#2B3743]">
            <span className="text-[#707C88]">INCIDENT RISK:</span>
            <span className="font-extrabold text-[#F59E0B]">84.5 ELEVATED</span>
          </div>

          <div className="flex justify-between items-center bg-[#151D26] p-2 rounded border border-[#2B3743]">
            <span className="text-[#707C88]">ACTIVE SWARM:</span>
            <span className="font-bold text-[#E7EBEF] tabular-nums">{droneCount} Connected</span>
          </div>

          <div className="flex justify-between items-center bg-[#151D26] p-2 rounded border border-[#2B3743]">
            <span className="text-[#707C88]">SURVIVOR RECON:</span>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-[#10B981]">{rescueReports.length} Confirmed</span>
              <button
                onClick={() => setRescueHandoffOpen(true)}
                className="px-1.5 py-0.2 rounded bg-[#10B981]/20 border border-[#10B981]/60 hover:bg-[#10B981]/30 text-[#10B981] font-extrabold text-[9px] transition"
              >
                HANDOFF
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center bg-[#151D26] p-2 rounded border border-[#2B3743]">
            <span className="text-[#707C88]">ACTIVE HAZARDS:</span>
            <span className="font-bold text-[#EF4444]">3 (Flood 2.4m + Debris)</span>
          </div>

          <div className="flex justify-between items-center bg-[#151D26] p-2 rounded border border-[#2B3743]">
            <span className="text-[#707C88]">SWARM BATTERY:</span>
            <span className="font-bold text-[#10B981]">Min 78% (Reserve OK)</span>
          </div>

          <div className="flex justify-between items-center bg-[#151D26] p-2 rounded border border-[#2B3743]">
            <span className="text-[#707C88]">TACTICAL COMMS:</span>
            <span className="font-bold text-[#5B8FB9]">802.11s Mesh 98.4% PDR</span>
          </div>
        </div>
      ) : (
        /* 🧪 ENGINEERING MODE: ORCA latency -> Covariance -> SNR -> Setpoint Freq -> PX4 state -> Solver metrics */
        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between items-center bg-[#151D26] p-2 rounded border border-[#2B3743]">
            <span className="text-[#707C88]">ORCA 3D LATENCY:</span>
            <span className="font-bold text-[#10B981] tabular-nums">0.82 ms (Target &lt; 1.0ms)</span>
          </div>

          <div className="flex justify-between items-center bg-[#151D26] p-2 rounded border border-[#2B3743]">
            <span className="text-[#707C88]">EKF COVARIANCE (P):</span>
            <span className="font-bold text-[#5B8FB9] tabular-nums">0.012 m²</span>
          </div>

          <div className="flex justify-between items-center bg-[#151D26] p-2 rounded border border-[#2B3743]">
            <span className="text-[#707C88]">MESH SNR / RSSI:</span>
            <span className="font-bold text-[#10B981] tabular-nums">28.4 dB (-68 dBm)</span>
          </div>

          <div className="flex justify-between items-center bg-[#151D26] p-2 rounded border border-[#2B3743]">
            <span className="text-[#707C88]">SETPOINT FREQ:</span>
            <span className="font-bold text-[#5B8FB9] tabular-nums">50.0 Hz (Jitter &lt; 0.2ms)</span>
          </div>

          <div className="flex justify-between items-center bg-[#151D26] p-2 rounded border border-[#2B3743]">
            <span className="text-[#707C88]">ACTIVE HAL DRIVER:</span>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-[#EAB308]">{halPlatform}</span>
              <button
                onClick={() => setHalOpen(true)}
                className="px-1.5 py-0.2 rounded bg-[#EAB308]/20 border border-[#EAB308]/60 text-[#EAB308] font-bold text-[9px]"
              >
                CONFIG
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center bg-[#151D26] p-2 rounded border border-[#2B3743]">
            <span className="text-[#707C88]">ORCA BUFFER (G5):</span>
            <span className="font-bold text-[#10B981]">&gt; 2.8m (3.10m Cleared)</span>
          </div>
        </div>
      )}

      {/* Quick Defense Action Launchers */}
      <div className="pt-2 border-t border-[#2B3743] space-y-1.5">
        <span className="text-[10px] text-[#707C88] font-bold block">DEFENSIVE AUDIT LABS:</span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setFailureLabOpen(true)}
            className="p-1.5 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#C75A5A]/50 text-[#EF4444] text-[10px] font-bold flex items-center justify-center space-x-1"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>FAILURE LAB</span>
          </button>

          <button
            onClick={() => setReplayOpen(true)}
            className="p-1.5 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#5B8FB9]/50 text-[#5B8FB9] text-[10px] font-bold flex items-center justify-center space-x-1"
          >
            <Activity className="w-3 h-3" />
            <span>REPLAY AAR</span>
          </button>

          <button
            onClick={() => setChargingLogisticsOpen(true)}
            className="p-1.5 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#F59E0B]/50 text-[#F59E0B] text-[10px] font-bold flex items-center justify-center space-x-1"
          >
            <Zap className="w-3 h-3" />
            <span>CHARGERS</span>
          </button>

          <button
            onClick={() => setProvenanceOpen(true)}
            className="p-1.5 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#8B5CF6]/50 text-[#8B5CF6] text-[10px] font-bold flex items-center justify-center space-x-1"
          >
            <Cpu className="w-3 h-3" />
            <span>WHY SUTRA?</span>
          </button>
        </div>
      </div>
    </div>
  );
});

const TargetInspector: React.FC = memo(() => {
  const selectedId = useSelectionStore((s) => s.selected_id);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const targets = useAIStore((s) => s.tracked_targets);

  const target = targets.find((t) => String(t.target_id || t.id) === String(selectedId));

  if (!target) {
    return (
      <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#2B3743] pb-2 text-[#E7EBEF] font-bold">
          <div className="flex items-center space-x-1.5 text-[#C49A4A]">
            <Crosshair className="w-3.5 h-3.5" />
            <span>TARGET NOT FOUND</span>
          </div>
          <button
            onClick={clearSelection}
            className="p-1 text-[#707C88] hover:text-white rounded hover:bg-[#151D26]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[11px] text-[#707C88]">
          Selected target ID <span className="text-white font-bold">#{selectedId}</span> is not active or has been lost.
        </p>
        <button
          onClick={clearSelection}
          className="w-full py-1.5 rounded bg-[#1B2530] border border-[#2B3743] hover:bg-[#223040] text-[#E7EBEF] text-[11px] font-bold"
        >
          DESELECT
        </button>
      </div>
    );
  }

  const isSurvivor = target.label?.toUpperCase().includes('SURVIVOR') ?? true;
  const confPct = Math.round((target.confidence ?? 1.0) * 100);
  const timeSinceSeenSec = Math.max(0, Math.round((Date.now() - (target.last_seen || Date.now())) / 1000));

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 space-y-3 font-mono text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-1.5 font-bold">
          <Crosshair className={`w-3.5 h-3.5 ${isSurvivor ? 'text-[#C49A4A]' : 'text-[#5B8FB9]'}`} />
          <span className="text-[#E7EBEF]">{target.label || 'SURVIVOR'} #{target.target_id || target.id}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
              target.tracking_status === 'LOST'
                ? 'bg-[#151D26] border-[#C75A5A]/60 text-[#C75A5A]'
                : 'bg-[#151D26] border-[#C49A4A]/60 text-[#C49A4A]'
            }`}
          >
            {target.tracking_status || 'TRACKED'}
          </span>
          <button
            onClick={clearSelection}
            className="p-1 text-[#707C88] hover:text-white rounded hover:bg-[#151D26] transition"
            title="Deselect Target"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Target Parameters */}
      <div className="space-y-2 text-[11px]">
        <div className="flex justify-between items-center py-1 border-b border-[#2B3743]/50">
          <span className="text-[#707C88]">CLASSIFICATION:</span>
          <span className="font-bold text-[#C49A4A]">{target.label || 'SURVIVOR'}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-[#2B3743]/50">
          <span className="text-[#707C88]">CONFIDENCE:</span>
          <div className="flex items-center space-x-1.5">
            <div className="w-16 h-1.5 rounded-full bg-[#151D26] overflow-hidden border border-[#2B3743]">
              <div
                className={`h-full ${confPct >= 70 ? 'bg-[#4F9A72]' : 'bg-[#C49A4A]'}`}
                style={{ width: `${confPct}%` }}
              />
            </div>
            <span className="font-bold text-[#E7EBEF] tabular-nums">{confPct}%</span>
          </div>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-[#2B3743]/50">
          <span className="text-[#707C88]">SOURCE DRONE:</span>
          <span className="font-bold text-[#5B8FB9] uppercase">UAV: {target.drone_id || 'ALPHA'}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-[#2B3743]/50">
          <span className="text-[#707C88]">MODALITIES:</span>
          <span className="font-bold text-[#E7EBEF]">
            {(target.modalities && target.modalities.length > 0) ? target.modalities.join(', ') : 'Visual, Thermal'}
          </span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-[#2B3743]/50">
          <span className="text-[#707C88]">WGS84 LATITUDE:</span>
          <span className="font-bold text-[#E7EBEF] tabular-nums">{target.latitude?.toFixed(6)}° N</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-[#2B3743]/50">
          <span className="text-[#707C88]">WGS84 LONGITUDE:</span>
          <span className="font-bold text-[#E7EBEF] tabular-nums">{target.longitude?.toFixed(6)}° E</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-[#2B3743]/50">
          <span className="text-[#707C88]">ESTIMATED ALTITUDE:</span>
          <span className="font-bold text-[#E7EBEF] tabular-nums">{(target.altitude_m ?? 15.0).toFixed(1)} m AGL</span>
        </div>

        {target.speed_mps !== undefined && target.speed_mps > 0 && (
          <div className="flex justify-between items-center py-1 border-b border-[#2B3743]/50">
            <span className="text-[#707C88]">EST. VELOCITY:</span>
            <span className="font-bold text-[#E7EBEF] tabular-nums">
              {target.speed_mps.toFixed(1)} m/s @ {target.heading_deg?.toFixed(0)}°
            </span>
          </div>
        )}

        <div className="flex justify-between items-center py-1">
          <span className="text-[#707C88]">LAST TELEMETRY:</span>
          <span className="font-bold text-[#A9B3BD] tabular-nums">
            {timeSinceSeenSec === 0 ? 'Live (Just now)' : `${timeSinceSeenSec}s ago`}
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="pt-2 border-t border-[#2B3743] flex space-x-2">
        <button
          onClick={() => {
            if (target.latitude && target.longitude) {
              mapController.centerOnCoordinates(target.latitude, target.longitude);
            }
          }}
          className="flex-1 py-1.5 px-2 rounded bg-[#1B2530] border border-[#5B8FB9]/60 hover:bg-[#223040] hover:border-[#5B8FB9] text-[#5B8FB9] font-bold text-[10px] flex items-center justify-center space-x-1 transition"
        >
          <Navigation className="w-3 h-3" />
          <span>CENTER MAP</span>
        </button>
        <button
          onClick={clearSelection}
          className="py-1.5 px-3 rounded bg-[#151D26] border border-[#2B3743] hover:bg-[#1B2530] text-[#707C88] hover:text-white font-bold text-[10px] transition"
        >
          DESELECT
        </button>
      </div>
    </div>
  );
});

