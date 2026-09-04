/**
 * Smart Horizon GCS — Remote Multi-UAV Live Camera Receiver Section
 * Subsystem: Subsystem D (3D GIS GCS / Remote Camera Receiver)
 *
 * Feed source: Direct MJPEG stream from Nikhil's Gazebo simulation server
 *   http://10.152.0.191:8080/stream/{uav_id}          ← RGB optical
 *   http://10.152.0.191:8080/stream/{uav_id}/thermal  ← Thermal LWIR
 *
 * No WebSocket bridge needed — browser loads MJPEG natively via <img> tag.
 * MJPEG = Motion JPEG: server pushes JPEGs continuously (multipart/x-mixed-replace).
 */


import React, { useState, useRef, useCallback } from 'react';
import {
  Flame, Eye, Radio, Activity, Maximize2, Minimize2,
  Camera, AlertCircle, RefreshCw, ExternalLink,
} from 'lucide-react';

// ── Gazebo MJPEG Server (Nikhil's laptop) ─────────────────────────────────────
const MJPEG_BASE = 'http://10.152.0.191:8080';

const getMjpegUrl = (uavId: string, modality: 'RGB' | 'THERMAL'): string => {
  if (modality === 'THERMAL') {
    return `${MJPEG_BASE}/stream/${uavId}/thermal`;
  }
  return `${MJPEG_BASE}/stream/${uavId}`;
};

