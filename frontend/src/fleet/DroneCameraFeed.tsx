import React, { useState, memo } from 'react';
import { useCameraStore } from '../stores/cameraStore';
import { wsClient } from '../communication/WebSocketClient';
import { Video, Eye, Radio, Sparkles, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface DroneCameraFeedProps {
  droneId: string;
  callsign?: string;
  compact?: boolean;
  showControls?: boolean;
}

export const DroneCameraFeed: React.FC<DroneCameraFeedProps> = memo(({
  droneId,
  callsign,
  compact = false,
  showControls = true,
}) => {
  const simHost = useCameraStore((s) => s.simHost);
  const activeModality = useCameraStore((s) => s.activeModality);
  const setActiveModality = useCameraStore((s) => s.setActiveModality);
  const videoSourceMode = useCameraStore((s) => s.videoSourceMode);
  const frame = useCameraStore((s) => s.frames[droneId]);

  const [hasStreamError, setHasStreamError] = useState(false);
  const [localModality, setLocalModality] = useState<'RGB' | 'THERMAL'>(activeModality);
  const [useWsFallback, setUseWsFallback] = useState(false);

  // Derive standardized drone ID (e.g., 'uav_alpha' from 'drone_alpha' or vice-versa)
  const normalizedDid = droneId.startsWith('uav_')
    ? droneId
    : droneId.replace('drone_', 'uav_');

  const mjpegUrl = `http://${simHost}:8080/stream/${normalizedDid}?modality=${localModality}`;
  const wsImage = frame?.image_b64;
  const jscc = frame?.jscc;
  const pose = frame?.pose;

  const handleModalityToggle = (mod: 'RGB' | 'THERMAL') => {
    setLocalModality(mod);
    setActiveModality(mod);
    wsClient.sendCommand('SET_STREAM_MODALITY', { modality: mod });
    setHasStreamError(false);
  };

  const handleRetryStream = () => {
    setHasStreamError(false);
    setUseWsFallback(!useWsFallback);
  };

  return (
    <div className={`relative bg-[#0B0F14] border border-[#2B3743] rounded-lg overflow-hidden flex flex-col font-mono select-none ${compact ? 'text-[10px]' : 'text-xs'}`}>
      {/* Top Header Bar */}
      <div className="bg-[#11171E] px-2.5 py-1.5 border-b border-[#2B3743] flex items-center justify-between text-[#E7EBEF]">
        <div className="flex items-center space-x-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-[#4F9A72] animate-pulse" />
          <Video className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span className="tracking-wide">{callsign || normalizedDid.toUpperCase()} CAM</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#151D26] border border-[#2B3743] text-[#707C88]">
            {localModality}
          </span>
        </div>

        {showControls && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleModalityToggle('RGB')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                localModality === 'RGB'
                  ? 'bg-[#5B8FB9] text-[#0B0F14]'
                  : 'bg-[#151D26] text-[#707C88] hover:text-[#E7EBEF]'
              }`}
            >
              RGB
            </button>
            <button
              onClick={() => handleModalityToggle('THERMAL')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                localModality === 'THERMAL'
                  ? 'bg-[#C49A4A] text-[#0B0F14]'
                  : 'bg-[#151D26] text-[#707C88] hover:text-[#E7EBEF]'
              }`}
            >
              FLIR
            </button>
          </div>
        )}
      </div>

      {/* Video Display Container */}
      <div className={`relative w-full bg-[#050709] flex items-center justify-center overflow-hidden ${compact ? 'aspect-video max-h-36' : 'aspect-video max-h-56'}`}>
        {!hasStreamError && !useWsFallback ? (
          <img
            src={mjpegUrl}
            alt={`${normalizedDid} video feed`}
            className="w-full h-full object-cover"
            onError={() => {
              if (wsImage) {
                setUseWsFallback(true);
              } else {
                setHasStreamError(true);
              }
            }}
          />
        ) : wsImage ? (
          <img
            src={wsImage}
            alt={`${normalizedDid} ws frame`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center space-y-1.5 text-[#707C88]">
            <AlertCircle className="w-5 h-5 text-[#C49A4A]" />
            <span className="text-[11px] font-bold text-[#E7EBEF]">CONNECTING VIDEO FEED...</span>
            <span className="text-[9px] text-[#707C88]">HTTP MJPEG: :8080 | WS: :9090</span>
            <button
              onClick={handleRetryStream}
              className="mt-1 px-2 py-0.5 rounded bg-[#151D26] border border-[#2B3743] hover:border-[#5B8FB9] text-[#E7EBEF] text-[10px] flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>RETRY FEED</span>
            </button>
          </div>
        )}

        {/* Deep JSCC HUD Overlay Badge */}
        {jscc && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#0B0F14]/90 border border-[#5B8FB9]/40 text-[#E7EBEF] text-[9px] flex items-center space-x-1 shadow">
            <Sparkles className="w-2.5 h-2.5 text-[#5B8FB9]" />
            <span>JSCC SNR: <strong className="text-[#5B8FB9]">{jscc.snr_db?.toFixed(1)}dB</strong></span>
            <span>·</span>
            <span>PSNR: <strong className="text-[#4F9A72]">{jscc.psnr_db?.toFixed(1)}dB</strong></span>
            <span>·</span>
            <span>{jscc.reduction_pct ?? 96.9}% REDUCTION</span>
          </div>
        )}

        {/* Synchronized Pose & Depth Watermark */}
        {pose && (
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#0B0F14]/85 border border-[#2B3743] text-[#A9B3BD] text-[8.5px] tabular-nums">
            LAT: {pose.latitude?.toFixed(5)}° · LON: {pose.longitude?.toFixed(5)}° · ALT: {pose.altitude?.toFixed(1)}m · HDG: {pose.heading?.toFixed(0)}°
            {frame?.depth_m !== undefined && ` · DEPTH: ${frame.depth_m.toFixed(1)}m`}
          </div>
        )}
      </div>
    </div>
  );
});
