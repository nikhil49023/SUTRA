import React from 'react';
import { 
  ShieldAlert, 
  Radio, 
  Wifi, 
  CloudSun, 
  User, 
  Activity, 
  Bell, 
  Search,
  Sparkles
} from 'lucide-react';

import { AuthService } from '../../security';

interface TopBarProps {
  missionName?: string;
  missionStatus?: string;
  connectedDroneCount?: number;
  onTriggerEmergency?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  missionName = 'TACTICAL_RECON_ALPHA',
  missionStatus = 'STANDBY',
  connectedDroneCount = 3,
  onTriggerEmergency
}) => {
  const session = AuthService.getSession();

  return (
    <header className="h-12 bg-[#080d1a] border-b border-[#1b253b] px-4 flex items-center justify-between shrink-0 select-none z-30 font-mono">
      {/* LEFT BRAND & MISSION IDENTITY */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <span className="font-bold text-sm text-white tracking-widest uppercase">SMART HORIZON GCS</span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-cyan-400">{missionName}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
            {missionStatus}
          </span>
        </div>
      </div>

      {/* CENTER STATUS BAR METRICS */}
      <div className="flex items-center space-x-6 text-xs">
        <div className="flex items-center space-x-1.5 text-slate-300">
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>FLEET: <strong className="text-white">{connectedDroneCount} UAVs</strong></span>
        </div>

        <div className="flex items-center space-x-1.5 text-slate-300">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>GPS: <strong className="text-emerald-400">3D FIX (18 Sats)</strong></span>
        </div>

        <div className="flex items-center space-x-1.5 text-slate-300">
          <CloudSun className="w-3.5 h-3.5 text-amber-400" />
          <span>WX: <strong className="text-white">CLEAR 12 kts</strong></span>
        </div>

        <div className="flex items-center space-x-1.5 text-slate-300">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span>SYS: <strong className="text-emerald-400">OPTIMAL 60 FPS</strong></span>
        </div>
      </div>

      {/* RIGHT OPERATOR & EMERGENCY CONTROLS */}
      <div className="flex items-center space-x-3 text-xs">
        <div className="flex items-center space-x-2 bg-[#040710] border border-slate-800 px-2.5 py-1 rounded">
          <User className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-200 font-bold">{session?.username || 'COMMANDER'}</span>
          <span className="text-[10px] text-slate-400">({session?.role || 'ADMIN'})</span>
        </div>

        <button
          onClick={onTriggerEmergency}
          className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold flex items-center space-x-1.5 shadow-lg shadow-red-600/30 text-xs animate-pulse"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>EMERGENCY RTL</span>
        </button>
      </div>
    </header>
  );
};
