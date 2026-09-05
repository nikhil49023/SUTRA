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
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  LifeBuoy,
  Video,
  Grid,
} from 'lucide-react';

import { useGeofenceNotificationStore } from '../../geofence/GeofenceNotificationStore';

const NAV_ITEMS: { id: NavigationSection; label: string; shortcut: string; icon: any }[] = [
  { id: 'COMMAND', label: 'COMMAND', shortcut: 'ESC', icon: Compass },
  { id: 'MAPPING', label: '2D MAPPING', shortcut: '2', icon: Grid },
  { id: 'MISSION', label: 'MISSION', shortcut: 'M', icon: Route },
  { id: 'CAMERA', label: 'LIVE CAMERA', shortcut: 'C', icon: Video },
  { id: 'GEOFENCE', label: 'GEOFENCES', shortcut: 'G', icon: Shield },
  { id: 'GIS', label: 'GIS INTEL', shortcut: 'I', icon: Mountain },
  { id: 'FLEET', label: 'SWARM FLEET', shortcut: 'F', icon: Users },
  { id: 'AI', label: 'AI ADVISOR', shortcut: 'A', icon: Brain },
  { id: 'DISASTER_INTEL', label: 'DISASTER INTEL', shortcut: 'D', icon: ShieldAlert },
  { id: 'LIVEOPS', label: 'LIVE OPS', shortcut: 'L', icon: Activity },
  { id: 'SETTINGS', label: 'SETTINGS', shortcut: 'S', icon: Settings },
];

export const Sidebar: React.FC = memo(() => {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const isSidebarCollapsed = useAppStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  const activeRedZoneCount = useGeofenceNotificationStore((s) =>
    s.notifications.filter((n) => n.severity === 'CRITICAL_RED_ZONE' && !n.acknowledged).length
  );

  return (
    <aside
      className={`h-full bg-[#0B0F14] border-r border-[#2B3743] flex flex-col justify-between transition-all duration-200 z-30 select-none flex-shrink-0 ${
        isSidebarCollapsed ? 'w-14' : 'w-48'
      }`}
    >
      {/* Top Nav Buttons */}
      <div className="p-2 space-y-1">
        <div className="px-2 py-1 text-[10px] text-[#707C88] font-mono font-bold tracking-wider uppercase">
          {!isSidebarCollapsed ? 'Navigation' : 'NAV'}
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const isGeofenceBreached = item.id === 'GEOFENCE' && activeRedZoneCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md font-mono text-xs font-bold transition group ${
                isGeofenceBreached
                  ? 'bg-[#1C0F13] border-l-2 border-l-[#EF4444] border border-[#EF4444] text-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                  : isActive
                  ? 'bg-[#1B2530] border-l-2 border-l-[#5B8FB9] border border-[#2B3743] text-[#E7EBEF] shadow-[0_0_12px_rgba(91,143,185,0.15)]'
                  : 'text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] border border-transparent'
              }`}
              title={`${item.label} (${item.shortcut})`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Icon className={`w-4 h-4 flex-shrink-0 transition ${
                  isGeofenceBreached ? 'text-[#EF4444] animate-bounce' : isActive ? 'text-[#5B8FB9]' : 'text-[#707C88] group-hover:text-[#A9B3BD]'
                }`} />
                {!isSidebarCollapsed && (
                  <span className="truncate tracking-wide text-[11px] flex items-center space-x-1">
                    <span>{item.label}</span>
                    {isGeofenceBreached && (
                      <span className="px-1 py-0.2 rounded-full bg-[#EF4444] text-white text-[8px] font-extrabold ml-1">
                        {activeRedZoneCount}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {!isSidebarCollapsed && (
                <kbd className={`px-1 py-0.2 rounded text-[9px] font-mono border transition ${
                  isGeofenceBreached
                    ? 'bg-[#1C0F13] border-[#EF4444] text-[#EF4444]'
                    : isActive
                    ? 'bg-[#11171E] border-[#5B8FB9]/40 text-[#5B8FB9]'
                    : 'bg-[#11171E] border-[#2B3743] text-[#707C88]'
                }`}>
                  {item.shortcut}
                </kbd>
              )}
            </button>
          );
        })}
      </div>



      {/* Footer / Collapse Toggle */}
      <div className="p-2 border-t border-[#2B3743] space-y-1.5 bg-[#0B0F14]">
        {!isSidebarCollapsed && (
          <div className="px-2 py-1 rounded bg-[#11171E] border border-[#2B3743] flex items-center justify-between text-[10px] font-mono text-[#707C88]">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F9A72]" />
              <span className="text-[#4F9A72] font-bold">ONLINE</span>
            </span>
            <span className="text-[9px] text-[#707C88]">v2.1</span>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded hover:bg-[#151D26] text-[#707C88] hover:text-[#E7EBEF] transition border border-transparent hover:border-[#2B3743]"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
});
