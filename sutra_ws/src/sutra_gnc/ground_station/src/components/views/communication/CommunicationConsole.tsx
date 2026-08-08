import React, { useState } from 'react';
import { 
  Radio, 
  Wifi, 
  Settings2, 
  Upload, 
  Camera, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Save, 
  RotateCcw, 
  Play, 
  Video, 
  Download, 
  Cpu, 
  Sliders,
  RefreshCw,
  Plus
} from 'lucide-react';

import { 
  ConnectionManager, 
  DroneManager, 
  ParameterProtocol, 
  MissionUploader, 
  RTSPManager, 
  VideoRecorder,
  SignalMonitor
} from '../../../communication';

import type { DroneAsset, TelemetryData, Waypoint } from '../../../types';
import type { VehicleDiscoveryInfo, MAVParameter, CameraStreamConfig } from '../../../communication/types';

interface CommunicationConsoleProps {
  activeDrone: DroneAsset;
  telemetry: TelemetryData;
  waypoints: Waypoint[];
}

export const CommunicationConsole: React.FC<CommunicationConsoleProps> = ({
  activeDrone,
  telemetry,
  waypoints
}) => {
  const [activeTab, setActiveTab] = useState<'CONNECTION' | 'TELEMETRY' | 'PARAMETERS' | 'MISSION_UPLOAD' | 'CAMERA' | 'VEHICLE_STATUS'>('CONNECTION');
  const [vehicles, setVehicles] = useState<VehicleDiscoveryInfo[]>(ConnectionManager.getConnectedVehicles());
  const [parameters, setParameters] = useState<MAVParameter[]>(ParameterProtocol.getParameters());
  const [paramSearch, setParamSearch] = useState<string>('');
  const [streams, setStreams] = useState<CameraStreamConfig[]>(RTSPManager.getStreams());
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [connectionUrlInput, setConnectionUrlInput] = useState<string>('udp://127.0.0.1:14540');

  // Trigger Automatic Discovery
  const handleDiscover = () => {
    const discovered = DroneManager.discoverDrones();
    setVehicles([...discovered]);
  };

  // Trigger Manual Connection
  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const newSysId = vehicles.length + 1;
    ConnectionManager.connectVehicle(newSysId, connectionUrlInput, 'UDP_SITL');
    setVehicles([...ConnectionManager.getConnectedVehicles()]);
  };

  // Upload Mission to Autopilot
  const handleUploadMission = async () => {
    setUploadProgress(0);
    await MissionUploader.uploadMission(1, waypoints, (pct) => {
      setUploadProgress(pct);
    });
    setTimeout(() => setUploadProgress(null), 2000);
  };

  // Update Parameter Value
  const handleParamChange = (name: string, val: number) => {
    ParameterProtocol.setParameter(name, val);
    setParameters([...ParameterProtocol.getParameters()]);
  };

  const filteredParams = parameters.filter((p) =>
    p.name.toLowerCase().includes(paramSearch.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(paramSearch.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#050811] text-slate-200 font-mono select-none overflow-hidden relative">
      {/* 1. TOP TITLE BAR */}
      <header className="h-12 bg-[#080d1a] border-b border-[#1b253b] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          </div>
          <span className="font-bold text-sm text-white tracking-wider">HARDWARE & SITL COMMUNICATION LINK</span>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold uppercase">
            ACTIVE FLEET: {vehicles.filter((v) => v.isConnected).length} VEHICLES
          </span>
        </div>

        {/* SUB-PANEL SELECTORS */}
        <div className="flex items-center space-x-1 bg-[#050914] p-1 rounded-lg border border-[#1b253b] text-xs">
          {(
            [
              { id: 'CONNECTION', label: 'Connections' },
              { id: 'TELEMETRY', label: 'Live Telemetry' },
              { id: 'PARAMETERS', label: 'Parameters' },
              { id: 'MISSION_UPLOAD', label: 'Mission Upload' },
              { id: 'CAMERA', label: 'RTSP Cameras' },
              { id: 'VEHICLE_STATUS', label: 'Vehicle Status' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. MAIN BODY CONTENT */}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {/* TAB 1: CONNECTION PANEL */}
        {activeTab === 'CONNECTION' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase">AUTOPILOT CONNECTION & AUTO-DISCOVERY</h3>
                <p className="text-xs text-slate-400">Detect PX4 SITL, ArduPilot SITL, and MAVLink physical serial hardware.</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDiscover}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>AUTO-DISCOVER VEHICLES</span>
                </button>
              </div>
            </div>

            {/* MANUAL CONNECT FORM */}
            <form onSubmit={handleManualConnect} className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex items-center space-x-3 text-xs">
              <span className="font-bold text-slate-300">UDP / SERIAL LINK:</span>
              <input
                type="text"
                value={connectionUrlInput}
                onChange={(e) => setConnectionUrlInput(e.target.value)}
                placeholder="e.g. udp://127.0.0.1:14540 or /dev/ttyUSB0:57600"
                className="flex-1 bg-[#040710] border border-slate-800 focus:border-emerald-500 rounded px-3 py-1.5 text-white outline-none"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>CONNECT ENDPOINT</span>
              </button>
            </form>

            {/* VEHICLES GRID */}
            <div className="grid grid-cols-2 gap-4">
              {vehicles.map((v) => (
                <div key={v.systemId} className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold text-sm text-white">SYS_ID: {v.systemId} ({v.autopilot})</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                      {v.connectionType}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-400 border-t border-slate-800/80 pt-2">
                    <div className="flex justify-between"><span>Endpoint:</span><span className="text-slate-200 font-mono">{v.connectionUrl}</span></div>
                    <div className="flex justify-between"><span>Firmware:</span><span className="text-cyan-400">{v.firmwareVersion}</span></div>
                    <div className="flex justify-between"><span>Last Heartbeat:</span><span className="text-slate-300">{new Date(v.lastHeartbeatTime).toLocaleTimeString()}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: TELEMETRY PANEL */}
        {activeTab === 'TELEMETRY' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">LIVE MAVLINK TELEMETRY STREAM</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">GPS POSITION</span>
                <span className="text-sm font-bold text-white block mt-1">{activeDrone.lat.toFixed(5)}° N</span>
                <span className="text-sm font-bold text-white block">{activeDrone.lng.toFixed(5)}° E</span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">ALTITUDE (AGL / MSL)</span>
                <span className="text-2xl font-bold text-cyan-400">{telemetry.altitudeAGL} <span className="text-xs">m</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">ATTITUDE (P / R / Y)</span>
                <span className="text-lg font-bold text-slate-200">{telemetry.pitch.toFixed(1)}° / {telemetry.roll.toFixed(1)}° / {telemetry.yaw.toFixed(1)}°</span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">SATELLITES & RSSI</span>
                <span className="text-2xl font-bold text-emerald-400">{telemetry.satellites} <span className="text-xs">Sats ({activeDrone.signalStrength}%)</span></span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PARAMETER MANAGER */}
        {activeTab === 'PARAMETERS' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase">MAVLINK PARAMETER MANAGER</h3>
                <p className="text-xs text-slate-400">Read, write, search, compare, backup, and restore autopilot parameters.</p>
              </div>

              {/* SEARCH INPUT */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={paramSearch}
                  onChange={(e) => setParamSearch(e.target.value)}
                  placeholder="Search parameter..."
                  className="w-full bg-[#040710] border border-slate-800 focus:border-emerald-500 rounded pl-8 pr-3 py-1 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="bg-[#070d1a] border border-[#1b253b] rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0a1224] border-b border-slate-800 text-slate-400">
                    <th className="p-3">PARAMETER</th>
                    <th className="p-3">VALUE</th>
                    <th className="p-3">DEFAULT</th>
                    <th className="p-3">CATEGORY</th>
                    <th className="p-3">DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParams.map((param) => (
                    <tr key={param.name} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-emerald-400 font-mono">{param.name}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={param.value}
                          onChange={(e) => handleParamChange(param.name, parseFloat(e.target.value) || 0)}
                          className="w-20 bg-[#040710] border border-slate-700 rounded px-2 py-0.5 text-white font-bold text-xs outline-none"
                        />
                      </td>
                      <td className="p-3 text-slate-400">{param.defaultValue}</td>
                      <td className="p-3 text-cyan-400">{param.category}</td>
                      <td className="p-3 text-slate-400">{param.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MISSION UPLOAD */}
        {activeTab === 'MISSION_UPLOAD' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase">MAVLINK MISSION TRANSACTION PROTOCOL</h3>
                <p className="text-xs text-slate-400">Upload waypoints to flight controller with CRC verification.</p>
              </div>

              <button
                onClick={handleUploadMission}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>UPLOAD {waypoints.length} WAYPOINTS</span>
              </button>
            </div>

            {uploadProgress !== null && (
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-xs text-slate-300 font-bold">
                  <span>Uploading Mission Items...</span>
                  <span className="text-emerald-400">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: RTSP CAMERAS */}
        {activeTab === 'CAMERA' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">MULTI-CAMERA RTSP & THERMAL FEED MANAGER</h3>
            <div className="grid grid-cols-3 gap-4">
              {streams.map((stream) => (
                <div key={stream.id} className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-cyan-400">{stream.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">{stream.type}</span>
                  </div>
                  <div className="h-32 bg-[#040710] rounded border border-slate-800 flex items-center justify-center text-xs text-slate-500">
                    [LIVE VIDEO STREAM: {stream.resolution} @ {stream.fps}FPS]
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => {
                        const rec = VideoRecorder.toggleRecording();
                        setIsRecording(rec);
                      }}
                      className={`px-3 py-1 rounded text-xs font-bold ${isRecording ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                    >
                      {isRecording ? 'RECORDING...' : 'START REC'}
                    </button>
                    <button
                      onClick={() => alert(`Snapshot saved: ${VideoRecorder.takeSnapshot()}`)}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold"
                    >
                      SNAPSHOT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: VEHICLE STATUS */}
        {activeTab === 'VEHICLE_STATUS' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">VEHICLE HEALTH & HARDWARE STATUS</h3>
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl grid grid-cols-3 gap-4 text-xs">
              <div><span className="text-slate-400 block font-bold">BATTERY VOLTAGE</span><span className="text-xl font-bold text-emerald-400">{telemetry.batteryVoltage} V</span></div>
              <div><span className="text-slate-400 block font-bold">CURRENT DRAW</span><span className="text-xl font-bold text-white">{telemetry.batteryCurrent} A</span></div>
              <div><span className="text-slate-400 block font-bold">AVIONICS TEMP</span><span className="text-xl font-bold text-amber-400">{telemetry.temperatureAvionics}°C</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
