import React, { memo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { NavigationSection } from '../../types/app';
import {
  Compass,
  Route,
  Shield,
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
  { id: 'GEOFENCE', label: 'GEOFENCES', icon: Shield },
  { id: 'GIS', label: 'GIS INTELLIGENCE', icon: Mountain },
  { id: 'FLEET', label: 'SWARM FLEET', icon: Users },
  { id: 'AI', label: 'AI ADVISOR', icon: Brain },
  { id: 'LIVEOPS', label: 'LIVE OPS', icon: Activity },
  { id: 'SETTINGS', label: 'SETTINGS', icon: Settings },
];

export const Sidebar: React.FC = memo(() => {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const isSidebarCollapsed = useAppStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  return (
    <aside
      className={`h-full bg-[#0B0F14] border-r border-[#2B3743] flex flex-col justify-between transition-all duration-200 z-30 select-none ${
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
                  ? 'bg-[#1B2530] border border-[#5B8FB9] text-[#E7EBEF] shadow-[0_0_12px_rgba(91,143,185,0.15)]'
                  : 'text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26]'
              }`}
              title={item.label}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#5B8FB9]' : 'text-[#707C88]'}`} />
              {!isSidebarCollapsed && <span className="truncate tracking-wide">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-[#2B3743]">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded hover:bg-[#151D26] text-[#707C88] hover:text-[#E7EBEF] transition"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
});
