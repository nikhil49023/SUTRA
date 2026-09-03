/**
 * Smart Horizon GCS — Real-Time Geofence Breach Radar & Swarm Safety Monitor
 */

import React, { memo, useMemo } from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { evaluateDroneGeofenceProximity, DroneGeofenceProximity } from './GeofenceBreachEngine';
import { commandManager } from '../communication/CommandManager';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Radio, Navigation } from 'lucide-react';

export const GeofenceBreachRadar: React.FC = memo(() => {
  const drones = useFleetStore((s) => s.drones);
  const geofences = useGeofenceStore((s) => s.geofences);

  const activeGeofences = useMemo(() => geofences.filter((g) => g.enabled), [geofences]);
  const droneList = useMemo(() => Object.values(drones), [drones]);

  const proximityMatrix = useMemo(() => {
    const results: DroneGeofenceProximity[] = [];
    droneList.forEach((drone) => {
      activeGeofences.forEach((gf) => {
        const prox = evaluateDroneGeofenceProximity(
          {
            id: drone.drone_id,
            name: drone.callsign || `UAV-${drone.drone_id.slice(-4).toUpperCase()}`,
            latitude: drone.latitude,
            longitude: drone.longitude,
            altitude: drone.altitude,
            speed: drone.speed,
            heading: drone.heading,
          },
          gf
        );
        results.push(prox);
      });
    });
    // Sort so most critical breaches are at the top
    return results.sort((a, b) => {
      const severityRank = { CRITICAL_BREACH: 4, WARNING: 3, CAUTION: 2, ADVISORY: 1, SECURE: 0 };
      return severityRank[b.severity] - severityRank[a.severity] || a.distance_to_boundary_m - b.distance_to_boundary_m;
    });
  }, [droneList, activeGeofences]);

  const activeBreaches = proximityMatrix.filter((p) => p.severity === 'CRITICAL_BREACH');
  const activeWarnings = proximityMatrix.filter((p) => p.severity === 'WARNING' || p.severity === 'CAUTION');

  const handleEngageRtl = (droneId: string) => {
    commandManager.sendCommand('drone.rtl', { drone_id: droneId });
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          {activeBreaches.length > 0 ? (
            <ShieldAlert className="w-4 h-4 text-[#EF4444] animate-bounce" />
          ) : activeWarnings.length > 0 ? (
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] animate-pulse" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
          )}
          <span className="font-bold text-[#E7EBEF] tracking-wide">AIRSPACE CONTAINMENT &amp; BREACH RADAR</span>
        </div>

        <div className="flex items-center space-x-2 text-[10px]">
          <span className={`px-2 py-0.5 rounded border font-bold ${
            activeBreaches.length > 0
              ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444] animate-pulse'
              : 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
          }`}>
            {activeBreaches.length > 0 ? `${activeBreaches.length} CRITICAL BREACH` : 'AIRSPACE CLEAR'}
          </span>
        </div>
      </div>

      {/* Proximity Cards Grid */}
      {droneList.length === 0 ? (
        <div className="p-4 text-center text-[#707C88] text-xs">No active UAV telemetry connected.</div>
      ) : activeGeofences.length === 0 ? (
        <div className="p-4 text-center text-[#707C88] text-xs">No active geofences configured.</div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {proximityMatrix.slice(0, 8).map((prox, idx) => {
            const isBreach = prox.severity === 'CRITICAL_BREACH';
            const isWarning = prox.severity === 'WARNING';
            const isCaution = prox.severity === 'CAUTION';

            const cardBorder = isBreach
              ? 'border-[#EF4444] bg-[#EF4444]/10 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
              : isWarning
              ? 'border-[#F59E0B] bg-[#F59E0B]/10'
              : isCaution
              ? 'border-[#F59E0B]/50 bg-[#151D26]'
              : 'border-[#2B3743] bg-[#151D26]';

            const badgeColor = isBreach
              ? 'text-[#EF4444] bg-[#EF4444]/20 border-[#EF4444]'
              : isWarning
              ? 'text-[#F59E0B] bg-[#F59E0B]/20 border-[#F59E0B]'
              : isCaution
              ? 'text-[#F59E0B] bg-[#1B2530] border-[#F59E0B]/40'
              : 'text-[#10B981] bg-[#10B981]/20 border-[#10B981]';

            return (
              <div
                key={`${prox.drone_id}-${prox.geofence_id}-${idx}`}
                className={`p-2.5 rounded-lg border flex flex-col space-y-1.5 transition ${cardBorder}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Navigation className={`w-3.5 h-3.5 ${isBreach ? 'text-[#EF4444]' : 'text-[#5B8FB9]'}`} />
                    <span className="font-bold text-[#E7EBEF]">{prox.drone_name}</span>
                    <span className="text-[#707C88]">vs</span>
                    <span className="font-medium text-[#A9B3BD]">{prox.geofence_name}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${badgeColor}`}>
                      {prox.severity.replace('_', ' ')}
                    </span>
                    {isBreach && (
                      <button
                        onClick={() => handleEngageRtl(prox.drone_id)}
                        className="px-2 py-0.5 rounded bg-[#EF4444] hover:bg-[#dc2626] text-white text-[9px] font-bold transition shadow animate-pulse"
                      >
                        ENGAGE RTL
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] text-[#707C88] pt-1 border-t border-[#2B3743]/50">
                  <div>
                    <span>BOUNDARY DIST: </span>
                    <span className={`font-bold tabular-nums ${prox.distance_to_boundary_m < 20 ? 'text-[#EF4444]' : 'text-[#E7EBEF]'}`}>
                      {prox.distance_to_boundary_m.toFixed(1)} m
                    </span>
                  </div>

                  <div>
                    <span>TIME TO BREACH: </span>
                    <span className={`font-bold tabular-nums ${prox.time_to_breach_s && prox.time_to_breach_s < 5 ? 'text-[#EF4444]' : 'text-[#E7EBEF]'}`}>
                      {prox.time_to_breach_s !== null ? `${prox.time_to_breach_s.toFixed(1)} s` : 'SAFE'}
                    </span>
                  </div>

                  <div>
                    <span>ALT ENVELOPE: </span>
                    <span className={`font-bold ${prox.altitude_status === 'WITHIN_ALTITUDE' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {prox.altitude_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Recommendation advisory */}
                <div className="text-[10px] text-[#A9B3BD] italic">
                  {prox.recommendation}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
