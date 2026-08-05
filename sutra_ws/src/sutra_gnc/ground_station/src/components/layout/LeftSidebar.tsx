import React from 'react';
import { 
  LayoutDashboard, 
  Plane, 
  Crosshair, 
  Map, 
  Cpu,
  Globe, 
  BarChart3, 
  Settings,
  Shield
} from 'lucide-react';

export type NavTab = 
  | 'DASHBOARD' 
  | 'FLEET' 
  | 'LIVE_OPERATIONS' 
  | 'MISSION_PLANNER' 
  | 'AI_INTELLIGENCE' 
  | 'GIS_INTEL'
  | 'ANALYTICS' 
  | 'SETTINGS';

interface LeftSidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  fleetCount: number;
  alertCount: number;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  fleetCount,
  alertCount
}) => {
  const navItems = [
    { id: 'DASHBOARD' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'FLEET' as NavTab, label: 'Fleet Grid', icon: Plane, badge: fleetCount },
    { id: 'LIVE_OPERATIONS' as NavTab, label: 'Live Ops', icon: Crosshair, activePulse: true },
    { id: 'MISSION_PLANNER' as NavTab, label: 'Mission Plan', icon: Map },
    { id: 'AI_INTELLIGENCE' as NavTab, label: 'AI Ops', icon: Cpu, badgeAlert: alertCount },
    { id: 'GIS_INTEL' as NavTab, label: 'GIS Intel', icon: Globe },
    { id: 'ANALYTICS' as NavTab, label: 'Analytics', icon: BarChart3 },
    { id: 'SETTINGS' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-16 hover:w-56 transition-all duration-300 bg-[#090d15] border-r border-[#1a2336] flex flex-col justify-between z-20 shrink-0 select-none group">
      {/* Top Navigation Menu */}
      <div className="py-3 flex flex-col space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex items-center h-11 px-4 w-full text-left transition-colors duration-150 ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 font-semibold border-r-2 border-cyan-400'
                  : 'text-slate-400 hover:bg-[#121927] hover:text-slate-200'
              }`}
            >
              <div className="relative flex items-center justify-center min-w-8">
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {item.activePulse && (
                  <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                )}
              </div>

              <span className="ml-3 font-medium text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {item.label}
              </span>

              {/* Badges */}
              {item.badge !== undefined && (
                <span className="ml-auto opacity-0 group-hover:opacity-100 bg-[#162032] border border-cyan-500/30 text-cyan-400 font-mono text-[10px] px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
              {item.badgeAlert !== undefined && item.badgeAlert > 0 && (
                <span className="ml-auto opacity-0 group-hover:opacity-100 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] px-1.5 py-0.5 rounded">
                  {item.badgeAlert}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Footer Operational Status */}
      <div className="p-3 border-t border-[#1a2336] bg-[#070a10]">
        <div className="flex items-center space-x-3 text-slate-400">
          <Shield className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-200 overflow-hidden">
            <span className="text-[10px] font-mono text-slate-300">GEOFENCE GRID</span>
            <span className="text-[9px] font-mono text-emerald-400">ACTIVE & SECURED</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
