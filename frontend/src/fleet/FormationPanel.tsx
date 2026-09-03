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
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">SWARM GEOMETRIC FORMATION</span>
            <span className="text-[10px] text-[#707C88] ml-2">// COORDINATED KINEMATICS</span>
          </div>
        </div>
        <button
          onClick={() => setGuidesVisible(!show_guides)}
          className={`px-2 py-1 rounded text-[10px] font-bold flex items-center space-x-1.5 border transition ${
            show_guides
              ? 'bg-[#151D26] border-[#C49A4A]/60 text-[#C49A4A]'
              : 'bg-[#151D26] border-[#2B3743] text-[#707C88] hover:text-[#E7EBEF]'
          }`}
          title="Toggle Target Guide Vectors"
        >
          {show_guides ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>GUIDES</span>
        </button>
      </div>

      {/* Formation Selector Grid with ProtectedAction */}
      <ProtectedAction permission="formation.change" disabledTooltip="Formation change requires Operator, Pilot, or Commander role">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {FORMATIONS.map((f) => {
            const isActive = formation === f.id;
            return (
              <button
                key={f.id}
                onClick={() => handleFormationChange(f.id)}
                className={`p-2.5 rounded-lg border text-left transition ${
                  isActive
                    ? 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF] shadow-[0_0_12px_rgba(91,143,185,0.2)] ring-1 ring-[#5B8FB9]/50'
                    : 'bg-[#151D26] border-[#2B3743] text-[#A9B3BD] hover:border-[#3A4856] hover:text-[#E7EBEF] hover:bg-[#18222C]'
                }`}
              >
                <div className="font-bold text-[11px] flex items-center justify-between">
                  <span>{f.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#5B8FB9]" />}
                </div>
                <div className="text-[10px] text-[#707C88] mt-1 truncate">{f.desc}</div>
              </button>
            );
          })}
        </div>
      </ProtectedAction>

      {/* Spacing Slider */}
      <div className="bg-[#151D26] p-3 rounded-lg border border-[#2B3743] space-y-2">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[#707C88] flex items-center space-x-1.5 font-bold">
            <Sliders className="w-3.5 h-3.5 text-[#5B8FB9]" />
            <span>INTER-UAV SPACING:</span>
          </span>
          <span className="font-bold text-[#5B8FB9] tabular-nums bg-[#11171E] px-2 py-0.5 rounded border border-[#2B3743]">
            {spacing.toFixed(1)} meters
          </span>
        </div>

        <ProtectedAction permission="formation.change">
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={spacing}
            onChange={(e) => handleSpacingChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#0B0F14] rounded-lg appearance-none cursor-pointer accent-[#5B8FB9] border border-[#2B3743]"
          />
        </ProtectedAction>

        <div className="flex justify-between text-[10px] text-[#707C88] px-0.5">
          <span>5m (Tight Swarm)</span>
          <span>50m (Nominal)</span>
          <span>100m (Dispersed Search)</span>
        </div>
      </div>
    </div>
  );
};
