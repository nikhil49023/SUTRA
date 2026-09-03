import React from 'react';
import { useAppStore } from '../../stores/appStore';
import {
  ShieldCheck,
  Cpu,
  Layers,
  CheckCircle2,
  X,
  Radio,
  CloudRain,
  Activity,
  Flame,
  Zap,
} from 'lucide-react';

export const ArchitectureBoundaryModal: React.FC = () => {
  const boundaryOpen = useAppStore((s) => (s as any).architectureBoundaryOpen);
  const setBoundaryOpen = useAppStore((s) => (s as any).setArchitectureBoundaryOpen);

  if (!boundaryOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-mono">
      <div className="w-full max-w-4xl bg-[#0B0F14] border border-[#2B3743] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#11171E] border-b border-[#2B3743] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-[#10B981]/20 border border-[#10B981]/60 flex items-center justify-center text-[#10B981]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-[#E7EBEF] tracking-wide">
                  SYSTEM INTEGRITY & REALITY BOUNDARY SPECIFICATION
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981]">
                  DEFENSIBLE ARCHITECTURE
                </span>
              </div>
              <span className="text-[10px] text-[#707C88]">
                Rigorous Separation: Real Algorithmic Stack vs. Simulated Physical Environment
              </span>
            </div>
          </div>
          <button
            onClick={() => setBoundaryOpen(false)}
            className="p-1 rounded text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Column 1: Real Implementation */}
            <div className="bg-[#11171E] border border-[#10B981]/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
                <span className="font-extrabold text-xs text-[#10B981] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>REAL IMPLEMENTATION (AUTONOMY CORE)</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#10B981]/15 text-[#10B981]">
                  ZERO-MOCK CODE
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="p-2.5 rounded bg-[#151D26] border border-[#2B3743]">
                  <div className="font-bold text-[#E7EBEF]">🧠 Risk Engine</div>
                  <div className="text-[10px] text-[#707C88] mt-0.5">
                    Real multi-factor spatial hazard matrix & Bayesian risk equations.
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#151D26] border border-[#2B3743]">
                  <div className="font-bold text-[#E7EBEF]">🎯 Mission Planner & GNC</div>
                  <div className="text-[10px] text-[#707C88] mt-0.5">
                    50 Hz state machine, WGS-84/NED conversion, and QGC .plan parser.
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#151D26] border border-[#2B3743]">
                  <div className="font-bold text-[#E7EBEF]">🔋 Energy & Logistics Manager</div>
                  <div className="text-[10px] text-[#707C88] mt-0.5">
                    Battery discharge integration, glide path optimization, and multi-station routing.
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#151D26] border border-[#2B3743]">
                  <div className="font-bold text-[#E7EBEF]">🛡️ Dynamic Replanner & ORCA 3D</div>
                  <div className="text-[10px] text-[#707C88] mt-0.5">
                    Continuous 3D Velocity Obstacles solver maintaining &gt; 2.8m safety clearance.
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#151D26] border border-[#2B3743]">
                  <div className="font-bold text-[#E7EBEF]">💥 Failure & Chaos Engine</div>
                  <div className="text-[10px] text-[#707C88] mt-0.5">
                    Real monotonic timing trace (t₀ → t₄) with P50/P95 latency measurement.
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#151D26] border border-[#2B3743]">
                  <div className="font-bold text-[#E7EBEF]">📜 Decision Provenance Store</div>
                  <div className="text-[10px] text-[#707C88] mt-0.5">
                    Explainable autonomy audit answering WHY and WHY NOT the alternative.
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#151D26] border border-[#2B3743]">
                  <div className="font-bold text-[#E7EBEF]">💻 Tactical Web GCS</div>
                  <div className="text-[10px] text-[#707C88] mt-0.5">
                    60 FPS Canvas PFD, 10 Hz WebSocket streaming, and interactive GIS HUD.
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Simulated Environment */}
            <div className="bg-[#11171E] border border-[#EAB308]/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
                <span className="font-extrabold text-xs text-[#EAB308] flex items-center space-x-1.5">
                  <Layers className="w-4 h-4" />
                  <span>SIMULATED PHYSICAL ENVIRONMENT</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#EAB308]/15 text-[#EAB308]">
                  REALISTIC UNCERTAINTY
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="p-2.5 rounded bg-[#151D26] border border-[#2B3743]">
                  <div className="font-bold text-[#E7EBEF]">🚁 UAV Flight Physics</div>
                  <div className="text-[10px] text-[#707C88] mt-0.5">
                    Gazebo Sim 8 SITL / 6-DOF Runge-Kutta numerical flight dynamics.
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#151D26] border border-[#2B3743]">
                  <div className="font-bold text-[#E7EBEF]">📡 IMD National Disaster Alerts</div>
                  <div className="text-[10px] text-[#707C88] mt-0.5">
                    Simulated Indian Meteorological Department CAP XML national weather feeds.
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#151D26] border border-[#2B3743]">
                  <div className="font-bold text-[#E7EBEF]">🌧️ Dynamic Weather & Rain</div>
                  <div className="text-[10px] text-[#707C88] mt-0.5">
                    Simulated optical camera rain blur (up to 90%) and mountain wind shear.
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#151D26] border border-[#2B3743]">
                  <div className="font-bold text-[#E7EBEF]">📶 RF Mesh Propagation Channel</div>
                  <div className="text-[10px] text-[#707C88] mt-0.5">
                    Simulated log-distance path loss, NLOS Fresnel zone shadowing, and RF jamming.
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#151D26] border border-[#2B3743]">
                  <div className="font-bold text-[#E7EBEF]">🗺️ 3D Disaster Ground OctoMap</div>
                  <div className="text-[10px] text-[#707C88] mt-0.5">
                    Simulated Kedarnath flood 2.4m inundation and building collapse obstacle voxels.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#151D26] p-3 rounded-lg border border-[#2B3743] text-center text-xs text-[#A9B3BD] leading-relaxed">
            💡 <span className="text-[#10B981] font-bold">DEFENSE STRENGTH: </span>
            By explicitly isolating real autonomy algorithms from simulated environment dynamics, SUTRA provides 100% auditable algorithmic rigor without false claims of real physical floods.
          </div>
        </div>
      </div>
    </div>
  );
};
