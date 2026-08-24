/**
 * Smart Horizon GCS — Floating Map Interaction Toolbox
 * BUG 2 Fix: Provides the [ + WAYPOINT ] button that activates ADD_WAYPOINT mode.
 * Previously there was NO way for users to enter waypoint placement mode from the Dashboard map.
 */

import React, { useEffect, useCallback } from 'react';
import { MousePointer2, Hand, MapPin, Shield, Ruler, X } from 'lucide-react';
import { useMapStore, MapInteractionMode } from '../stores/mapStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { commandManager } from '../communication/CommandManager';

interface ToolButton {
  mode: MapInteractionMode;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  activeClass: string;
}

const TOOLS: ToolButton[] = [
  {
    mode: 'SELECT',
    icon: <MousePointer2 className="w-4 h-4" />,
    label: 'Select',
    shortcut: 'S',
    activeClass: 'bg-slate-700 border-slate-500 text-slate-100',
  },
  {
    mode: 'PAN',
    icon: <Hand className="w-4 h-4" />,
    label: 'Pan',
    shortcut: 'P',
    activeClass: 'bg-slate-700 border-slate-500 text-slate-100',
  },
  {
    mode: 'ADD_WAYPOINT',
    icon: <MapPin className="w-4 h-4" />,
    label: '+ Waypoint',
    shortcut: 'W',
    activeClass: 'bg-cyan-900 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.4)]',
  },
  {
    mode: 'DRAW_GEOFENCE',
    icon: <Shield className="w-4 h-4" />,
    label: 'Geofence',
    shortcut: 'G',
    activeClass: 'bg-amber-900 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
  },
  {
    mode: 'MEASURE',
    icon: <Ruler className="w-4 h-4" />,
    label: 'Measure',
    shortcut: 'M',
    activeClass: 'bg-emerald-900 border-emerald-400 text-emerald-300',
  },
];

export const MapInteractionToolbox: React.FC = () => {
  const { interactionMode, setInteractionMode } = useMapStore();
  const { drawing_mode, startDrawing, cancelDrawing } = useGeofenceStore();

  const handleToolSelect = useCallback((mode: MapInteractionMode) => {
    if (interactionMode === mode) {
      if (mode === 'DRAW_GEOFENCE') {
        cancelDrawing();
        commandManager.sendCommand('geofence.cancel_drawing', {});
      }
      setInteractionMode('SELECT');
      return;
    }

    if (mode === 'DRAW_GEOFENCE') {
      startDrawing('NO_FLY', 'POLYGON');
      setInteractionMode('DRAW_GEOFENCE');
      commandManager.sendCommand('geofence.start_drawing', {
        zone_type: 'NO_FLY',
        geometry_type: 'POLYGON',
      });
    } else {
      if (interactionMode === 'DRAW_GEOFENCE' || drawing_mode) {
        cancelDrawing();
        commandManager.sendCommand('geofence.cancel_drawing', {});
      }
      setInteractionMode(mode);
    }
  }, [interactionMode, drawing_mode, setInteractionMode, startDrawing, cancelDrawing]);

  // Keyboard shortcuts (only when map is focused, not in text inputs)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
    // Escape cancels any active tool back to SELECT
    if (e.key === 'Escape') {
      if (interactionMode === 'DRAW_GEOFENCE' || drawing_mode) {
        cancelDrawing();
        commandManager.sendCommand('geofence.cancel_drawing', {});
      }
      setInteractionMode('SELECT');
      return;
    }
    // Tool shortcuts (only when no modifiers)
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const tool = TOOLS.find((t) => t.shortcut === e.key.toUpperCase());
    if (tool) {
      e.stopPropagation();
      handleToolSelect(tool.mode);
    }
  }, [interactionMode, drawing_mode, handleToolSelect, cancelDrawing, setInteractionMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  const handleCancelCurrent = () => {
    if (interactionMode === 'DRAW_GEOFENCE' || drawing_mode) {
      cancelDrawing();
      commandManager.sendCommand('geofence.cancel_drawing', {});
    }
    setInteractionMode('SELECT');
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Tool buttons */}
      <div className="flex flex-col rounded border border-slate-800 bg-[#0f141c]/95 backdrop-blur-md shadow-xl overflow-hidden">
        {TOOLS.map((tool, idx) => {
          const isActive = interactionMode === tool.mode;
          return (
            <React.Fragment key={tool.mode}>
              {idx > 0 && <div className="h-px bg-slate-800/60" />}
              <button
                onClick={() => handleToolSelect(tool.mode)}
                className={`flex items-center gap-2 px-3 py-2 text-[11px] font-mono font-medium transition-all whitespace-nowrap
                  border rounded-none border-transparent
                  ${isActive
                    ? tool.activeClass
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                title={`${tool.label} (${tool.shortcut})`}
              >
                {tool.icon}
                <span>{tool.label}</span>
                <span className="ml-auto text-[9px] opacity-50">[{tool.shortcut}]</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Cancel badge shown when an active tool is selected */}
      {interactionMode !== 'SELECT' && (
        <button
          onClick={handleCancelCurrent}
          className="flex items-center gap-1.5 px-2 py-1 rounded border border-red-700/60 bg-red-950/60 text-red-400 text-[10px] font-mono hover:bg-red-900/60 transition"
        >
          <X className="w-3 h-3" />
          <span>Cancel [Esc]</span>
        </button>
      )}
    </div>
  );
};

