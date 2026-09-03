/**
 * Smart Horizon GCS — Global Real-Time Geofence Breach Monitor & Toast Alert System
 * Always mounted at root level to guarantee instant notifications when any drone penetrates a red zone.
 */

import React, { useEffect, useMemo, memo } from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useAppStore } from '../stores/appStore';
import { useGeofenceNotificationStore } from './GeofenceNotificationStore';
import { evaluateDroneGeofenceProximity } from './GeofenceBreachEngine';
import { mapController } from '../map/MapController';
import { ShieldAlert, AlertOctagon, Volume2, VolumeX, Navigation, ArrowRight, X } from 'lucide-react';

/**
 * Synthesizes a tactical multi-frequency warning beep using Web Audio API
 */
function playTacticalWarningTone() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15); // A4

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Ignore audio context autoplay restrictions gracefully
  }
}

export const GlobalGeofenceBreachMonitor: React.FC = memo(() => {
  const drones = useFleetStore((s) => s.drones);
  const geofences = useGeofenceStore((s) => s.geofences);
  const setActiveSection = useAppStore((s) => s.setActiveSection);

  const {
    notifications,
    isAudioMuted,
    toggleAudioMute,
    triggerEmergencyRtl,
    acknowledgeNotification,
    ingestProximityEvaluation,
  } = useGeofenceNotificationStore();

  const activeGeofences = useMemo(() => geofences.filter((g) => g.enabled), [geofences]);
  const droneList = useMemo(() => Object.values(drones), [drones]);

  // 1. Continuous Evaluation of All Drones vs Active Geofences
  const activeBreaches = useMemo(() => {
    const breaches: Array<{
      drone_id: string;
      drone_name: string;
      geofence_id: string;
      geofence_name: string;
      latitude: number;
      longitude: number;
      altitude: number;
      speed: number;
      heading: number;
      distance_to_boundary_m: number;
      time_to_breach_s: number | null;
      is_inside: boolean;
      recommendation: string;
    }> = [];

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

        // Check if drone has entered a NO_FLY or EXCLUSION red zone, or breached 3D boundary
        if (prox.severity === 'CRITICAL_BREACH' && (gf.zone_type === 'NO_FLY' || gf.zone_type === 'EXCLUSION' || !prox.is_inside)) {
          breaches.push({
            drone_id: drone.drone_id,
            drone_name: drone.callsign || `UAV-${drone.drone_id.slice(-4).toUpperCase()}`,
            geofence_id: gf.id,
            geofence_name: gf.name,
            latitude: drone.latitude,
            longitude: drone.longitude,
            altitude: drone.altitude,
            speed: drone.speed,
            heading: drone.heading,
            distance_to_boundary_m: prox.distance_to_boundary_m,
            time_to_breach_s: prox.time_to_breach_s,
            is_inside: prox.is_inside,
            recommendation: prox.recommendation,
          });
        }
      });
    });

    return breaches;
  }, [droneList, activeGeofences]);

  // 2. Synchronize Ingested Breach Notifications & Play Audio
  useEffect(() => {
    if (activeBreaches.length > 0) {
      ingestProximityEvaluation(
        activeBreaches.map((b) => ({
          drone_id: b.drone_id,
          drone_name: b.drone_name,
          geofence_id: b.geofence_id,
          geofence_name: b.geofence_name,
          zone_type: 'NO_FLY',
          severity: 'CRITICAL_RED_ZONE',
          message: `CRITICAL RED ZONE INTRUSION: ${b.drone_name} entered '${b.geofence_name}' (NO-FLY EXCLUSION)!`,
          latitude: b.latitude,
          longitude: b.longitude,
          altitude: b.altitude,
          speed: b.speed,
          heading: b.heading,
          distance_to_boundary_m: b.distance_to_boundary_m,
          time_to_breach_s: b.time_to_breach_s,
          is_inside: b.is_inside,
        }))
      );

      if (!isAudioMuted) {
        playTacticalWarningTone();
      }
    }
  }, [activeBreaches, isAudioMuted, ingestProximityEvaluation]);

  // Get active unacknowledged critical red zone notifications
  const unacknowledgedBreaches = notifications.filter(
    (n) => n.severity === 'CRITICAL_RED_ZONE' && !n.acknowledged
  );

  if (unacknowledgedBreaches.length === 0) {
    return null;
  }

  const primaryAlert = unacknowledgedBreaches[0];

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-2xl font-mono text-xs select-none pointer-events-auto animate-bounce shadow-2xl">
      <div className="bg-[#1C0F13] border-2 border-[#EF4444] rounded-lg p-3 text-[#E7EBEF] shadow-[0_0_30px_rgba(239,68,68,0.6)] space-y-2">
        {/* Header Alert Ribbon */}
        <div className="flex items-center justify-between border-b border-[#EF4444]/40 pb-1.5">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-[#EF4444] text-white flex items-center justify-center animate-pulse">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div className="font-extrabold text-sm text-[#EF4444] tracking-wider flex items-center space-x-2">
              <span>🚨 RED ZONE GEOFENCE INTRUSION DETECTED</span>
              <span className="px-1.5 py-0.2 rounded bg-[#EF4444] text-white text-[9px] font-bold">
                {unacknowledgedBreaches.length} UAV BREACH
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={toggleAudioMute}
              className="p-1 rounded bg-[#2B171A] border border-[#EF4444]/60 hover:bg-[#3D1F24] text-[#FCA5A5] transition"
              title={isAudioMuted ? 'Unmute siren' : 'Mute siren'}
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#EF4444]" />}
            </button>

            <button
              onClick={() => acknowledgeNotification(primaryAlert.id)}
              className="p-1 rounded bg-[#2B171A] border border-[#EF4444]/60 hover:bg-[#3D1F24] text-[#FCA5A5] transition"
              title="Acknowledge alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Breach Telemetry & Quick Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#12080A] p-2 rounded border border-[#EF4444]/30">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5 text-[11px]">
              <span className="px-1.5 py-0.2 rounded bg-[#EF4444] text-white font-extrabold">
                {primaryAlert.drone_name}
              </span>
              <span className="text-[#FCA5A5]">penetrated restricted zone:</span>
              <span className="font-bold text-white underline decoration-[#EF4444] decoration-2">
                {primaryAlert.geofence_name}
              </span>
            </div>

            <div className="text-[10px] text-[#A9B3BD] flex items-center space-x-3">
              <span>GPS: <b className="text-white">{primaryAlert.latitude.toFixed(5)}°, {primaryAlert.longitude.toFixed(5)}°</b></span>
              <span>ALT: <b className="text-[#EF4444]">{primaryAlert.altitude.toFixed(1)}m AGL</b></span>
              <span>SPD: <b className="text-white">{primaryAlert.speed.toFixed(1)} m/s</b></span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => {
                mapController.centerOnCoordinates(primaryAlert.latitude, primaryAlert.longitude);
              }}
              className="px-2 py-1 rounded bg-[#1F1518] border border-[#EF4444]/50 hover:border-[#EF4444] text-[#FCA5A5] hover:text-white text-[10px] font-bold flex items-center space-x-1 transition"
            >
              <Navigation className="w-3 h-3" />
              <span>CENTER</span>
            </button>

            <button
              onClick={() => {
                setActiveSection('GEOFENCE');
              }}
              className="px-2 py-1 rounded bg-[#EF4444]/20 border border-[#EF4444] hover:bg-[#EF4444]/30 text-white text-[10px] font-bold flex items-center space-x-1 transition"
            >
              <span>OPEN GEOFENCE</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              onClick={() => triggerEmergencyRtl(primaryAlert.drone_id, primaryAlert.id)}
              className="px-2.5 py-1 rounded bg-[#EF4444] hover:bg-[#DC2626] text-white font-extrabold text-[10px] flex items-center space-x-1 shadow-[0_0_12px_rgba(239,68,68,0.6)] transition animate-pulse"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>EMERGENCY RTL</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
