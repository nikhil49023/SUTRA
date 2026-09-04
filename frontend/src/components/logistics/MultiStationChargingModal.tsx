import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useDefensiveUpgradesStore } from '../../stores/defensiveUpgradesStore';
import {
  BatteryCharging,
  Zap,
  CheckCircle2,
  AlertTriangle,
  X,
  Navigation,
  Wind,
  Radio,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const MultiStationChargingModal: React.FC = () => {
  const chargingLogisticsOpen = useAppStore((s) => s.chargingLogisticsOpen);
  const setChargingLogisticsOpen = useAppStore((s) => s.setChargingLogisticsOpen);

  const chargingStations = useDefensiveUpgradesStore((s) => s.chargingStations);
  const stationRouting = useDefensiveUpgradesStore((s) => s.stationRouting);
  const optimizeChargingStation = useDefensiveUpgradesStore((s) => s.optimizeChargingStation);

  const [selectedDrone, setSelectedDrone] = useState<string>('UAV-02');
  const [droneBattery, setDroneBattery] = useState<number>(22);

  if (!chargingLogisticsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-mono">
      <div className="w-full max-w-4xl bg-[#0B0F14] border border-[#2B3743] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#11171E] border-b border-[#2B3743] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-[#F59E0B]/20 border border-[#F59E0B]/60 flex items-center justify-center text-[#F59E0B]">
              <BatteryCharging className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-[#E7EBEF] tracking-wide">
                  MULTI-STATION LOGISTICS & DYNAMIC CHARGING OPTIMIZER
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B]">
                  PRIORITY 5
                </span>
              </div>
              <span className="text-[10px] text-[#707C88]">
                Selects nearest SAFE charging station based on distance, elevation, battery, weather & capacity
              </span>
            </div>
          </div>
          <button
            onClick={() => setChargingLogisticsOpen(false)}
            className="p-1 rounded text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Drone Evaluator Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#11171E] p-3.5 rounded-lg border border-[#2B3743]">
            <div className="flex items-center space-x-3">
              <span className="text-xs text-[#A9B3BD] font-bold">EVALUATE DRONE:</span>
              <div className="flex space-x-1.5">
                {['UAV-01', 'UAV-02', 'UAV-03', 'UAV-04'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDrone(d)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                      selectedDrone === d
                        ? 'bg-[#5B8FB9] text-white'
                        : 'bg-[#151D26] text-[#707C88] hover:text-[#E7EBEF] border border-[#2B3743]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <span className="text-xs text-[#707C88]">BATTERY:</span>
              <span className="text-xs font-bold text-[#F59E0B]">{droneBattery}%</span>
              <input
                type="range"
                min={10}
                max={45}
                value={droneBattery}
                onChange={(e) => setDroneBattery(parseInt(e.target.value))}
                className="w-28 accent-[#F59E0B]"
              />
              <button
                onClick={() => optimizeChargingStation(selectedDrone, 12.9716, 77.5946, droneBattery)}
                className="px-3 py-1.5 rounded bg-[#5B8FB9] hover:bg-[#4A7A9E] text-white text-xs font-bold transition flex items-center space-x-1"
              >
                <Zap className="w-3 h-3" />
                <span>RE-OPTIMIZE</span>
              </button>
            </div>
          </div>

          {/* Portable Charging Stations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {chargingStations.map((st) => {
              const isFull = st.available_bays === 0;
              const isSelected = stationRouting?.selected_station?.station_id === st.station_id;

              return (
                <div
                  key={st.station_id}
                  className={`p-4 rounded-lg border flex flex-col justify-between space-y-3 transition relative overflow-hidden ${
                    isSelected
                      ? 'bg-[#151D26] border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : isFull
                      ? 'bg-[#121820] border-[#EF4444]/40 opacity-80'
                      : 'bg-[#11171E] border-[#2B3743]'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#10B981] text-white text-[9px] font-extrabold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>OPTIMAL SAFE</span>
                    </span>
                  )}

                  {isFull && !isSelected && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] text-[9px] font-bold">
                      2/2 OCCUPIED
                    </span>
                  )}

                  <div>
                    <div className="font-extrabold text-xs text-[#E7EBEF]">{st.name}</div>
                    <div className="text-[10px] text-[#707C88] mt-0.5 flex items-center space-x-1">
                      <Navigation className="w-3 h-3" />
                      <span>Elevation: {st.elevation_m}m AGL</span>
                    </div>
                  </div>

                  {/* Bay Occupancy Indicators */}
                  <div className="bg-[#0B0F14] p-2.5 rounded border border-[#2B3743] space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#707C88]">CHARGING BAYS:</span>
                      <span className={`font-bold ${isFull ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                        {st.available_bays} / {st.total_bays} AVAILABLE
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      {Array.from({ length: st.total_bays }).map((_, idx) => {
                        const occupied = idx < st.occupied_bays;
                        return (
                          <div
                            key={idx}
                            className={`h-2 flex-1 rounded-sm ${
                              occupied ? 'bg-[#EF4444]' : 'bg-[#10B981]'
                            }`}
                            title={occupied ? 'Bay Occupied' : 'Bay Ready'}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Power & RF Stats */}
                  <div className="space-y-1 text-[10px] text-[#707C88]">
                    <div className="flex justify-between">
                      <span>POWER SOURCE:</span>
                      <span className="text-[#E7EBEF] truncate max-w-[140px]">{st.power_source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RESERVE LEVEL:</span>
                      <span className="text-[#10B981] font-bold">{st.power_reserve_pct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RF LINK MARGIN:</span>
                      <span className="text-[#5B8FB9]">{st.rf_link_quality_dbm} dBm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>WEATHER HAZARD:</span>
                      <span className={st.weather_hazard_level === 'ELEVATED' ? 'text-[#F59E0B] font-bold' : 'text-[#A9B3BD]'}>
                        {st.weather_hazard_level}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Optimization Decision Rationale */}
          {stationRouting && (
            <div className="bg-[#11171E] border border-[#10B981]/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
                <span className="text-xs font-bold text-[#E7EBEF] flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>AUTONOMOUS ROUTING DECISION & REJECTION PROVENANCE</span>
                </span>
                <span className="text-[10px] text-[#10B981] font-bold bg-[#151D26] px-2 py-0.5 rounded border border-[#10B981]/30">
                  EST. FLIGHT: {stationRouting.estimated_flight_mins} MINS ({stationRouting.estimated_distance_m}m)
                </span>
              </div>

              <p className="text-xs text-[#E7EBEF] bg-[#151D26] p-3 rounded border border-[#2B3743] leading-relaxed">
                💡 <span className="font-bold text-[#10B981]">RATIONALE: </span>
                {stationRouting.recommendation_reason}
              </p>

              {/* Alternatives Table */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] text-[#707C88] font-bold">CANDIDATE STATIONS COST EVALUATION:</span>
                <div className="space-y-1">
                  {stationRouting.alternatives_evaluated.map((alt) => (
                    <div
                      key={alt.station_id}
                      className="flex items-center justify-between p-2 rounded bg-[#151D26] border border-[#2B3743] text-[11px]"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#E7EBEF]">{alt.name}</span>
                        <span className="text-[#707C88]">({alt.distance_m}m away)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-[#707C88]">Score: {alt.total_cost}</span>
                        {alt.status === 'ACCEPTED' ? (
                          <span className="text-[#10B981] font-bold bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/40">
                            ACCEPTED (WINNER)
                          </span>
                        ) : (
                          <span className="text-[#EF4444] font-bold bg-[#EF4444]/10 px-2 py-0.5 rounded border border-[#EF4444]/40" title={alt.rejection_reason || ''}>
                            REJECTED: {alt.rejection_reason}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
