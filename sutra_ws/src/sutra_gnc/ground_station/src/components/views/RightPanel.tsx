import React, { useState } from 'react';
import { 
  Video, 
  Camera, 
  Circle, 
  Gauge, 
  AlertTriangle, 
  ShieldCheck, 
  Volume2, 
  VolumeX
} from 'lucide-react';
import type { DroneAsset, TelemetryData, OperationalAlert } from '../../types';

interface RightPanelProps {
  activeDrone: DroneAsset;
  telemetry: TelemetryData;
  alerts: OperationalAlert[];
  onAcknowledgeAlert: (id: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  activeDrone,
  telemetry,
  alerts,
  onAcknowledgeAlert
}) => {
  const [cameraMode, setCameraMode] = useState<'EO_OPTICAL' | 'IR_THERMAL' | 'NIGHT_VISION'>('IR_THERMAL');
  const [showAIBboxes, setShowAIBboxes] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mutedAlerts, setMutedAlerts] = useState(false);

  return (
    <div className="w-[420px] bg-[#090d15] border-l border-[#1a2336] h-full flex flex-col z-20 shrink-0 select-none overflow-y-auto">
      {/* SECTION 1: LARGE LIVE CAMERA FEED */}
      <div className="p-3 border-b border-[#1a2336] bg-[#070a11] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Video className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">LIVE FEED — {activeDrone.callsign}</h3>
          </div>
          <div className="flex items-center space-x-1.5 font-mono text-[10px]">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-rose-400 font-bold">1080P HD 60FPS</span>
          </div>
        </div>

        {/* Camera Viewport Canvas Simulation */}
        <div className="relative w-full h-52 bg-[#05080f] rounded border border-[#1a2336] overflow-hidden scanline-effect group">
          {/* Simulated Sensor Visual Overlay */}
          <div className={`absolute inset-0 transition-colors duration-300 ${
            cameraMode === 'IR_THERMAL' 
              ? 'bg-gradient-to-tr from-[#001133] via-[#004466] to-[#00f0ff]/30' 
              : cameraMode === 'NIGHT_VISION'
              ? 'bg-gradient-to-tr from-[#001a00] via-[#004d00] to-[#00ff00]/20'
              : 'bg-gradient-to-tr from-[#0b1322] via-[#162238] to-[#25395a]'
          }`}>
            {/* Grid Reticle Overlay */}
            <svg className="w-full h-full absolute inset-0 pointer-events-none opacity-40">
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#00f0ff" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#00f0ff" strokeWidth="0.5" strokeDasharray="4,4" />
              <circle cx="50%" cy="50%" r="35" fill="none" stroke="#00f0ff" strokeWidth="1" />
              <circle cx="50%" cy="50%" r="4" fill="#00f0ff" />
            </svg>

            {/* AI Target Bounding Boxes */}
            {showAIBboxes && (
              <div className="absolute top-12 left-20 border-2 border-amber-400 rounded-sm p-1 animate-pulse">
                <span className="bg-amber-400 text-black text-[8px] font-mono font-bold px-1 py-0.5 uppercase block">
                  CONVOY TARGET 96.4%
                </span>
                <div className="w-16 h-12 border stroke-dasharray"></div>
              </div>
            )}
          </div>

          {/* Top Camera Controls Overlay */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono">
            <div className="flex space-x-1">
              {(['EO_OPTICAL', 'IR_THERMAL', 'NIGHT_VISION'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setCameraMode(mode)}
                  className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                    cameraMode === mode
                      ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 font-bold'
                      : 'bg-black/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAIBboxes(!showAIBboxes)}
              className={`px-1.5 py-0.5 rounded text-[9px] ${
                showAIBboxes ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' : 'bg-black/60 text-slate-400'
              }`}
            >
              AI BBOX
            </button>
          </div>

          {/* Bottom Camera Action Bar */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono">
            <div className="flex space-x-1">
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[9px] font-bold ${
                  isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-black/60 text-slate-300 hover:bg-black/80'
                }`}
              >
                <Circle className="w-2.5 h-2.5 fill-current" />
                <span>{isRecording ? 'REC 00:04:12' : 'REC'}</span>
              </button>

              <button className="flex items-center space-x-1 px-2 py-0.5 rounded bg-black/60 text-slate-300 hover:bg-black/80 text-[9px]">
                <Camera className="w-3 h-3" />
                <span>SNAP</span>
              </button>
            </div>

            {/* Gimbal Position readout */}
            <div className="bg-black/70 text-cyan-400 px-2 py-0.5 rounded text-[9px] font-mono border border-cyan-500/30">
              GIMBAL P:-45° Y:12°
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: TELEMETRY GRID */}
      <div className="p-3 border-b border-[#1a2336] bg-[#090d15] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">TELEMETRY MATRIX</h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">SYNCED (100Hz)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-[#0c121e] border border-[#1a2336] p-2 rounded">
            <span className="text-[9px] text-slate-400 block">ALTITUDE (AGL / MSL)</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-cyan-400 font-bold text-sm">{telemetry.altitudeAGL} m</span>
              <span className="text-slate-500 text-[10px]">/ {telemetry.altitudeMSL} m</span>
            </div>
          </div>

          <div className="bg-[#0c121e] border border-[#1a2336] p-2 rounded">
            <span className="text-[9px] text-slate-400 block">SPEED (GND / AIR)</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-emerald-400 font-bold text-sm">{telemetry.groundSpeed} km/h</span>
              <span className="text-slate-500 text-[10px]">/ {telemetry.airSpeed} km/h</span>
            </div>
          </div>

          <div className="bg-[#0c121e] border border-[#1a2336] p-2 rounded">
            <span className="text-[9px] text-slate-400 block">BATTERY VOLTAGE</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-amber-400 font-bold text-sm">{telemetry.batteryVoltage} V</span>
              <span className="text-slate-500 text-[10px]">({telemetry.batteryCurrent}A)</span>
            </div>
          </div>

          <div className="bg-[#0c121e] border border-[#1a2336] p-2 rounded">
            <span className="text-[9px] text-slate-400 block">MOTOR RPM AVERAGE</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-slate-200 font-bold text-sm">4,248 RPM</span>
              <span className="text-emerald-400 text-[10px]">BALANCED</span>
            </div>
          </div>
        </div>

        {/* Battery Cell Voltages Bar */}
        <div className="bg-[#0c121e] border border-[#1a2336] p-2 rounded text-[10px] font-mono space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>6S LIPO CELL BALANCE</span>
            <span className="text-emerald-400 font-bold">4.07V AVG</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {telemetry.cellVoltages.map((v, i) => (
              <div key={i} className="bg-[#121a2a] p-1 rounded text-center border border-[#1e293b]">
                <span className="text-slate-500 text-[8px] block">C{i+1}</span>
                <span className="text-cyan-300 font-bold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: ALERTS */}
      <div className="p-3 border-b border-[#1a2336] bg-[#090d15] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">OPERATIONAL ALERTS ({alerts.length})</h3>
          </div>
          <button 
            onClick={() => setMutedAlerts(!mutedAlerts)}
            className="text-slate-400 hover:text-slate-200"
          >
            {mutedAlerts ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
        </div>

        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {alerts.map((alert) => (
            <div 
              key={alert.id}
              className={`p-2 rounded border text-xs font-mono transition-colors ${
                alert.severity === 'CRITICAL'
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  : alert.severity === 'WARNING'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold uppercase text-[10px]">{alert.title}</span>
                <span className="text-[9px] opacity-75">{alert.timestamp}</span>
              </div>
              <p className="text-[10px] text-slate-300 mb-1">{alert.message}</p>
              
              {!alert.acknowledged && (
                <button
                  onClick={() => onAcknowledgeAlert(alert.id)}
                  className="mt-1 w-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 py-0.5 rounded text-[9px] uppercase font-bold"
                >
                  ACKNOWLEDGE
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: MISSION SUMMARY */}
      <div className="p-3 bg-[#070a11] space-y-2 flex-1">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">MISSION SUMMARY</h3>
        </div>

        <div className="space-y-1.5 text-xs font-mono bg-[#0c121e] border border-[#1a2336] p-2.5 rounded">
          <div className="flex justify-between">
            <span className="text-slate-400">Active Duration:</span>
            <span className="text-cyan-400 font-bold">{activeDrone.flightTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Distance Traveled:</span>
            <span className="text-slate-200 font-bold">14.2 km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Payload Status:</span>
            <span className="text-emerald-400 font-bold">{activeDrone.payload}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Return to Launch ETA:</span>
            <span className="text-amber-400 font-bold">00:18:45</span>
          </div>
        </div>
      </div>
    </div>
  );
};
