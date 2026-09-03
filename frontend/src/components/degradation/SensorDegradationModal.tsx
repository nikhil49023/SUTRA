import React from 'react';
import { useAppStore } from '../../stores/appStore';
import { useDefensiveUpgradesStore } from '../../stores/defensiveUpgradesStore';
import {
  Sliders,
  CloudRain,
  Radio,
  EyeOff,
  Wind,
  Cpu,
  Activity,
  CheckCircle2,
  X,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

export const SensorDegradationModal: React.FC = () => {
  const degradationOpen = useAppStore((s) => s.degradationOpen);
  const setDegradationOpen = useAppStore((s) => s.setDegradationOpen);

  const degradation = useDefensiveUpgradesStore((s) => s.degradation);
  const updateDegradation = useDefensiveUpgradesStore((s) => s.updateDegradation);

  if (!degradationOpen) return null;

  const resetAll = () => {
    updateDegradation({
      gps_drift_m: 0.0,
      imu_noise_std: 0.02,
      camera_obstruction_pct: 0.0,
      thermal_false_positives: false,
      lidar_dropout_pct: 0.0,
      rf_loss_pct: 0.0,
      rf_latency_ms: 15.0,
      wind_gust_speed_ms: 2.5,
      rain_attenuation_db: 0.0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-mono">
      <div className="w-full max-w-3xl bg-[#0B0F14] border border-[#2B3743] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#11171E] border-b border-[#2B3743] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-[#3B82F6]/20 border border-[#3B82F6]/60 flex items-center justify-center text-[#3B82F6]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-[#E7EBEF] tracking-wide">
                  REALISTIC SENSOR DEGRADATION & UNCERTAINTY SIMULATOR
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#3B82F6]">
                  PRIORITY 3
                </span>
              </div>
              <span className="text-[10px] text-[#707C88]">
                &quot;SUTRA makes resilient decisions under uncertainty, never assuming perfect sensors&quot;
              </span>
            </div>
          </div>
          <button
            onClick={() => setDegradationOpen(false)}
            className="p-1 rounded text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Active Banner */}
          <div className="bg-[#151D26] border border-[#3B82F6]/40 rounded-lg p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span className="text-xs text-[#E7EBEF]">
                Active Autonomy Defense: <span className="font-bold text-[#10B981]">EKF Covariance Inflation & Tri-Modal Sensor Cross-Verification</span>
              </span>
            </div>
            <button
              onClick={resetAll}
              className="px-2.5 py-1 rounded bg-[#11171E] hover:bg-[#1B2530] border border-[#2B3743] hover:border-[#3B82F6] text-[#A9B3BD] text-[10px] font-bold flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET TO IDEAL</span>
            </button>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* GPS Drift */}
            <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#E7EBEF] flex items-center space-x-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#5B8FB9]" />
                  <span>GPS RANDOM WALK DRIFT</span>
                </span>
                <span className="font-extrabold text-[#5B8FB9]">±{degradation.gps_drift_m.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={degradation.gps_drift_m}
                onChange={(e) => updateDegradation({ gps_drift_m: parseFloat(e.target.value) })}
                className="w-full accent-[#5B8FB9]"
              />
              <span className="text-[10px] text-[#707C88] block">
                Simulates ionospheric delay & multipath drift in dense urban canyons
              </span>
            </div>

            {/* Camera Obstruction / Rain */}
            <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#E7EBEF] flex items-center space-x-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>CAMERA RAIN / GLARE BLUR</span>
                </span>
                <span className="font-extrabold text-[#3B82F6]">{degradation.camera_obstruction_pct.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={degradation.camera_obstruction_pct}
                onChange={(e) => updateDegradation({ camera_obstruction_pct: parseFloat(e.target.value) })}
                className="w-full accent-[#3B82F6]"
              />
              <span className="text-[10px] text-[#707C88] block">
                Triggers automatic weighting transfer from RGB to Thermal FLIR
              </span>
            </div>

            {/* RF Packet Loss */}
            <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#E7EBEF] flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#EF4444]" />
                  <span>RF MESH PACKET LOSS</span>
                </span>
                <span className="font-extrabold text-[#EF4444]">{degradation.rf_loss_pct.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={2}
                value={degradation.rf_loss_pct}
                onChange={(e) => updateDegradation({ rf_loss_pct: parseFloat(e.target.value) })}
                className="w-full accent-[#EF4444]"
              />
              <span className="text-[10px] text-[#707C88] block">
                Evaluates SwarmRAFT consensus tolerance under severe jamming
              </span>
            </div>

            {/* Wind Gusts */}
            <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#E7EBEF] flex items-center space-x-1.5">
                  <Wind className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>MOUNTAIN CROSSWIND GUSTS</span>
                </span>
                <span className="font-extrabold text-[#F59E0B]">{degradation.wind_gust_speed_ms.toFixed(1)} m/s</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={degradation.wind_gust_speed_ms}
                onChange={(e) => updateDegradation({ wind_gust_speed_ms: parseFloat(e.target.value) })}
                className="w-full accent-[#F59E0B]"
              />
              <span className="text-[10px] text-[#707C88] block">
                Tests attitude crab-angle compensation & battery consumption scaling
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
