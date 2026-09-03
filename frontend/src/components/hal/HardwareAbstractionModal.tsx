import React from 'react';
import { useAppStore } from '../../stores/appStore';
import { useDefensiveUpgradesStore } from '../../stores/defensiveUpgradesStore';
import {
  Cpu,
  Layers,
  CheckCircle2,
  X,
  Radio,
  Eye,
  Camera,
  Flame,
  Activity,
  ArrowDown,
} from 'lucide-react';

export const HardwareAbstractionModal: React.FC = () => {
  const halOpen = useAppStore((s) => s.halOpen);
  const setHalOpen = useAppStore((s) => s.setHalOpen);

  const halState = useDefensiveUpgradesStore((s) => s.halState);
  const setHalPlatform = useDefensiveUpgradesStore((s) => s.setHalPlatform);

  if (!halOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-mono">
      <div className="w-full max-w-3xl bg-[#0B0F14] border border-[#2B3743] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#11171E] border-b border-[#2B3743] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-[#EAB308]/20 border border-[#EAB308]/60 flex items-center justify-center text-[#EAB308]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-[#E7EBEF] tracking-wide">
                  HARDWARE ABSTRACTION LAYER (HAL)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EAB308]/20 border border-[#EAB308]/40 text-[#EAB308]">
                  PRIORITY 7
                </span>
              </div>
              <span className="text-[10px] text-[#A9B3BD]">
                SUTRA&apos;s autonomy layer is designed around a hardware abstraction layer supporting PX4, ArduPilot, and simulation environments.
              </span>
            </div>
          </div>
          <button
            onClick={() => setHalOpen(false)}
            className="p-1 rounded text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Live Swap Demonstration Bar */}
          <div className="bg-[#151D26] border border-[#EAB308]/60 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div>
              <div className="text-xs font-bold text-[#E7EBEF] flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span>HOT-SWAP VALIDATION: PX4 ⇄ SIMULATOR</span>
              </div>
              <p className="text-[10px] text-[#707C88] mt-0.5">
                Swapping low-level flight control driver does NOT modify or restart the mission planner, waypoint queue, or ORCA 3D guidance loops.
              </p>
            </div>
            <button
              onClick={() => setHalPlatform(halState.active_platform === 'PX4' ? 'Simulator' : 'PX4')}
              className="px-3 py-1.5 rounded bg-[#EAB308]/20 hover:bg-[#EAB308]/30 border border-[#EAB308] text-[#EAB308] font-bold text-xs flex items-center space-x-1.5 transition whitespace-nowrap"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>SWAP DRIVER ({halState.active_platform === 'PX4' ? 'PX4 → SIM' : 'SIM → PX4'})</span>
            </button>
          </div>

          {/* Autonomy Layer Box */}
          <div className="bg-[#151D26] border border-[#5B8FB9] rounded-lg p-3.5 text-center">
            <div className="text-[10px] text-[#5B8FB9] font-bold tracking-widest uppercase">TOP LAYER</div>
            <div className="text-sm font-extrabold text-[#E7EBEF] mt-0.5">
              SUTRA UNIFIED AUTONOMY & SWARM DECISION CORE
            </div>
            <div className="text-[10px] text-[#707C88] mt-1">
              ORCA 3D Collision Avoidance • SwarmRAFT Consensus • Deep JSCC • Geodetic Raycasting
            </div>
          </div>

          <div className="flex justify-center -my-2">
            <ArrowDown className="w-4 h-4 text-[#707C88] animate-bounce" />
          </div>

          {/* HAL Adapter Layer */}
          <div className="bg-[#11171E] border border-[#EAB308]/60 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
              <span className="text-xs font-bold text-[#E7EBEF] flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-[#EAB308]" />
                <span>FLIGHT CONTROLLER HAL INTERFACES (SELECT ACTIVE):</span>
              </span>
              <span className="text-[10px] text-[#10B981] font-bold bg-[#151D26] px-2 py-0.5 rounded border border-[#10B981]/30 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                <span>ACTIVE: {halState.active_platform}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'PX4' as const,
                  name: 'PX4 Autopilot',
                  protocol: 'uORB / DDS / MAVLink v2',
                  rate: '50.0 Hz Offboard',
                  status: 'PRODUCTION CERTIFIED',
                },
                {
                  id: 'ArduPilot' as const,
                  name: 'ArduPilot Copter',
                  protocol: 'MAVLink GUIDED Mode',
                  rate: '25.0 Hz Setpoint',
                  status: 'FIELD READY',
                },
                {
                  id: 'Simulator' as const,
                  name: 'Gazebo Sim 8 SITL',
                  protocol: 'gz-transport / Direct IPC',
                  rate: '100.0 Hz Real-Time',
                  status: 'PHYSICS SYNCHRONIZED',
                },
              ].map((p) => {
                const isCurrent = halState.active_platform === p.id;

                return (
                  <button
                    key={p.id}
                    onClick={() => setHalPlatform(p.id)}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between space-y-2 transition ${
                      isCurrent
                        ? 'bg-[#1B2530] border-[#EAB308] text-[#E7EBEF] shadow-[0_0_12px_rgba(234,179,8,0.25)]'
                        : 'bg-[#151D26] border-[#2B3743] text-[#A9B3BD] hover:border-[#EAB308]/40 hover:bg-[#18222D]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs">{p.name}</span>
                        {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-[#EAB308]" />}
                      </div>
                      <div className="text-[10px] text-[#707C88] mt-1">{p.protocol}</div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] pt-1 border-t border-[#2B3743]">
                      <span className="text-[#5B8FB9]">{p.rate}</span>
                      <span className={isCurrent ? 'text-[#EAB308] font-bold' : 'text-[#707C88]'}>{p.status}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center -my-2">
            <ArrowDown className="w-4 h-4 text-[#707C88]" />
          </div>

          {/* Sensor Payload HAL */}
          <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3.5 space-y-2">
            <span className="text-[10px] text-[#707C88] font-bold tracking-wider uppercase block">
              SENSOR PAYLOAD HAL DRIVERS:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(halState.sensor_interfaces).map(([sensor, driver]) => (
                <div key={sensor} className="bg-[#151D26] p-2.5 rounded border border-[#2B3743] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-3.5 h-3.5 text-[#5B8FB9]" />
                    <span className="font-bold text-[#E7EBEF]">{sensor}</span>
                  </div>
                  <span className="text-[10px] text-[#A9B3BD] truncate max-w-[180px]">{driver}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
