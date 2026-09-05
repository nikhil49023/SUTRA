import React, { useMemo } from 'react';
import { useAIStore } from '../stores/aiStore';
import { useCameraStore } from '../stores/cameraStore';
import { useSelectionStore } from '../stores/selectionStore';
import { ShieldAlert, AlertTriangle, Crosshair, Eye } from 'lucide-react';
import { formatDistance } from '../utils/formatting';

export const ThreatPanel: React.FC = () => {
  const { threats, tracked_targets, perception_status } = useAIStore();
  const activeWorld = useCameraStore((s) => s.activeWorld);
  const selectTarget = useSelectionStore((s) => s.selectTarget);
  const selectedId = useSelectionStore((s) => s.selected_id);

  // Scope SAR targets strictly to current active world
  const worldTargets = useMemo(() => {
    return tracked_targets.filter((t) => (t.world_id || 'WORLD_1') === activeWorld);
  }, [tracked_targets, activeWorld]);

  const statusStr = perception_status?.status || 'OFFLINE';
  const isConnected = statusStr === 'CONNECTED';
  const isDegraded = statusStr === 'DEGRADED';

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      {/* Perception Subsystem C Status Banner */}
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">PERCEPTION:</span>
            <span
              className={`ml-2 px-2 py-0.2 rounded text-[10px] font-bold tracking-wider ${
                isConnected
                  ? 'bg-[#151D26] border border-[#4F9A72]/60 text-[#4F9A72]'
                  : isDegraded
                  ? 'bg-[#151D26] border border-[#C49A4A]/60 text-[#C49A4A]'
                  : 'bg-[#151D26] border border-[#2B3743] text-[#707C88]'
              }`}
            >
              {statusStr}
            </span>
          </div>
        </div>
        {perception_status && (
          <div className="text-[10px] text-[#707C88] flex items-center space-x-2">
            <span>FPS: <strong className="text-[#E7EBEF]">{perception_status.inference_fps > 0 ? perception_status.inference_fps.toFixed(1) : '--'}</strong></span>
            <span>·</span>
            <span>LAT: <strong className="text-[#E7EBEF]">{perception_status.inference_latency_ms > 0 ? `${perception_status.inference_latency_ms.toFixed(0)}ms` : '--'}</strong></span>
          </div>
        )}
      </div>

      {/* Active Targets & Survivor Detections */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#E7EBEF]">
          <div className="flex items-center space-x-1.5">
            <Crosshair className="w-3.5 h-3.5 text-[#C49A4A]" />
            <span>ACTIVE SAR TARGETS ({worldTargets.length})</span>
          </div>
          {worldTargets.length > 0 && (
            <span className="text-[10px] text-[#707C88]">YOLOv8 + ByteTrack</span>
          )}
        </div>

        {worldTargets.length === 0 ? (
          <div className="text-center py-4 text-[#707C88] text-[11px] bg-[#151D26] rounded-lg border border-[#2B3743]">
            NO ACTIVE TARGET DETECTIONS
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
            {worldTargets.map((t) => {
              const targetId = String(t.target_id || t.id);
              const isSelected = String(selectedId) === targetId;
              const isSurvivor = t.label?.toUpperCase().includes('SURVIVOR') ?? true;
              const confPct = Math.round((t.confidence ?? 1.0) * 100);
              const timeSinceSec = Math.max(0, Math.round((Date.now() - (t.last_seen || Date.now())) / 1000));

              return (
                <div
                  key={targetId}
                  onClick={() => selectTarget(targetId)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF] shadow-[0_0_8px_rgba(91,143,185,0.2)]'
                      : isSurvivor
                      ? 'bg-[#151D26] border-[#C49A4A]/50 hover:bg-[#18222C]'
                      : 'bg-[#151D26] border-[#2B3743] hover:bg-[#18222C]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center space-x-1.5 text-[#E7EBEF]">
                      <span className="text-[11px]">{t.label || 'SURVIVOR'} #{targetId}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                          t.tracking_status === 'LOST'
                            ? 'bg-[#151D26] border-[#C75A5A]/60 text-[#C75A5A]'
                            : 'bg-[#151D26] border-[#C49A4A]/60 text-[#C49A4A]'
                        }`}
                      >
                        {t.tracking_status || 'TRACKED'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#707C88] tabular-nums">
                      UAV: <span className="text-[#A9B3BD]">{(t.drone_id || 'ALPHA').toUpperCase()}</span> · {t.latitude?.toFixed(5)}°N, {t.longitude?.toFixed(5)}°E · ALT: {(t.altitude_m ?? 15).toFixed(0)}m
                    </div>
                  </div>

                  <div className="text-right space-y-0.5 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#0B0F14] border border-[#2B3743] text-[#C49A4A] font-bold">
                      {confPct}%
                    </span>
                    <div className="text-[9px] text-[#707C88] tabular-nums">
                      {timeSinceSec === 0 ? 'Live' : `${timeSinceSec}s ago`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tactical Threat Matrix */}
      <div className="space-y-2 pt-2 border-t border-[#2B3743]/60">
        <div className="flex items-center space-x-1.5 font-bold text-[#E7EBEF]">
          <ShieldAlert className="w-3.5 h-3.5 text-[#C75A5A]" />
          <span>TACTICAL THREAT MATRIX ({threats.length})</span>
        </div>

        {threats.length === 0 ? (
          <div className="text-center py-3 text-[#707C88] text-[11px] bg-[#151D26] rounded-lg border border-[#2B3743]">
            No airspace hazards or perimeter threats detected.
          </div>
        ) : (
          threats.map((threat) => (
            <div
              key={threat.threat_id}
              className="p-2.5 rounded-lg border border-[#C49A4A]/50 bg-[#151D26] text-[#E7EBEF] flex items-center justify-between"
            >
              <div>
                <div className="font-bold flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#C49A4A]" />
                  <span>{threat.label}</span>
                </div>
                <div className="text-[10px] text-[#707C88] mt-0.5 tabular-nums">
                  DIST: {formatDistance(threat.distance_m)} · ALT: {threat.altitude_m}m · SRC: {threat.source}
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#0B0F14] border border-[#2B3743] text-[#C49A4A] font-bold">
                {(threat.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

