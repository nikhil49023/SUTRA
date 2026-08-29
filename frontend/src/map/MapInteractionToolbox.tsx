/**
 * Smart Horizon GCS — Floating Map Interaction Toolbox
 * BUG 2 Fix: Provides the [ + WAYPOINT ] button that activates ADD_WAYPOINT mode.
 * Previously there was NO way for users to enter waypoint placement mode from the Dashboard map.
 */

import React, { useEffect, useCallback } from 'react';
import { MousePointer2, Hand, MapPin, Shield, Edit3, Ruler, X } from 'lucide-react';
import { useMapStore, MapInteractionMode } from '../stores/mapStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useAppStore } from '../stores/appStore';
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
    activeClass: 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF]',
  },
  {
    mode: 'PAN',
    icon: <Hand className="w-4 h-4" />,
    label: 'Pan',
    shortcut: 'P',
    activeClass: 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF]',
  },
  {
    mode: 'ADD_WAYPOINT',
    icon: <MapPin className="w-4 h-4" />,
    label: '+ Waypoint',
    shortcut: 'W',
    activeClass: 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF] shadow-[0_0_8px_rgba(91,143,185,0.3)]',
  },
  {
    mode: 'DRAW_GEOFENCE',
    icon: <Shield className="w-4 h-4" />,
    label: '+ Fence',
    shortcut: 'G',
    activeClass: 'bg-[#151D26] border-[#C49A4A] text-[#C49A4A] shadow-[0_0_8px_rgba(196,154,74,0.3)]',
  },
  {
    mode: 'MEASURE',
    icon: <Ruler className="w-4 h-4" />,
    label: 'Measure',
    shortcut: 'M',
    activeClass: 'bg-[#151D26] border-[#4F9A72] text-[#4F9A72]',
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

  const handleEditFence = useCallback(() => {
    const gfs = useGeofenceStore.getState().geofences;
    const sel = useSelectionStore.getState();
    useAppStore.getState().setInspectorOpen(true);

    if (sel.selected_type === 'GEOFENCE' && sel.selected_id) {
      // already selected
    } else if (gfs.length > 0) {
      sel.selectGeofence(gfs[0].id);
      commandManager.sendCommand('GEOFENCE_SELECT', { geofence_id: gfs[0].id });
    } else {
      sel.selectObject('GEOFENCE', null);
      startDrawing('NO_FLY', 'POLYGON');
      setInteractionMode('DRAW_GEOFENCE');
      commandManager.sendCommand('geofence.start_drawing', {
        zone_type: 'NO_FLY',
        geometry_type: 'POLYGON',
      });
      return;
    }
    setInteractionMode('SELECT');
  }, [setInteractionMode, startDrawing]);

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
    if (e.key.toUpperCase() === 'E') {
      e.stopPropagation();
      handleEditFence();
      return;
    }
    const tool = TOOLS.find((t) => t.shortcut === e.key.toUpperCase());
    if (tool) {
      e.stopPropagation();
      handleToolSelect(tool.mode);
    }
  }, [interactionMode, drawing_mode, handleToolSelect, handleEditFence, cancelDrawing, setInteractionMode]);

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

  const selectedType = useSelectionStore((s) => s.selected_type);
  const isEditingFence = selectedType === 'GEOFENCE' && interactionMode === 'SELECT';

  return (
    <div className="flex flex-col gap-1">
      {/* Tool buttons */}
      <div className="flex flex-col rounded border border-[#2B3743] bg-[#11171E]/95 backdrop-blur-md shadow-xl overflow-hidden">
        {TOOLS.map((tool, idx) => {
          const isActive = interactionMode === tool.mode;
          return (
            <React.Fragment key={tool.mode}>
              {idx > 0 && <div className="h-px bg-[#2B3743]" />}
              <button
                onClick={() => handleToolSelect(tool.mode)}
                className={`flex items-center gap-2 px-3 py-2 text-[11px] font-mono font-medium transition-all whitespace-nowrap
                  border rounded-none border-transparent
                  ${isActive
                    ? tool.activeClass
                    : 'text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26]'
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

        {/* Dedicated EDIT GEOFENCE Button */}
        <div className="h-px bg-[#2B3743]" />
        <button
          onClick={handleEditFence}
          className={`flex items-center gap-2 px-3 py-2 text-[11px] font-mono font-medium transition-all whitespace-nowrap border rounded-none border-transparent ${
            isEditingFence
              ? 'bg-[#1B2530] border-[#5B8FB9] text-[#5B8FB9] shadow-[0_0_8px_rgba(91,143,185,0.3)] font-bold'
              : 'text-[#5B8FB9] hover:text-[#E7EBEF] hover:bg-[#151D26]'
          }`}
          title="Edit Geofence Parameters & Boundaries (E)"
        >
          <Edit3 className="w-4 h-4 text-[#5B8FB9]" />
          <span>Edit Fence</span>
          <span className="ml-auto text-[9px] opacity-50">[E]</span>
        </button>
      </div>

      {/* Cancel badge shown when an active tool is selected */}
      {interactionMode !== 'SELECT' && (
        <button
          onClick={handleCancelCurrent}
          className="flex items-center gap-1.5 px-2 py-1 rounded border border-[#C75A5A]/60 bg-[#151D26] text-[#C75A5A] text-[10px] font-mono hover:bg-[#1B2530] transition"
        >
          <X className="w-3 h-3" />
          <span>Cancel [Esc]</span>
        </button>
      )}
    </div>
  );
};

