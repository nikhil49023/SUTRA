import React from 'react';
import { 
  ShieldCheck, 
  Wifi, 
  Satellite, 
  Radio, 
  CloudSun, 
  Wind, 
  UserCheck, 
  Lock, 
  Compass
} from 'lucide-react';
import type { DroneAsset } from '../../types';

interface TopNavbarProps {
  activeDrone: DroneAsset;
  systemStatus: 'NOMINAL' | 'WARNING' | 'ALERT';
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ activeDrone }) => {
  return (
    <header className="h-13 bg-[#0a0e17] border-b border-[#1a2336] px-4 flex items-center justify-between text-xs select-none shrink-0 z-30 shadow-md">
      {/* Branding & Mission Info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 border-r border-[#1a2336] pr-4">
          <div className="w-7 h-7 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="font-bold tracking-wider text-slate-100 uppercase text-[11px] flex items-center gap-1.5">
              <span>SMART HORIZON GCS</span>
              <span className="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded text-[9px] font-mono border border-cyan-500/30">v4.8-MIL</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">TACTICAL DRONE CONTROL SYSTEM</div>
          </div>
        </div>

        {/* Mission Details Badge */}
        <div className="hidden xl:flex items-center space-x-3 bg-[#111726] border border-[#1e293b] px-3 py-1 rounded">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-mono">Mission Code</span>
            <span className="font-mono text-cyan-400 font-semibold">{activeDrone.mission}</span>
          </div>
          <div className="h-5 w-px bg-[#1e293b]"></div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-mono">Target Sector</span>
            <span className="font-mono text-slate-200">SECTOR 4-B / GRID 84A</span>
          </div>
          <div className="h-5 w-px bg-[#1e293b]"></div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-mono">Waypoints</span>
            <span className="font-mono text-emerald-400 font-semibold">14 / 24 COMPLETED</span>
          </div>
        </div>
      </div>

      {/* Connectivity & SatCom Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3 bg-[#0d1320] border border-[#1a2336] px-2.5 py-1 rounded">
          <div className="flex items-center space-x-1.5" title="Telemetry Signal">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400">TELEMETRY</span>
              <span className="font-mono text-emerald-400 font-bold">{activeDrone.signalStrength}%</span>
            </div>
          </div>
          <div className="h-5 w-px bg-[#1e293b]"></div>
          <div className="flex items-center space-x-1.5" title="SatCom Link">
            <Satellite className="w-3.5 h-3.5 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400">SATCOM LINK</span>
              <span className="font-mono text-cyan-400 font-bold">14 ms</span>
            </div>
          </div>
          <div className="h-5 w-px bg-[#1e293b]"></div>
          <div className="flex items-center space-x-1.5" title="RTK GPS Satellites">
            <Wifi className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400">RTK DUAL FIX</span>
              <span className="font-mono text-amber-400 font-bold">{activeDrone.satellites} SVs</span>
            </div>
          </div>
        </div>

        {/* Tactical Weather Header */}
        <div className="hidden lg:flex items-center space-x-3 bg-[#0d1320] border border-[#1a2336] px-2.5 py-1 rounded">
          <div className="flex items-center space-x-1.5">
            <CloudSun className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-mono text-slate-200 font-semibold">24°C</span>
          </div>
          <div className="h-5 w-px bg-[#1e293b]"></div>
          <div className="flex items-center space-x-1.5">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-cyan-300 font-semibold">12 kts NW</span>
          </div>
          <div className="h-5 w-px bg-[#1e293b]"></div>
          <div className="flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-slate-300">QNH 1013</span>
          </div>
        </div>

        {/* Security & Operator Info */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-1 rounded">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span className="font-mono text-[10px] font-bold tracking-wider">AES-256 ACTIVE</span>
          </div>

          <div className="flex items-center space-x-2 border-l border-[#1a2336] pl-3">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="font-semibold text-slate-200 text-[11px]">CAPT. VANCE</span>
              <span className="text-[9px] text-cyan-400 font-mono">LEVEL 4 OPERATOR</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
