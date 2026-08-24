import React from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { commandManager } from '../communication/CommandManager';
import { ProtectedAction } from '../security/ProtectedAction';
import { FormationType } from '../types/fleet';
import { Users, Sliders, Eye, EyeOff } from 'lucide-react';

const FORMATIONS: { id: FormationType; label: string; desc: string }[] = [
  { id: 'V_FORMATION', label: 'V-FORMATION', desc: 'Standard tactical echelon wedge' },
  { id: 'DIAMOND', label: 'DIAMOND', desc: 'Tight 360° perimeter coverage' },
  { id: 'LINE', label: 'LINE (ECHELON)', desc: 'Wide sensor sweep scan' },
  { id: 'COLUMN', label: 'COLUMN (TRAIL)', desc: 'Narrow corridor transit' },
  { id: 'CIRCLE', label: 'CIRCLE (ORBIT)', desc: 'Omnidirectional point loiter' },
  { id: 'GRID', label: 'GRID (ARRAY)', desc: 'Search & rescue spatial matrix' },
];

export const FormationPanel: React.FC = () => {
  const { formation, spacing, show_guides, setGuidesVisible } = useFleetStore();

  const handleFormationChange = (f: FormationType) => {
    commandManager.sendCommand('fleet.set_formation', { formation: f, spacing });
  };

  const handleSpacingChange = (newSpacing: number) => {
    commandManager.sendCommand('fleet.set_spacing', { spacing: newSpacing });
  };

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>SWARM GEOMETRIC FORMATION</span>
        </div>
        <button
          onClick={() => setGuidesVisible(!show_guides)}
          className={`p-1 rounded text-[10px] flex items-center space-x-1 border ${
            show_guides
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
              : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}
          title="Toggle Target Guide Vectors"
        >
          {show_guides ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>GUIDES</span>
        </button>
      </div>

      {/* Formation Selector Grid with ProtectedAction */}
      <ProtectedAction permission="formation.change" disabledTooltip="Formation change requires Operator, Pilot, or Commander role">
        <div className="grid grid-cols-2 gap-1.5">
          {FORMATIONS.map((f) => {
            const isActive = formation === f.id;
            return (
              <button
                key={f.id}
                onClick={() => handleFormationChange(f.id)}
                className={`p-2 rounded border text-left transition ${
                  isActive
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-[11px]">{f.label}</div>
                <div className="text-[9px] text-slate-500 mt-0.5 truncate">{f.desc}</div>
              </button>
            );
          })}
        </div>
      </ProtectedAction>

      {/* Spacing Slider */}
      <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1.5">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400 flex items-center space-x-1">
            <Sliders className="w-3 h-3" />
            <span>INTER-UAV SPACING:</span>
          </span>
          <span className="font-bold text-cyan-300 tabular-nums">{spacing.toFixed(1)} meters</span>
        </div>

        <ProtectedAction permission="formation.change">
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={spacing}
            onChange={(e) => handleSpacingChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </ProtectedAction>

        <div className="flex justify-between text-[9px] text-slate-500">
          <span>5m (Tight)</span>
          <span>50m</span>
          <span>100m (Dispersed)</span>
        </div>
      </div>
    </div>
  );
};
