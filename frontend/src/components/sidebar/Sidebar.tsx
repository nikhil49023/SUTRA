import React from 'react';
import { useAppStore } from '../../stores/appStore';
import { NavigationSection } from '../../types/app';
import {
  Compass,
  Route,
  Mountain,
  Users,
  Brain,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS: { id: NavigationSection; label: string; icon: any }[] = [
  { id: 'COMMAND', label: 'COMMAND', icon: Compass },
  { id: 'MISSION', label: 'MISSION', icon: Route },
  { id: 'GIS', label: 'GIS INTELLIGENCE', icon: Mountain },
  { id: 'FLEET', label: 'SWARM FLEET', icon: Users },
  { id: 'AI', label: 'AI ADVISOR', icon: Brain },
  { id: 'LIVEOPS', label: 'LIVE OPS', icon: Activity },
  { id: 'SETTINGS', label: 'SETTINGS', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection, isSidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      className={`h-full bg-[#090d14] border-r border-slate-800/90 flex flex-col justify-between transition-all duration-200 z-30 select-none ${
        isSidebarCollapsed ? 'w-14' : 'w-48'
      }`}
    >
      {/* Top Nav Buttons */}
      <div className="p-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg font-mono text-xs font-bold transition ${
                isActive
                  ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
              title={item.label}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              {!isSidebarCollapsed && <span className="truncate tracking-wide">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-slate-800/80">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded hover:bg-slate-900 text-slate-400 hover:text-cyan-300 transition"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
