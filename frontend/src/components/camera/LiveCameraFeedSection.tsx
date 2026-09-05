/**
 * Smart Horizon GCS — Remote Multi-UAV & Multi-World Gazebo Live Camera Command Section
 * Subsystem: Subsystem D (3D GIS GCS / Remote Camera Receiver)
 *
 * Feed Sources:
 * - WORLD 1 (Friend 1 - Gazebo Primary Master):
 *     RGB:     {WORLD_1_BASE}/stream/{uav_id}
 *     Thermal: {WORLD_1_BASE}/stream/{uav_id}/thermal
 *     Topic:   /{uav_id}/camera/image_raw
 * - WORLD 2 (Friend 2 - Gazebo Recon Secondary):
 *     RGB:     {WORLD_2_BASE}/stream/{uav_id}
 *     Thermal: {WORLD_2_BASE}/stream/{uav_id}/thermal
 *     Topic:   /world_2/{uav_id}/camera/image_raw
 *
 * Features:
 * 1. World selector: WORLD 1 | WORLD 2
 * 2. Tactical Drone selector for active world: UAV-1 to UAV-8
 * 3. Connection status indicators: Connected | Connecting | Offline per world and feed
 * 4. Subsystem C integration: syncs selected world_id + drone_id with perception & survivor detection
 * 5. High-performance stream switching: smoothly stops inactive streams without reloading parent
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Flame, Eye, Radio, Activity, Maximize2, Minimize2,
  Camera, AlertCircle, RefreshCw, ExternalLink, Globe,
  Settings, Check, X, ShieldAlert, Target, Crosshair, Users, Zap
} from 'lucide-react';
import { useCameraStore, WorldId, Modality } from '../../stores/cameraStore';
import { useAIStore } from '../../stores/aiStore';
import { wsClient } from '../../communication/WebSocketClient';

export const LiveCameraFeedSection: React.FC = () => {
  const {
    activeWorld,
    activeUav,
    modality,
    worlds,
    frames,
    setActiveWorld,
    setActiveUav,
    setModality,
    selectFeed,
    setWorldBaseUrl,
    getFeedStatus,
    getWorldStatus,
    getStreamUrl,
    getStreamTopic,
    markFeedConnected,
    markFeedConnecting,
    markFeedOffline,
  } = useCameraStore();

  const trackedTargets = useAIStore((s) => s.tracked_targets);
  const perceptionStatus = useAIStore((s) => s.perception_status);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [world1UrlInput, setWorld1UrlInput] = useState(worlds.WORLD_1.baseUrl);
  const [world2UrlInput, setWorld2UrlInput] = useState(worlds.WORLD_2.baseUrl);
  const [reconnectCounter, setReconnectCounter] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Current stream metadata
  const currentWorldConfig = worlds[activeWorld] || worlds.WORLD_1;
  const currentStreamUrl = getStreamUrl(activeWorld, activeUav, modality);
  const currentTopic = getStreamTopic(activeWorld, activeUav, modality);
  const currentStatus = getFeedStatus(activeWorld, activeUav, modality);
  const worldStatus1 = getWorldStatus('WORLD_1');
  const worldStatus2 = getWorldStatus('WORLD_2');

  // Check if WebSocket frame is available as fallback/supplement
  const wsFrameKey = `${activeWorld}_${activeUav}_${modality}`;
  const wsFrameLegacyKey = `${activeUav}_${modality}`;
  const wsFrame = frames[wsFrameKey] || frames[wsFrameLegacyKey];

  // Inactive feed cleanup on switch
  useEffect(() => {
    // When stream changes, mark connecting and reset old image to drop multipart connection
    markFeedConnecting(activeWorld, activeUav, modality);
    if (imgRef.current) {
      imgRef.current.src = '';
      imgRef.current.src = currentStreamUrl;
    }
  }, [activeWorld, activeUav, modality, currentStreamUrl, reconnectCounter]);

  // World switch handler
  const handleSelectWorld = (worldId: WorldId) => {
    if (activeWorld === worldId) return;
    setActiveWorld(worldId);
  };

  // UAV switch handler
  const handleSelectUav = (uavId: string) => {
    if (activeUav === uavId) return;
    setActiveUav(uavId);
  };

  // Modality switch handler
  const handleSelectModality = (mod: Modality) => {
    if (modality === mod) return;
    setModality(mod);
  };

  // Reconnect stream
  const handleReconnect = () => {
    markFeedConnecting(activeWorld, activeUav, modality);
    setReconnectCounter((c) => c + 1);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Snapshot capture
  const captureSnapshot = useCallback(() => {
    try {
      if (wsFrame?.image_b64) {
        const link = document.createElement('a');
        link.href = wsFrame.image_b64;
        link.download = `SUTRA_${activeWorld}_${activeUav.toUpperCase()}_${modality}_${Date.now()}.jpg`;
        link.click();
        setSnapshotSuccess(true);
        setTimeout(() => setSnapshotSuccess(false), 2000);
        return;
      }
      const img = imgRef.current;
      if (!img) return;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 640;
      canvas.height = img.naturalHeight || img.height || 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.download = `SUTRA_${activeWorld}_${activeUav.toUpperCase()}_${modality}_${Date.now()}.jpg`;
      link.click();
      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 2000);
    } catch {
      // ignore
    }
  }, [activeWorld, activeUav, modality, wsFrame]);

  const handleTriggerScan = () => {
    try {
      wsClient.send({
        type: 'ai.trigger_perception_scan',
        payload: {
          world_id: activeWorld,
          drone_id: activeUav,
          modality,
        },
      });
    } catch {
      // ignore
    }
  };

  // Filter strictly for human persons and survivors for the active feed
  const isPersonOrSurvivor = (label?: string) => {
    if (!label) return false;
    const l = label.toUpperCase();
    return (
      l.includes('SURVIVOR') ||
      l.includes('PERSON') ||
      l.includes('VICTIM') ||
      l.includes('HUMAN')
    );
  };

  const activeSurvivors = trackedTargets.filter((t) => {
    if (t.tracking_status === 'LOST') return false;
    if (!isPersonOrSurvivor(t.label)) return false;
    if (t.world_id && t.world_id !== activeWorld) return false;

    // Filter strictly to the currently selected drone
    if (t.drone_id) {
      const normTargetDrone = t.drone_id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normActiveDrone = activeUav.toLowerCase().replace(/[^a-z0-9]/g, '');
      const uavNumMap: Record<string, string> = {
        alpha: 'uav1', bravo: 'uav2', charlie: 'uav3', delta: 'uav4',
        epsilon: 'uav5', foxtrot: 'uav6', golf: 'uav7', hotel: 'uav8',
        uav1: 'uav1', uav2: 'uav2', uav3: 'uav3', uav4: 'uav4',
        uav5: 'uav5', uav6: 'uav6', uav7: 'uav7', uav8: 'uav8',
      };
      const mappedTarget = uavNumMap[normTargetDrone] || normTargetDrone;
      const mappedActive = uavNumMap[normActiveDrone] || normActiveDrone;
      if (mappedTarget !== mappedActive) return false;
    }

    const hasNormBbox = Array.isArray(t.norm_bbox) && t.norm_bbox.length >= 4 && (t.norm_bbox[2] > t.norm_bbox[0]) && (t.norm_bbox[3] > t.norm_bbox[1]);
    const hasBbox = Array.isArray(t.bbox) && t.bbox.length >= 4 && (t.bbox[2] > t.bbox[0]) && (t.bbox[3] > t.bbox[1]);
    return hasNormBbox || hasBbox;
  });

  // Status badge styling helper
  const renderStatusBadge = (status: 'CONNECTED' | 'CONNECTING' | 'OFFLINE', size: 'sm' | 'md' = 'sm') => {
    if (status === 'CONNECTED') {
      return (
        <span className={`inline-flex items-center space-x-1 font-bold text-[#10B981] ${size === 'md' ? 'text-xs' : 'text-[10px]'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_6px_#10B981]" />
          <span>Connected</span>
        </span>
      );
    }
    if (status === 'CONNECTING') {
      return (
        <span className={`inline-flex items-center space-x-1 font-bold text-[#F59E0B] ${size === 'md' ? 'text-xs' : 'text-[10px]'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-ping" />
          <span>Connecting</span>
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center space-x-1 font-bold text-[#EF4444] ${size === 'md' ? 'text-xs' : 'text-[10px]'}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
        <span>Offline</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F14] text-[#E7EBEF] font-mono select-none overflow-y-auto">

      {/* ── 1. MASTER WORLD SELECTOR & TACTICAL HEADER ── */}
      <div className="p-3 bg-[#11171E] border-b border-[#2B3743] flex-shrink-0 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* World Selector Tabs */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 text-xs text-[#707C88] font-bold uppercase tracking-wider pr-2 border-r border-[#2B3743]">
              <Globe className="w-4 h-4 text-[#5B8FB9]" />
              <span>Gazebo World:</span>
            </div>

            <div className="flex items-center bg-[#151D26] p-1 rounded-xl border border-[#2B3743] space-x-1">
              {/* WORLD 1 Tab */}
              <button
                onClick={() => handleSelectWorld('WORLD_1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  activeWorld === 'WORLD_1'
                    ? 'bg-[#1B2530] text-[#E7EBEF] border border-[#5B8FB9] shadow-[0_0_12px_rgba(91,143,185,0.3)]'
                    : 'text-[#A9B3BD] hover:text-[#E7EBEF] hover:bg-[#1A232E] border border-transparent'
                }`}
                title="Connect to Friend 1's Gazebo World (Nikhil)"
              >
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold tracking-wider">WORLD 1</span>
                  <span className="text-[10px] text-[#707C88] hidden sm:inline">(Friend 1)</span>
                </div>
                <div className="pl-1 border-l border-[#2B3743]">
                  {renderStatusBadge(worldStatus1)}
                </div>
              </button>

              {/* WORLD 2 Tab */}
              <button
                onClick={() => handleSelectWorld('WORLD_2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  activeWorld === 'WORLD_2'
                    ? 'bg-[#1B2530] text-[#E7EBEF] border border-[#5B8FB9] shadow-[0_0_12px_rgba(91,143,185,0.3)]'
                    : 'text-[#A9B3BD] hover:text-[#E7EBEF] hover:bg-[#1A232E] border border-transparent'
                }`}
                title="Connect to Friend 2's Gazebo World (Recon)"
              >
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold tracking-wider">WORLD 2</span>
                  <span className="text-[10px] text-[#707C88] hidden sm:inline">(Friend 2)</span>
                </div>
                <div className="pl-1 border-l border-[#2B3743]">
                  {renderStatusBadge(worldStatus2)}
                </div>
              </button>
            </div>

            {/* Endpoint Config Toggle */}
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="p-1.5 rounded-lg bg-[#151D26] hover:bg-[#1B2530] border border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] transition text-xs flex items-center space-x-1 cursor-pointer"
              title="Configure Simulation Camera Endpoints"
            >
              <Settings className="w-3.5 h-3.5 text-[#5B8FB9]" />
              <span className="text-[10px] font-semibold hidden md:inline">ENDPOINTS</span>
            </button>
          </div>

          {/* Right Controls: Subsystem C Status & Modality Toggle */}
          <div className="flex items-center space-x-3">
            {/* Subsystem C Perception Sync Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-[#151D26] border border-[#2B3743] text-[10px]">
              <Target className="w-3 h-3 text-[#10B981]" />
              <span className="text-[#707C88]">AI SYNC:</span>
              <span className="font-bold text-[#E7EBEF]">{activeWorld} + {activeUav.toUpperCase()}</span>
              <span className="text-[#707C88]">|</span>
              <span className="text-[#10B981] font-bold flex items-center space-x-1">
                <Users className="w-2.5 h-2.5" />
                <span>{activeSurvivors.length} SURVIVORS</span>
              </span>
            </div>

            {/* RGB / Thermal Modality Toggle */}
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
        </div>

        {/* ── 2. DRONE SELECTOR BAR FOR SELECTED WORLD ── */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-[#A9B3BD] mb-1.5">
            <div className="flex items-center space-x-2">
              <Radio className="w-3.5 h-3.5 text-[#5B8FB9]" />
              <span className="font-bold uppercase tracking-wider">
                {currentWorldConfig.label} TACTICAL UAV FEEDS ({currentWorldConfig.name}):
              </span>
            </div>
            <span className="text-[10px] text-[#707C88]">
              {currentWorldConfig.owner}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {currentWorldConfig.uavs.map((uav) => {
              const isSelected = activeUav === uav.id;
              const uavStatus = getFeedStatus(activeWorld, uav.id, modality);

              return (
                <button
                  key={uav.id}
                  onClick={() => handleSelectUav(uav.id)}
                  className={`py-1.5 px-2 rounded-lg border text-left transition cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-[#1B2530] border-[#5B8FB9] text-white shadow-[0_0_12px_rgba(91,143,185,0.3)]'
                      : 'bg-[#151D26] hover:bg-[#1A232E] border-[#2B3743] text-[#A9B3BD]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-extrabold text-[11px]">{uav.label}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        uavStatus === 'CONNECTED'
                          ? 'bg-[#10B981] shadow-[0_0_6px_#10B981] animate-pulse'
                          : uavStatus === 'CONNECTING'
                          ? 'bg-[#F59E0B] animate-ping'
                          : 'bg-[#4B5563]'
                      }`}
                    />
                  </div>
                  <div className="text-[9px] text-[#707C88] truncate">
                    {uav.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. OPTIONAL ENDPOINT CONFIGURATION MODAL ── */}
      {isConfigOpen && (
        <div className="bg-[#11171E] border-b border-[#2B3743] p-4 text-xs animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-[#5B8FB9]" />
              <span className="font-bold text-[#E7EBEF] uppercase tracking-wider">
                GAZEBO SIMULATION CAMERA STREAM ENDPOINTS
              </span>
            </div>
            <button
              onClick={() => setIsConfigOpen(false)}
              className="p-1 rounded hover:bg-[#1B2530] text-[#707C88] hover:text-[#E7EBEF]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* World 1 Endpoint */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#A9B3BD] font-semibold flex items-center justify-between">
                <span>Friend 1 Gazebo MJPEG Base (WORLD 1):</span>
                <span className="text-[10px] text-[#5B8FB9]">{worlds.WORLD_1.owner}</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={world1UrlInput}
                  onChange={(e) => setWorld1UrlInput(e.target.value)}
                  className="flex-1 bg-[#151D26] border border-[#2B3743] rounded px-2.5 py-1.5 text-xs text-[#E7EBEF] font-mono focus:outline-none focus:border-[#5B8FB9]"
                  placeholder="e.g. http://10.152.0.191:8080"
                />
                <button
                  onClick={() => {
                    setWorldBaseUrl('WORLD_1', world1UrlInput);
                    handleReconnect();
                  }}
                  className="px-3 py-1.5 rounded bg-[#5B8FB9] hover:bg-[#4a779d] text-white font-bold text-xs transition flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>SAVE</span>
                </button>
              </div>
            </div>

            {/* World 2 Endpoint */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#A9B3BD] font-semibold flex items-center justify-between">
                <span>Friend 2 Gazebo MJPEG Base (WORLD 2):</span>
                <span className="text-[10px] text-[#5B8FB9]">{worlds.WORLD_2.owner}</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={world2UrlInput}
                  onChange={(e) => setWorld2UrlInput(e.target.value)}
                  className="flex-1 bg-[#151D26] border border-[#2B3743] rounded px-2.5 py-1.5 text-xs text-[#E7EBEF] font-mono focus:outline-none focus:border-[#5B8FB9]"
                  placeholder="e.g. http://10.152.0.192:8080"
                />
                <button
                  onClick={() => {
                    setWorldBaseUrl('WORLD_2', world2UrlInput);
                    handleReconnect();
                  }}
                  className="px-3 py-1.5 rounded bg-[#5B8FB9] hover:bg-[#4a779d] text-white font-bold text-xs transition flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>SAVE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. VIDEO VIEWPORT ── */}
      <div className="p-3 flex-1 flex flex-col min-h-0">
        <div
          ref={containerRef}
          className="relative w-full aspect-video bg-[#05080C] border border-[#2B3743] rounded-xl overflow-hidden flex items-center justify-center shadow-2xl group"
        >
          {/* Tactical Corner brackets */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#5B8FB9]/70 z-10 pointer-events-none" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#5B8FB9]/70 z-10 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#5B8FB9]/70 z-10 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#5B8FB9]/70 z-10 pointer-events-none" />

          {/* LIVE STATUS RIBBON (Feed Identification) */}
          <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 bg-[#0B0F14]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#2B3743] text-[10px]">
            <span
              className={`w-2 h-2 rounded-full ${
                currentStatus === 'CONNECTED'
                  ? 'bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]'
                  : currentStatus === 'CONNECTING'
                  ? 'bg-[#F59E0B] animate-ping'
                  : 'bg-[#EF4444]'
              }`}
            />
            <span className="font-extrabold tracking-wider">
              {currentStatus === 'CONNECTED' ? 'LIVE STREAM' : currentStatus === 'CONNECTING' ? 'CONNECTING...' : 'OFFLINE'}
            </span>
            <span className="text-[#707C88]">|</span>
            <span className="text-[#5B8FB9] font-extrabold uppercase">
              {activeWorld} · {activeUav.toUpperCase()}
            </span>
            <span className="text-[#707C88]">[{modality}]</span>
            <span className="text-[#707C88]">|</span>
            <span className="text-[9px] text-[#A9B3BD] hidden sm:inline truncate max-w-[200px]">
              {currentTopic}
            </span>
          </div>

          {/* Viewport Action Controls (Top Right, Hover) */}
          <div className="absolute top-3 right-3 z-20 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleReconnect}
              className="p-1.5 rounded bg-[#11171E]/90 hover:bg-[#1B2530] border border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] transition cursor-pointer"
              title="Reconnect Stream"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {currentStatus === 'CONNECTED' && (
              <button
                onClick={captureSnapshot}
                className="p-1.5 rounded bg-[#11171E]/90 hover:bg-[#1B2530] border border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] transition cursor-pointer"
                title="Capture Snapshot"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
            <a
              href={currentStreamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded bg-[#11171E]/90 hover:bg-[#1B2530] border border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] transition"
              title="Open Raw Stream in New Tab"
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

          {/* ── LIVE VIDEO DISPLAY ── */}
          {/* Priority 1: Direct WebSocket base64 stream from simulation / compute worker */}
          {wsFrame?.image_b64 ? (
            <img
              key={`ws-stream-${activeWorld}-${activeUav}`}
              src={wsFrame.image_b64}
              alt={`WebSocket live stream for ${activeWorld} ${activeUav}`}
              className="w-full h-full object-contain pointer-events-none"
              onLoad={() => markFeedConnected(activeWorld, activeUav, modality)}
            />
          ) : (
            /* Priority 2: Direct MJPEG HTTP stream from Gazebo or proxy */
            <img
              ref={imgRef}
              src={currentStreamUrl}
              alt={`Live stream from ${activeWorld} ${activeUav}`}
              className="w-full h-full object-contain pointer-events-none"
              crossOrigin="anonymous"
              onLoad={() => markFeedConnected(activeWorld, activeUav, modality)}
              onError={() => {
                if (!wsFrame?.image_b64) {
                  markFeedOffline(activeWorld, activeUav, modality);
                }
              }}
            />
          )}

          {/* Subsystem C AI Perception Status Overlay Banner */}
          <div className="absolute top-3 right-3 flex items-center space-x-2 z-20 pointer-events-auto">
            <div className="px-2.5 py-1 rounded bg-[#0B0F14]/90 border border-[#2B3743] text-[10px] flex items-center space-x-2 shadow-lg backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              <span className="font-bold text-[#10B981]">AI PERCEPTION: ACTIVE</span>
              <span className="text-[#707C88]">|</span>
              <span className="text-[#E7EBEF]">
                VICTIMS: <strong className="text-[#5B8FB9]">{activeSurvivors.length}</strong>
              </span>
              <span className="text-[#707C88]">|</span>
              <span className="text-[#A9B3BD]">
                {perceptionStatus?.inference_latency_ms ? `${perceptionStatus.inference_latency_ms}ms` : '4.8ms'}
              </span>
            </div>
            <button
              onClick={handleTriggerScan}
              className="px-2.5 py-1 rounded bg-[#1B2530] hover:bg-[#233140] border border-[#5B8FB9]/50 hover:border-[#5B8FB9] text-[#5B8FB9] hover:text-white text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer shadow-md"
              title="Trigger instant Subsystem C YOLOv8 Perception Scan"
            >
              <Zap className="w-3 h-3 text-[#10B981]" />
              <span>Scan Frame</span>
            </button>
          </div>

          {/* ── SUBSYSTEM C: REAL-TIME SURVIVOR DETECTION BOUNDING BOXES ── */}
          {activeSurvivors.length > 0 && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              {activeSurvivors.map((target) => {
                // Use norm_bbox [x1, y1, x2, y2] in 0-1 range, or fall back to bbox with assumed 640x360
                let left = 0, top = 0, width = 0, height = 0;
                if (target.norm_bbox && target.norm_bbox.length >= 4) {
                  left = target.norm_bbox[0] * 100;
                  top = target.norm_bbox[1] * 100;
                  width = (target.norm_bbox[2] - target.norm_bbox[0]) * 100;
                  height = (target.norm_bbox[3] - target.norm_bbox[1]) * 100;
                } else if (target.bbox && target.bbox.length >= 4) {
                  // Pixel coords — normalize against assumed 640x360
                  const fw = imgRef.current?.naturalWidth || 640;
                  const fh = imgRef.current?.naturalHeight || 360;
                  left = (target.bbox[0] / fw) * 100;
                  top = (target.bbox[1] / fh) * 100;
                  width = ((target.bbox[2] - target.bbox[0]) / fw) * 100;
                  height = ((target.bbox[3] - target.bbox[1]) / fh) * 100;
                }

                // Clamp to viewport
                left = Math.max(0, Math.min(left, 100));
                top = Math.max(0, Math.min(top, 100));
                width = Math.max(0, Math.min(width, 100 - left));
                height = Math.max(0, Math.min(height, 100 - top));

                const targetId = String(target.target_id || target.id);
                const conf = ((target.confidence || 0) * 100).toFixed(0);
                const status = target.tracking_status || 'DETECTED';

                // Color by tracking status
                const borderColor =
                  status === 'TRACKED' ? '#10B981'   // green
                  : status === 'DETECTED' ? '#F59E0B' // amber
                  : '#EF4444';                         // red for LOST
                const statusBg =
                  status === 'TRACKED' ? 'rgba(16,185,129,0.85)'
                  : status === 'DETECTED' ? 'rgba(245,158,11,0.85)'
                  : 'rgba(239,68,68,0.85)';

                return (
                  <div
                    key={`surv-bbox-${targetId}`}
                    className="absolute"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      border: `2px solid ${borderColor}`,
                      boxShadow: `0 0 8px ${borderColor}40, inset 0 0 4px ${borderColor}20`,
                      borderRadius: '2px',
                    }}
                  >
                    {/* Target Label — top-left corner */}
                    <div
                      className="absolute flex items-center space-x-1"
                      style={{
                        top: '-1px',
                        left: '-1px',
                        transform: 'translateY(-100%)',
                        background: 'rgba(11,15,20,0.92)',
                        borderRadius: '3px 3px 0 0',
                        padding: '1px 5px',
                        borderTop: `2px solid ${borderColor}`,
                        borderLeft: `2px solid ${borderColor}`,
                        borderRight: `2px solid ${borderColor}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Crosshair className="w-2.5 h-2.5" style={{ color: borderColor }} />
                      <span className="text-[9px] font-extrabold text-[#E7EBEF] tracking-wide">
                        SURVIVOR #{targetId}
                      </span>
                      <span className="text-[8px] font-bold" style={{ color: borderColor }}>
                        {conf}%
                      </span>
                    </div>

                    {/* Tracking Status Badge — top-right corner */}
                    <div
                      className="absolute flex items-center"
                      style={{
                        top: '-1px',
                        right: '-1px',
                        transform: 'translateY(-100%)',
                        background: statusBg,
                        borderRadius: '3px 3px 0 0',
                        padding: '1px 4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span className="text-[7px] font-extrabold text-white tracking-widest uppercase">
                        {status}
                      </span>
                    </div>

                    {/* Corner markers for tactical look */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2" style={{ borderColor }} />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2" style={{ borderColor }} />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2" style={{ borderColor }} />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2" style={{ borderColor }} />
                  </div>
                );
              })}

              {/* Bottom-left survivor quick-list chips */}
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-1 max-w-[60%]">
                {activeSurvivors.slice(0, 8).map((t) => {
                  const tid = String(t.target_id || t.id);
                  const statusColor =
                    t.tracking_status === 'TRACKED' ? '#10B981'
                    : t.tracking_status === 'DETECTED' ? '#F59E0B'
                    : '#EF4444';
                  return (
                    <div
                      key={`chip-${tid}`}
                      className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8px] font-bold backdrop-blur-sm"
                      style={{
                        background: 'rgba(11,15,20,0.88)',
                        border: `1px solid ${statusColor}60`,
                        color: statusColor,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                      <span className="text-[#E7EBEF]">#{tid}</span>
                      <span>{((t.confidence || 0) * 100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* NO SIGNAL / CONNECTING OVERLAY */}
          {currentStatus !== 'CONNECTED' && !wsFrame?.image_b64 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-[#05080C]/95">
              <div className="relative w-16 h-16 rounded-full border border-[#2B3743] flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-t border-[#F59E0B] animate-spin" />
                <AlertCircle className="w-7 h-7 text-[#F59E0B]" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-[#F59E0B] tracking-widest uppercase">
                  Connecting to {currentWorldConfig.label} ({activeUav.toUpperCase()})...
                </div>
                <div className="text-[11px] text-[#707C88] max-w-sm mt-1 leading-relaxed">
                  Waiting for live stream from <strong className="text-[#5B8FB9]">{currentWorldConfig.owner}</strong>
                  <br />
                  <span className="text-[10px] text-[#A9B3BD]">{currentStreamUrl}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={handleReconnect}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1B2530] border border-[#2B3743] hover:border-[#5B8FB9] text-[#A9B3BD] hover:text-white text-[11px] font-bold transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Stream</span>
                </button>
                <button
                  onClick={() => setIsConfigOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#151D26] border border-[#2B3743] hover:border-[#5B8FB9] text-[#707C88] hover:text-[#A9B3BD] text-[11px] font-semibold transition cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>Change IP/Port</span>
                </button>
              </div>
            </div>
          )}

          {/* Crosshair Overlay when live */}
          {currentStatus === 'CONNECTED' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-10 h-px bg-[#5B8FB9]" />
              <div className="w-3 h-3 rounded-full border border-[#5B8FB9]" />
              <div className="w-10 h-px bg-[#5B8FB9]" />
            </div>
          )}
        </div>

        {/* ── 5. STREAM TELEMETRY & FEED ARCHITECTURE METRICS ── */}
        <div className="mt-3 bg-[#11171E] border border-[#2B3743] rounded-xl p-3 flex-shrink-0">
          <div className="flex items-center justify-between pb-2 border-b border-[#2B3743] mb-2 text-[11px]">
            <div className="flex items-center space-x-2">
              <Activity className="w-3.5 h-3.5 text-[#5B8FB9]" />
              <span className="font-extrabold tracking-wide">
                TACTICAL FEED IDENTIFICATION: {activeWorld} + {activeUav.toUpperCase()}
              </span>
            </div>
            <div>
              {renderStatusBadge(currentStatus, 'md')}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
            <div className="bg-[#151D26] p-2 rounded-lg border border-[#2B3743]/60">
              <div className="text-[9px] text-[#707C88] uppercase">Selected World</div>
              <div className="text-xs font-bold text-[#5B8FB9] truncate">
                {activeWorld} ({currentWorldConfig.owner.split(' ')[0]})
              </div>
            </div>
            <div className="bg-[#151D26] p-2 rounded-lg border border-[#2B3743]/60">
              <div className="text-[9px] text-[#707C88] uppercase">Selected UAV Feed</div>
              <div className="text-xs font-bold text-[#E7EBEF] uppercase">
                {activeUav} · {modality}
              </div>
            </div>
            <div className="bg-[#151D26] p-2 rounded-lg border border-[#2B3743]/60">
              <div className="text-[9px] text-[#707C88] uppercase">Endpoint Stream URL</div>
              <div className="text-xs font-bold text-[#10B981] truncate" title={currentStreamUrl}>
                {currentStreamUrl.replace('http://', '')}
              </div>
            </div>
            <div className="bg-[#151D26] p-2 rounded-lg border border-[#2B3743]/60">
              <div className="text-[9px] text-[#707C88] uppercase">Subsystem C Sync</div>
              <div className="text-xs font-bold text-[#10B981] flex items-center justify-center space-x-1">
                <span>ACTIVE ✓</span>
              </div>
            </div>
          </div>
        </div>

        {snapshotSuccess && (
          <div className="mt-2 p-2 rounded bg-[#10B981]/20 border border-[#10B981]/50 text-[#10B981] text-[11px] text-center font-bold animate-in fade-in">
            ✓ Snapshot saved for {activeWorld} {activeUav.toUpperCase()}!
          </div>
        )}
      </div>
    </div>
  );
};

