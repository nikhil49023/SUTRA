import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Cpu, 
  TrendingUp
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import type { TelemetryData, Waypoint } from '../../types';

interface BottomPanelProps {
  telemetry: TelemetryData;
  waypoints: Waypoint[];
}

const MOCK_GRAPH_DATA = [
  { time: '11:20', alt: 200, speed: 30 },
  { time: '11:25', alt: 350, speed: 45 },
  { time: '11:30', alt: 420, speed: 52 },
  { time: '11:35', alt: 450, speed: 54 },
  { time: '11:40', alt: 450, speed: 50 },
  { time: '11:42', alt: 450, speed: 54 },
];

export const BottomPanel: React.FC<BottomPanelProps> = ({ telemetry, waypoints }) => {
  return (
    <footer className="h-44 bg-[#080c14] border-t border-[#1a2336] px-3 py-2 flex items-center justify-between z-20 shrink-0 select-none text-xs font-mono">
      {/* SECTION A: ARTIFICIAL HORIZON / PFD INSTRUMENT */}
      <div className="w-52 h-full bg-[#0a0f1c] border border-[#1a2336] rounded p-2 flex flex-col justify-between shrink-0">
        <div className="flex items-center justify-between text-[10px] border-b border-[#1a2336] pb-1">
          <span className="font-bold text-cyan-400">PRIMARY FLIGHT DISPLAY</span>
          <span className="text-slate-500">PFD</span>
        </div>

        {/* Dynamic Horizon Canvas Box */}
        <div className="relative flex-1 bg-[#050914] my-1 rounded border border-[#1a2336] overflow-hidden flex items-center justify-center">
          {/* Dynamic Rotating Pitch/Roll Horizon Lines */}
          <div 
            className="absolute inset-0 transition-transform duration-300 flex flex-col justify-center items-center"
            style={{ transform: `rotate(${telemetry.roll}deg) translateY(${telemetry.pitch * 2}px)` }}
          >
            {/* Sky */}
            <div className="w-[160%] h-32 bg-cyan-900/40 border-b-2 border-cyan-400"></div>
            {/* Ground */}
            <div className="w-[160%] h-32 bg-amber-950/40"></div>
          </div>

          {/* Fixed Aircraft Reference Reticle */}
          <div className="absolute z-10 w-16 h-1 border-t-2 border-amber-400 flex items-center justify-between">
            <div className="w-3 h-3 border-l-2 border-b-2 border-amber-400"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
            <div className="w-3 h-3 border-r-2 border-b-2 border-amber-400"></div>
          </div>

          {/* Compass Ribbon Readout */}
          <div className="absolute top-1 text-[9px] bg-black/70 px-1.5 py-0.5 rounded text-cyan-300 font-bold border border-cyan-500/30">
            HDG {telemetry.yaw}° NW
          </div>
        </div>
      </div>

      {/* SECTION B: MISSION TIMELINE & WAYPOINT STEPPER */}
      <div className="flex-1 h-full mx-3 bg-[#0a0f1c] border border-[#1a2336] rounded p-2 flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between text-[10px] border-b border-[#1a2336] pb-1">
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-slate-200 uppercase">MISSION TIMELINE & PROGRESS (62%)</span>
          </div>
          <span className="text-emerald-400 font-bold">NEXT: WAYPOINT 5 (1.4 km)</span>
        </div>

        {/* Waypoint Stepper Bar */}
        <div className="flex items-center justify-between py-2 px-3 relative">
          <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-[#1e293b] -translate-y-1/2 z-0"></div>
          {waypoints.map((wp) => (
            <div key={wp.id} className="relative z-10 flex flex-col items-center group cursor-pointer">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-bold transition-all ${
                wp.completed
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-[#101726] border-[#1e293b] text-slate-500 group-hover:border-cyan-400'
              }`}>
                {wp.completed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : wp.id}
              </div>
              <span className="text-[8px] text-slate-400 mt-1 uppercase font-mono">{wp.action}</span>
            </div>
          ))}
        </div>

        {/* Mission Progress Bar */}
        <div className="w-full bg-[#101726] h-2 rounded-full border border-[#1e293b] overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full w-[62%] rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* SECTION C: LIVE TELEMETRY GRAPHS */}
      <div className="w-72 h-full bg-[#0a0f1c] border border-[#1a2336] rounded p-2 flex flex-col justify-between shrink-0">
        <div className="flex items-center justify-between text-[10px] border-b border-[#1a2336] pb-1">
          <div className="flex items-center space-x-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-slate-200">ALTITUDE PROFILE (AGL)</span>
          </div>
          <span className="text-cyan-400 font-bold">450m</span>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-24 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_GRAPH_DATA}>
              <defs>
                <linearGradient id="altGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#475569" fontSize={8} tickLine={false} />
              <YAxis stroke="#475569" fontSize={8} domain={[0, 600]} tickLine={false} />
              <Tooltip contentStyle={{ background: '#090e18', borderColor: '#1a2336', fontSize: '10px' }} />
              <Area type="monotone" dataKey="alt" stroke="#00f0ff" fillOpacity={1} fill="url(#altGrad)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION D: SYSTEM HEALTH & DIAGNOSTICS */}
      <div className="w-64 h-full bg-[#0a0f1c] border border-[#1a2336] rounded p-2 flex flex-col justify-between shrink-0">
        <div className="flex items-center justify-between text-[10px] border-b border-[#1a2336] pb-1">
          <div className="flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-slate-200">SYSTEM HEALTH</span>
          </div>
          <span className="text-emerald-400 font-bold">NOMINAL</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="bg-[#0f172a] p-1.5 rounded border border-[#1e293b]">
            <span className="text-slate-500 block text-[8px]">AVIONICS TEMP</span>
            <span className="text-emerald-400 font-bold">{telemetry.temperatureAvionics}°C</span>
          </div>
          <div className="bg-[#0f172a] p-1.5 rounded border border-[#1e293b]">
            <span className="text-slate-500 block text-[8px]">ESC TEMP</span>
            <span className="text-amber-400 font-bold">{telemetry.temperatureESC}°C</span>
          </div>
          <div className="bg-[#0f172a] p-1.5 rounded border border-[#1e293b]">
            <span className="text-slate-500 block text-[8px]">LINK LATENCY</span>
            <span className="text-cyan-400 font-bold">{telemetry.linkLatencyMs} ms</span>
          </div>
          <div className="bg-[#0f172a] p-1.5 rounded border border-[#1e293b]">
            <span className="text-slate-500 block text-[8px]">SAT CONSTELLATION</span>
            <span className="text-emerald-400 font-bold">{telemetry.satellites} SVs</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
