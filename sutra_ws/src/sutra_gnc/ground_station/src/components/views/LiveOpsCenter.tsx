import React, { useState } from 'react';
import { 
  Activity, 
  Battery, 
  Wifi, 
  Compass, 
  Radio, 
  Gauge, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  Video, 
  Maximize2, 
  Sliders, 
  RotateCcw,
  Layers,
  Cpu,
  Zap,
  Globe
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { useTelemetryStore } from '../../services/telemetryStore';
import type { FlightMode } from '../../services/telemetryService';

export const LiveOpsCenter: React.FC = () => {
  const { currentTelemetry, telemetryHistory, events, connectionStatus, changeFlightMode, triggerRTH } = useTelemetryStore();
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'EVENT_TIMELINE' | 'GRAPHS'>('TELEMETRY');

  const FLIGHT_MODES: FlightMode[] = ['AUTO_MISSION', 'GUIDED', 'LOITER', 'STABILIZE', 'RTL', 'MANUAL'];

  return (
    <div className="flex-1 h-full bg-[#070a11] hud-grid flex flex-col overflow-y-auto p-3 space-y-3 z-10 text-xs font-mono select-none">
      {/* TOP LIVE OPS HEADER BAR */}
      <div className="bg-[#0a0f1c] border border-[#1a2336] p-3 rounded shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="font-bold text-slate-100 uppercase text-xs flex items-center gap-2">
              <span>LIVE OPERATIONS CONTROL CENTER</span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] px-1.5 py-0.5 rounded font-mono">
                {connectionStatus}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">REAL-TIME MAVLINK TELEMETRY & FLIGHT COMMAND MATRIX</div>
          </div>
        </div>

        {/* FLIGHT MODE SELECTOR */}
        <div className="flex items-center space-x-1.5 bg-[#090d16] border border-[#1a2336] p-1 rounded">
          <span className="text-[10px] text-slate-400 px-2 font-bold uppercase">MODE:</span>
          {FLIGHT_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => changeFlightMode(mode)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                currentTelemetry.flightMode === mode
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121927]'
              }`}
            >
              {mode}
            </button>
          ))}
          <button
            onClick={triggerRTH}
            className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 font-bold text-[10px] uppercase ml-1"
          >
            RTH
          </button>
        </div>
      </div>

      {/* CORE TELEMETRY MATRIX GRID */}
      <div className="grid grid-cols-4 gap-3">
        {/* CARD 1: ARTIFICIAL HORIZON & ATTITUDE */}
        <div className="bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col justify-between h-44">
          <div className="flex items-center justify-between text-[10px] border-b border-[#1a2336] pb-1">
            <span className="font-bold text-cyan-400">ATTITUDE (PITCH / ROLL)</span>
            <span className="text-slate-500">GYRO</span>
          </div>

          <div className="relative flex-1 bg-[#050914] my-1 rounded border border-[#1a2336] overflow-hidden flex items-center justify-center">
            <div 
              className="absolute inset-0 transition-transform duration-200 flex flex-col justify-center items-center"
              style={{ transform: `rotate(${currentTelemetry.roll}deg) translateY(${currentTelemetry.pitch * 2}px)` }}
            >
              <div className="w-[160%] h-32 bg-cyan-900/40 border-b-2 border-cyan-400"></div>
              <div className="w-[160%] h-32 bg-amber-950/40"></div>
            </div>
            <div className="absolute z-10 w-16 h-1 border-t-2 border-amber-400 flex items-center justify-between">
              <div className="w-3 h-3 border-l-2 border-b-2 border-amber-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 border-r-2 border-b-2 border-amber-400"></div>
            </div>
          </div>

          <div className="flex justify-between text-[10px] text-slate-300 font-bold pt-1">
            <span>PITCH: <span className="text-cyan-400">{currentTelemetry.pitch}°</span></span>
            <span>ROLL: <span className="text-cyan-400">{currentTelemetry.roll}°</span></span>
            <span>YAW: <span className="text-amber-400">{currentTelemetry.yaw}° NW</span></span>
          </div>
        </div>

        {/* CARD 2: ALTITUDE & SPEED */}
        <div className="bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col justify-between h-44">
          <div className="flex items-center justify-between text-[10px] border-b border-[#1a2336] pb-1">
            <span className="font-bold text-emerald-400">ALTITUDE & SPEED</span>
            <span className="text-slate-500">AIR DATA</span>
          </div>

          <div className="space-y-2 my-auto text-[11px]">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Altitude (AGL):</span>
              <span className="text-cyan-400 font-bold text-base">{currentTelemetry.altitudeAGL} m</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Altitude (MSL):</span>
              <span className="text-slate-300 font-bold">{currentTelemetry.altitudeMSL} m</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Groundspeed:</span>
              <span className="text-emerald-400 font-bold text-base">{currentTelemetry.groundSpeed} km/h</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Climb Rate:</span>
              <span className="text-amber-400 font-bold">+{currentTelemetry.climbRate} m/s</span>
            </div>
          </div>
        </div>

        {/* CARD 3: BATTERY & POWER HARNESS */}
        <div className="bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col justify-between h-44">
          <div className="flex items-center justify-between text-[10px] border-b border-[#1a2336] pb-1">
            <span className="font-bold text-amber-400">POWER HARNESS</span>
            <span className="text-slate-500">6S LIPO</span>
          </div>

          <div className="space-y-1.5 my-auto text-[11px]">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Battery Level:</span>
              <span className="text-emerald-400 font-bold text-base">{currentTelemetry.batteryRemaining}%</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Total Voltage:</span>
              <span className="text-amber-400 font-bold">{currentTelemetry.batteryVoltage} V</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Current Draw:</span>
              <span className="text-cyan-400 font-bold">{currentTelemetry.batteryCurrent} A</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Power Consumption:</span>
              <span className="text-rose-400 font-bold">{currentTelemetry.powerWatts} W</span>
            </div>
          </div>
        </div>

        {/* CARD 4: GPS & LINK QUALITY */}
        <div className="bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col justify-between h-44">
          <div className="flex items-center justify-between text-[10px] border-b border-[#1a2336] pb-1">
            <span className="font-bold text-cyan-400">COMMUNICATION & GPS</span>
            <span className="text-slate-500">LINK</span>
          </div>

          <div className="space-y-2 my-auto text-[11px]">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">GPS Satellites:</span>
              <span className="text-emerald-400 font-bold text-base">{currentTelemetry.satellites} SVs</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">RTK Fix Mode:</span>
              <span className="text-cyan-400 font-bold">DUAL-FREQ FIX</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">SatCom Latency:</span>
              <span className="text-amber-400 font-bold">{currentTelemetry.linkLatencyMs} ms</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Encryption:</span>
              <span className="text-emerald-400 font-bold">AES-256</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS FOR HISTORICAL DATA, GRAPHS & EVENT TIMELINE */}
      <div className="bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex-1 flex flex-col">
        <div className="flex items-center justify-between border-b border-[#1a2336] pb-2 mb-2">
          <div className="flex space-x-2">
            {(['TELEMETRY', 'GRAPHS', 'EVENT_TIMELINE'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                  activeTab === tab
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
          <span className="text-slate-500 text-[10px]">TOTAL SAMPLES LOGGED: {telemetryHistory.length}</span>
        </div>

        {/* TAB 1: TELEMETRY HISTORY TABLE */}
        {activeTab === 'TELEMETRY' && (
          <div className="flex-1 overflow-y-auto max-h-64">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-[#1a2336] text-slate-400 bg-[#080c14]">
                  <th className="p-1.5">TIME</th>
                  <th className="p-1.5">MODE</th>
                  <th className="p-1.5">ALT (AGL)</th>
                  <th className="p-1.5">SPEED</th>
                  <th className="p-1.5">PITCH/ROLL</th>
                  <th className="p-1.5">VOLTAGE</th>
                  <th className="p-1.5">CURRENT</th>
                  <th className="p-1.5">POWER (W)</th>
                  <th className="p-1.5">LATENCY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2336]/40">
                {telemetryHistory.slice(-15).reverse().map((pkt, idx) => (
                  <tr key={idx} className="hover:bg-[#0e1624]">
                    <td className="p-1.5 text-cyan-400">{pkt.timeFormatted}</td>
                    <td className="p-1.5 text-emerald-400 font-bold">{pkt.flightMode}</td>
                    <td className="p-1.5 text-slate-200">{pkt.altitudeAGL} m</td>
                    <td className="p-1.5 text-emerald-300">{pkt.groundSpeed} km/h</td>
                    <td className="p-1.5 text-slate-300">{pkt.pitch}° / {pkt.roll}°</td>
                    <td className="p-1.5 text-amber-400">{pkt.batteryVoltage} V</td>
                    <td className="p-1.5 text-cyan-300">{pkt.batteryCurrent} A</td>
                    <td className="p-1.5 text-rose-400">{pkt.powerWatts} W</td>
                    <td className="p-1.5 text-slate-400">{pkt.linkLatencyMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: LIVE TELEMETRY GRAPHS */}
        {activeTab === 'GRAPHS' && (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryHistory}>
                <defs>
                  <linearGradient id="liveAltGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="timeFormatted" stroke="#475569" fontSize={9} />
                <YAxis stroke="#475569" fontSize={9} />
                <Tooltip contentStyle={{ background: '#090e18', borderColor: '#1a2336', fontSize: '10px' }} />
                <Area type="monotone" dataKey="altitudeAGL" stroke="#00f0ff" fill="url(#liveAltGrad)" name="Altitude AGL (m)" />
                <Area type="monotone" dataKey="groundSpeed" stroke="#00e676" fillOpacity={0.1} name="Groundspeed (km/h)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* TAB 3: EVENT TIMELINE */}
        {activeTab === 'EVENT_TIMELINE' && (
          <div className="flex-1 overflow-y-auto space-y-2 p-1">
            {events.map((evt) => (
              <div 
                key={evt.id} 
                className="p-2 rounded border border-[#1a2336] bg-[#080d16] flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-cyan-400 font-bold">{evt.timestamp}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                    evt.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                    evt.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {evt.type}
                  </span>
                  <span className="text-slate-200">{evt.message}</span>
                </div>
                <span className="text-slate-500 text-[10px]">{evt.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
