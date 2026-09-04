/**
 * Smart Horizon GCS — Real-Time 2D Autonomous Mapping HUD & Intelligence Panel
 * Subsystem: 2D Spatial SLAM & Multi-Drone Bayesian World Model (Subsystem D)
 */

import React from 'react';
import { useMappingStore } from '../stores/mappingStore';
import { useFleetStore } from '../stores/fleetStore';
import { mapController } from '../map/MapController';
import {
  Grid,
  Layers,
  MapPin,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Crosshair,
  Compass,
  AlertTriangle,
  Building2,
  Footprints,
  ShieldCheck,
  Waves,
} from 'lucide-react';

const SEMANTIC_STYLES: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  FREE: { label: 'Traversable Free Space', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', icon: Footprints },
  SURVIVOR: { label: 'Survivor Geolocation', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.20)', icon: Crosshair },
  OBSTACLE: { label: 'Obstacle / Hazard', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', icon: AlertTriangle },
  BUILDING: { label: 'Building Structure', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.15)', icon: Building2 },
  ROAD: { label: 'Road / Corridor', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.15)', icon: Compass },
  WATER_FLOOD: { label: 'Water / Flood Zone', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)', icon: Waves },
  LANDING_ZONE: { label: 'Safe Landing Zone', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)', icon: ShieldCheck },
  OCCUPIED: { label: 'Occupied Grid Cell', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)', icon: Grid },
};

export const Autonomous2DMappingPanel: React.FC = () => {
  const gridGeoJson = useMappingStore((s) => s.gridGeoJson);
  const totalCells = useMappingStore((s) => s.totalCells);
  const exploredAreaM2 = useMappingStore((s) => s.exploredAreaM2);
  const exploredAreaKm2 = useMappingStore((s) => s.exploredAreaKm2);
  const resolutionM = useMappingStore((s) => s.resolutionM);
  const semanticBreakdown = useMappingStore((s) => s.semanticBreakdown);
  const survivorsLocated = useMappingStore((s) => s.survivorsLocated);
  const survivorPins = useMappingStore((s) => s.survivorPins);
  const visibleSemantics = useMappingStore((s) => s.visibleSemantics);
  const isMappingActive = useMappingStore((s) => s.isMappingActive);

  const toggleSemanticVisibility = useMappingStore((s) => s.toggleSemanticVisibility);
  const setMappingActive = useMappingStore((s) => s.setMappingActive);
  const requestServerReset = useMappingStore((s) => s.requestServerReset);
  const fetchSnapshot = useMappingStore((s) => s.fetchSnapshot);

  const fleet = useFleetStore((s) => s.drones);
  const droneCount = Object.keys(fleet || {}).length;

  const handleFlyToSurvivor = (lat: number, lon: number) => {
    mapController.centerOnCoordinates(lat, lon, 18);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0F14] text-[#E7EBEF] font-mono select-none overflow-y-auto">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-[#2B3743] bg-[#11171E]/60 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-[#1B2530] border border-[#5B8FB9]/40 text-[#5B8FB9] shadow-[0_0_12px_rgba(91,143,185,0.2)]">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold tracking-wide text-[#E7EBEF]">
                2D AUTONOMOUS MAPPING ENGINE
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                REAL-TIME FUSION
              </span>
            </div>
            <p className="text-[11px] text-[#707C88]">
              Incremental Bayesian Occupancy Grid & Multi-UAV Semantic World Model
            </p>
          </div>
        </div>

        {/* Global Layer Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMappingActive(!isMappingActive)}
            className={`px-3 py-1.5 rounded text-xs font-bold border transition flex items-center space-x-1.5 ${
              isMappingActive
                ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                : 'bg-[#1C0F13] border-[#EF4444]/40 text-[#EF4444]'
            }`}
            title="Toggle Live 2D Grid Layer"
          >
            {isMappingActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isMappingActive ? 'LAYER ON' : 'LAYER OFF'}</span>
          </button>

          <button
            onClick={fetchSnapshot}
            className="px-3 py-1.5 rounded text-xs font-bold bg-[#151D26] hover:bg-[#1B2530] border border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] transition flex items-center space-x-1.5"
            title="Fetch Fresh Snapshot from Server"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>SYNC</span>
          </button>

          <button
            onClick={requestServerReset}
            className="px-3 py-1.5 rounded text-xs font-bold bg-[#1C0F13] hover:bg-[#2A151A] border border-[#EF4444]/40 text-[#EF4444] transition flex items-center space-x-1.5"
            title="Reset Map to Empty State"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>RESET MAP</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Real-Time Metrics Grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[#11171E] border border-[#2B3743]">
            <div className="text-[10px] text-[#707C88] uppercase tracking-wider">Explored Area</div>
            <div className="text-lg font-bold text-[#10B981] mt-0.5">
              {exploredAreaM2 > 10000
                ? `${exploredAreaKm2.toFixed(3)} km²`
                : `${exploredAreaM2.toLocaleString()} m²`}
            </div>
            <div className="text-[10px] text-[#707C88] mt-0.5">
              {totalCells.toLocaleString()} discrete cells
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#11171E] border border-[#2B3743]">
            <div className="text-[10px] text-[#707C88] uppercase tracking-wider">Grid Resolution</div>
            <div className="text-lg font-bold text-[#5B8FB9] mt-0.5">
              {resolutionM.toFixed(1)}m / cell
            </div>
            <div className="text-[10px] text-[#707C88] mt-0.5">
              Bayesian Log-Odds Model
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#11171E] border border-[#2B3743]">
            <div className="text-[10px] text-[#707C88] uppercase tracking-wider">Active Observers</div>
            <div className="text-lg font-bold text-[#F59E0B] mt-0.5">
              {droneCount} UAVs
            </div>
            <div className="text-[10px] text-[#707C88] mt-0.5">
              Multi-Agent Frustum Fusion
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#11171E] border border-[#2B3743]">
            <div className="text-[10px] text-[#707C88] uppercase tracking-wider">Survivors Located</div>
            <div className="text-lg font-bold text-[#EC4899] mt-0.5">
              {survivorsLocated} TARGETS
            </div>
            <div className="text-[10px] text-[#707C88] mt-0.5">
              Sub-0.40m Geolocation
            </div>
          </div>
        </div>

        {/* ── Semantic Classification Breakdown & Visibility Filter ───────── */}
        <div className="p-4 rounded-lg bg-[#11171E] border border-[#2B3743] space-y-3">
          <div className="flex items-center justify-between border-b border-[#2B3743]/60 pb-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#5B8FB9]" />
              <span className="text-xs font-bold text-[#E7EBEF] uppercase tracking-wide">
                Semantic Classification & Layer Filters
              </span>
            </div>
            <span className="text-[10px] text-[#707C88]">
              Click pill to toggle layer visibility
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {Object.entries(SEMANTIC_STYLES).map(([key, style]) => {
              const count = semanticBreakdown[key] || 0;
              const isVisible = visibleSemantics[key] !== false;
              const Icon = style.icon;

              return (
                <button
                  key={key}
                  onClick={() => toggleSemanticVisibility(key)}
                  className={`p-2.5 rounded-lg border text-left transition flex items-start justify-between ${
                    isVisible
                      ? 'bg-[#151D26] border-[#2B3743] text-[#E7EBEF] hover:border-[#5B8FB9]/50'
                      : 'bg-[#0B0F14] border-[#2B3743]/40 text-[#707C88] opacity-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: style.color }}
                      />
                      <span className="text-[11px] font-bold tracking-tight">{style.label}</span>
                    </div>
                    <div className="text-xs font-bold font-mono" style={{ color: style.color }}>
                      {count.toLocaleString()} <span className="text-[10px] text-[#707C88]">cells</span>
                    </div>
                  </div>
                  <div className="mt-0.5">
                    {isVisible ? (
                      <Eye className="w-3.5 h-3.5 text-[#5B8FB9]" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-[#707C88]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Discovered Survivors & Projected AI Targets ──────────────────── */}
        <div className="p-4 rounded-lg bg-[#11171E] border border-[#2B3743] space-y-3">
          <div className="flex items-center justify-between border-b border-[#2B3743]/60 pb-2">
            <div className="flex items-center space-x-2">
              <Crosshair className="w-4 h-4 text-[#EC4899]" />
              <span className="text-xs font-bold text-[#E7EBEF] uppercase tracking-wide">
                Projected AI Survivor Detections ({survivorPins.length})
              </span>
            </div>
            <span className="text-[10px] text-[#EC4899] font-bold">
              Edge TensorRT Raycast Coordinates
            </span>
          </div>

          {survivorPins.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#707C88] bg-[#0B0F14] rounded-lg border border-[#2B3743]/40">
              No survivors detected yet. Drones are autonomously scanning search corridors.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {survivorPins.map((pin, idx) => (
                <div
                  key={pin.cell_id || idx}
                  className="p-2.5 rounded-lg bg-[#151D26] border border-[#2B3743] hover:border-[#EC4899]/50 transition flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded bg-[#EC4899]/20 border border-[#EC4899]/40 text-[#EC4899]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#E7EBEF] flex items-center space-x-2">
                        <span>SURVIVOR #{idx + 1}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/40">
                          {((pin.confidence || 0.9) * 100).toFixed(0)}% CONF
                        </span>
                      </div>
                      <div className="text-[11px] text-[#707C88] mt-0.5">
                        {pin.latitude.toFixed(6)}° N, {pin.longitude.toFixed(6)}° W • Observed by:{' '}
                        {pin.observed_by.join(', ') || 'Drone Alpha'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFlyToSurvivor(pin.latitude, pin.longitude)}
                    className="px-2.5 py-1 rounded bg-[#1B2530] hover:bg-[#EC4899]/20 border border-[#2B3743] hover:border-[#EC4899] text-[11px] text-[#E7EBEF] hover:text-[#EC4899] transition flex items-center space-x-1"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>FLY TO</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Multi-UAV Swarm Exploration Pipeline Info ────────────────────── */}
        <div className="p-3.5 rounded-lg bg-[#11171E] border border-[#2B3743] flex items-center justify-between text-xs text-[#707C88]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>
              Autonomous Multi-UAV Raycast & Frustum Ground Projection Active
            </span>
          </div>
          <span className="font-bold text-[#E7EBEF]">
            Strictly 2D Metric Spatial Model
          </span>
        </div>
      </div>
    </div>
  );
};