// ── UAV list ──────────────────────────────────────────────────────────────────
const UAV_LIST = [
  { id: 'uav_1', label: 'UAV-1', name: 'Alpha Recon' },
  { id: 'uav_2', label: 'UAV-2', name: 'Bravo Scout' },
  { id: 'uav_3', label: 'UAV-3', name: 'Charlie Relay' },
  { id: 'uav_4', label: 'UAV-4', name: 'Delta SAR' },
  { id: 'uav_5', label: 'UAV-5', name: 'Echo Patrol' },
  { id: 'uav_6', label: 'UAV-6', name: 'Foxtrot Flank' },
  { id: 'uav_7', label: 'UAV-7', name: 'Golf Perimeter' },
  { id: 'uav_8', label: 'UAV-8', name: 'Hotel Rear' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export const LiveCameraFeedSection: React.FC = () => {
  const [activeUav, setActiveUav]     = useState('uav_1');
  const [modality, setModality]       = useState<'RGB' | 'THERMAL'>('RGB');
  const [isLive, setIsLive]           = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imgKey, setImgKey]           = useState(0); // force reload on demand
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);

  // Build current stream URL
  const streamUrl = getMjpegUrl(activeUav, modality);

  // Switch UAV
  const handleSelectUav = (uavId: string) => {
    setActiveUav(uavId);
    setIsLive(false);
    setImgKey((k) => k + 1); // force <img> re-mount → re-connects stream
  };

  // Switch modality
  const handleSelectModality = (mod: 'RGB' | 'THERMAL') => {
    setModality(mod);
    setIsLive(false);
    setImgKey((k) => k + 1);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Snapshot (draw current MJPEG frame onto canvas → download)
  const captureSnapshot = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width  = img.naturalWidth  || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const link = document.createElement('a');
    link.href     = canvas.toDataURL('image/jpeg', 0.92);
    link.download = `SUTRA_${activeUav.toUpperCase()}_${modality}_${Date.now()}.jpg`;
    link.click();
    setSnapshotSuccess(true);
    setTimeout(() => setSnapshotSuccess(false), 2000);
  }, [activeUav, modality]);

  return (
    <div className="flex flex-col h-full bg-[#0B0F14] text-[#E7EBEF] font-mono select-none overflow-y-auto">

      {/* ── UAV SELECTOR BAR ── */}
      <div className="p-3 bg-[#11171E] border-b border-[#2B3743] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Radio className="w-3.5 h-3.5 text-[#5B8FB9]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A9B3BD]">
              Select Tactical UAV Stream:
            </span>
          </div>

          {/* RGB / Thermal Toggle */}
          <div className="flex items-center bg-[#151D26] p-0.5 rounded-lg border border-[#2B3743]">
            <button
              onClick={() => handleSelectModality('RGB')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition flex items-center space-x-1 cursor-pointer ${
                modality === 'RGB'
                  ? 'bg-[#5B8FB9] text-white shadow-sm'
                  : 'text-[#707C88] hover:text-[#E7EBEF]'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>RGB (OPTICAL)</span>
            </button>
            <button
              onClick={() => handleSelectModality('THERMAL')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition flex items-center space-x-1 cursor-pointer ${
                modality === 'THERMAL'
                  ? 'bg-[#F59E0B] text-black shadow-sm'
                  : 'text-[#707C88] hover:text-[#E7EBEF]'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>THERMAL (LWIR)</span>
            </button>
          </div>
        </div>

        {/* UAV Pills */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {UAV_LIST.map((uav) => {
            const isSelected = activeUav === uav.id;
            return (
              <button
                key={uav.id}
                onClick={() => handleSelectUav(uav.id)}
                className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#1B2530] border-[#5B8FB9] text-white shadow-[0_0_12px_rgba(91,143,185,0.3)]'
                    : 'bg-[#151D26] hover:bg-[#1A232E] border-[#2B3743] text-[#A9B3BD]'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSelected && isLive
                        ? 'bg-[#10B981] shadow-[0_0_6px_#10B981] animate-pulse'
                        : 'bg-[#4B5563]'
                    }`}
                  />
                  <span className="font-extrabold text-[11px]">{uav.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── VIDEO VIEWPORT ── */}
      <div className="p-3 flex-1 flex flex-col min-h-0">
        <div
          ref={containerRef}
          className="relative w-full aspect-video bg-[#05080C] border border-[#2B3743] rounded-xl overflow-hidden flex items-center justify-center shadow-2xl group"
        >
          {/* Corner brackets */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#5B8FB9]/70 z-10 pointer-events-none" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#5B8FB9]/70 z-10 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#5B8FB9]/70 z-10 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#5B8FB9]/70 z-10 pointer-events-none" />

          {/* LIVE status ribbon */}
          <div className="absolute top-3 left-3 z-20 flex items-center space-x-2 bg-[#0B0F14]/85 backdrop-blur-md px-2.5 py-1 rounded border border-[#2B3743] text-[10px]">
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]' : 'bg-[#EF4444]'
              }`}
            />
            <span className="font-extrabold tracking-wider">
              {isLive ? 'LIVE MJPEG FEED' : 'CONNECTING...'}
            </span>
            <span className="text-[#707C88]">|</span>
            <span className="text-[#5B8FB9] font-bold uppercase">{activeUav.toUpperCase()}</span>
            <span className="text-[#707C88]">[{modality}]</span>
          </div>

          {/* Controls overlay (top-right, hover only) */}
          <div className="absolute top-3 right-3 z-20 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setImgKey((k) => k + 1)}
              className="p-1.5 rounded bg-[#11171E]/90 hover:bg-[#1B2530] border border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] transition cursor-pointer"
              title="Reconnect stream"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {isLive && (
              <button
                onClick={captureSnapshot}
                className="p-1.5 rounded bg-[#11171E]/90 hover:bg-[#1B2530] border border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] transition cursor-pointer"
                title="Capture Snapshot"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded bg-[#11171E]/90 hover:bg-[#1B2530] border border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] transition"
              title="Open stream in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded bg-[#11171E]/90 hover:bg-[#1B2530] border border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] transition cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* ── DIRECT MJPEG STREAM ── */}
          {/* Browser loads this natively — no WebSocket, no bridge, no base64 */}
          <img
            key={imgKey}                     // changing key forces full remount = reconnect
            ref={imgRef}
            src={streamUrl}
            alt={`Live MJPEG feed from ${activeUav}`}
            className="w-full h-full object-contain pointer-events-none"
            crossOrigin="anonymous"
            onLoad={() => setIsLive(true)}
            onError={() => setIsLive(false)}
          />

          {/* NO SIGNAL overlay — shown while connecting or on error */}
          {!isLive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-[#05080C]">
              <div className="relative w-16 h-16 rounded-full border border-[#2B3743] flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-t border-[#EF4444] animate-spin" />
                <AlertCircle className="w-7 h-7 text-[#EF4444]/80" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-[#EF4444] tracking-widest uppercase">
                  Connecting to MJPEG Stream...
                </div>
                <div className="text-[11px] text-[#707C88] max-w-xs mt-1 leading-relaxed">
                  Waiting for Gazebo camera feed from{' '}
                  <strong className="text-[#5B8FB9]">10.152.0.191:8080</strong>
                  <br />
                  <span className="text-[10px]">{streamUrl}</span>
                </div>
              </div>
              <button
                onClick={() => setImgKey((k) => k + 1)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1B2530] border border-[#2B3743] text-[#A9B3BD] hover:text-white text-[11px] font-bold transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Crosshair when live */}
          {isLive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
              <div className="w-8 h-px bg-[#5B8FB9]" />
              <div className="w-2 h-2 rounded-full border border-[#5B8FB9]" />
              <div className="w-8 h-px bg-[#5B8FB9]" />
            </div>
          )}
        </div>

        {/* ── STREAM INFO BAR ── */}
        <div className="mt-3 bg-[#11171E] border border-[#2B3743] rounded-xl p-3 flex-shrink-0">
          <div className="flex items-center justify-between pb-2 border-b border-[#2B3743] mb-2 text-[11px]">
            <div className="flex items-center space-x-2">
              <Activity className="w-3.5 h-3.5 text-[#5B8FB9]" />
              <span className="font-extrabold tracking-wide">DIRECT MJPEG STREAM — NO BRIDGE</span>
            </div>
            <div className={`text-[10px] font-bold ${isLive ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
              {isLive ? '✓ LIVE FEED' : '○ CONNECTING'}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
            <div className="bg-[#151D26] p-2 rounded-lg border border-[#2B3743]/60">
              <div className="text-[9px] text-[#707C88] uppercase">Stream Source</div>
              <div className="text-xs font-bold text-[#5B8FB9] truncate">10.152.0.191:8080</div>
            </div>
            <div className="bg-[#151D26] p-2 rounded-lg border border-[#2B3743]/60">
              <div className="text-[9px] text-[#707C88] uppercase">Protocol</div>
              <div className="text-xs font-bold text-[#E7EBEF]">MJPEG / HTTP</div>
            </div>
            <div className="bg-[#151D26] p-2 rounded-lg border border-[#2B3743]/60">
              <div className="text-[9px] text-[#707C88] uppercase">Active Stream</div>
              <div className="text-xs font-bold text-[#10B981] truncate">
                /stream/{activeUav}
                {modality === 'THERMAL' ? '/thermal' : ''}
              </div>
            </div>
            <div className="bg-[#151D26] p-2 rounded-lg border border-[#2B3743]/60">
              <div className="text-[9px] text-[#707C88] uppercase">Bridge Needed</div>
              <div className="text-xs font-bold text-[#10B981]">NONE ✓</div>
            </div>
          </div>
        </div>

        {snapshotSuccess && (
          <div className="mt-2 p-2 rounded bg-[#10B981]/20 border border-[#10B981]/50 text-[#10B981] text-[11px] text-center font-bold animate-in fade-in">
            ✓ Snapshot saved!
          </div>
        )}
      </div>
    </div>
  );
};
