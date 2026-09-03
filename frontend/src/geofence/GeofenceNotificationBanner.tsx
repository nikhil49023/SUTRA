/**
 * Smart Horizon GCS — Real-Time Rising Red Zone Breach Alert Banner
 * Appears dynamically in the Geofence Operations Center when any drone penetrates a red zone.
 */

import React, { memo, useMemo } from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useGeofenceNotificationStore } from './GeofenceNotificationStore';
import { evaluateDroneGeofenceProximity } from './GeofenceBreachEngine';
import { mapController } from '../map/MapController';
import { ShieldAlert, AlertOctagon, Navigation, CheckCircle2, Volume2, VolumeX, Shield, ArrowRight } from 'lucide-react';

interface GeofenceNotificationBannerProps {
  onViewAllNotifications?: () => void;
}

export const GeofenceNotificationBanner: React.FC<GeofenceNotificationBannerProps> = memo(({ onViewAllNotifications }) => {
  const drones = useFleetStore((s) => s.drones);
  const geofences = useGeofenceStore((s) => s.geofences);
  const { isAudioMuted, toggleAudioMute, triggerEmergencyRtl, acknowledgeNotification } = useGeofenceNotificationStore();

  const activeGeofences = useMemo(() => geofences.filter((g) => g.enabled), [geofences]);
  const droneList = useMemo(() => Object.values(drones), [drones]);

  // Real-time evaluation of all active drones vs active geofences
  const redZoneBreaches = useMemo(() => {
    const list: Array<{
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
      recommendation: string;
      is_inside: boolean;
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

        // Check for Red Zone Intrusion
        if (prox.severity === 'CRITICAL_BREACH' && (gf.zone_type === 'NO_FLY' || gf.zone_type === 'EXCLUSION' || !prox.is_inside)) {
          list.push({
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
            recommendation: prox.recommendation,
            is_inside: prox.is_inside,
          });
        }
      });
    });

    return list;
  }, [droneList, activeGeofences]);

  // Sync with notification store
  React.useEffect(() => {
    if (redZoneBreaches.length > 0) {
      useGeofenceNotificationStore.getState().ingestProximityEvaluation(
        redZoneBreaches.map((b) => ({
          drone_id: b.drone_id,
          drone_name: b.drone_name,
          geofence_id: b.geofence_id,
          geofence_name: b.geofence_name,
          zone_type: 'NO_FLY',
          severity: 'CRITICAL_RED_ZONE',
          message: `CRITICAL RED ZONE INTRUSION: ${b.drone_name} penetrated '${b.geofence_name}' (NO-FLY EXCLUSION ZONE)!`,
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
    }
  }, [redZoneBreaches]);

  if (redZoneBreaches.length === 0) {
    return null;
  }

  const primaryBreach = redZoneBreaches[0];

  return (
    <div className="bg-[#1C0F13] border-2 border-[#EF4444] rounded-lg p-3 text-[#E7EBEF] font-mono text-xs shadow-[0_0_20px_rgba(239,68,68,0.35)] animate-pulse select-none space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EF4444]/40 pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-[#EF4444]/20 border border-[#EF4444] flex items-center justify-center text-[#EF4444]">
            <AlertOctagon className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-[#EF4444] tracking-wider flex items-center space-x-2">
              <span>⚠️ RED ZONE INTRUSION NOTIFICATION ACTIVE</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#EF4444] text-white font-bold animate-ping">
                {redZoneBreaches.length} UAV IN DANGER
              </span>
            </div>
            <div className="text-[11px] text-[#FCA5A5] mt-0.5">
              Authoritative containment breach detected: Drone has penetrated a restricted No-Fly exclusion zone!
            </div>
          </div>
        </div>

        {/* Audio Mute & Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleAudioMute}
            className="px-2 py-1 rounded bg-[#2B171A] border border-[#EF4444]/60 hover:bg-[#3D1F24] text-[#FCA5A5] text-[10px] font-bold flex items-center space-x-1 transition"
            title={isAudioMuted ? 'Unmute Breach Siren' : 'Mute Breach Siren'}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#EF4444]" />}
            <span>{isAudioMuted ? 'MUTED' : 'ALARM ON'}</span>
          </button>

          {onViewAllNotifications && (
            <button
              onClick={onViewAllNotifications}
              className="px-2.5 py-1 rounded bg-[#EF4444]/20 border border-[#EF4444] hover:bg-[#EF4444]/30 text-white text-[11px] font-bold flex items-center space-x-1 transition"
            >
              <span>VIEW ALL ({redZoneBreaches.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Breach Metrics & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center bg-[#140A0D] p-2.5 rounded border border-[#EF4444]/30">
        <div className="lg:col-span-8 space-y-1">
          <div className="flex items-center space-x-2 text-[11px]">
            <span className="font-bold text-white bg-[#EF4444] px-1.5 py-0.2 rounded">
              {primaryBreach.drone_name}
            </span>
            <span className="text-[#FCA5A5]">penetrated restricted zone:</span>
            <span className="font-bold text-white underline decoration-[#EF4444] decoration-2">
              {primaryBreach.geofence_name}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px] text-[#A9B3BD]">
            <div>
              <span>GPS: </span>
              <span className="font-bold text-white tabular-nums">
                {primaryBreach.latitude.toFixed(5)}°, {primaryBreach.longitude.toFixed(5)}°
              </span>
            </div>
            <div>
              <span>ALTITUDE: </span>
              <span className="font-bold text-[#EF4444] tabular-nums">{primaryBreach.altitude.toFixed(1)} m AGL</span>
            </div>
            <div>
              <span>SPEED: </span>
              <span className="font-bold text-white tabular-nums">{primaryBreach.speed.toFixed(1)} m/s @ {primaryBreach.heading.toFixed(0)}°</span>
            </div>
          </div>
        </div>

        {/* Immediate Emergency Action Buttons */}
        <div className="lg:col-span-4 flex items-center justify-end space-x-2">
          <button
            onClick={() => {
              if (primaryBreach.latitude && primaryBreach.longitude) {
                mapController.centerOnCoordinates(primaryBreach.latitude, primaryBreach.longitude);
              }
            }}
            className="px-2.5 py-1.5 rounded bg-[#1F1518] border border-[#EF4444]/50 hover:border-[#EF4444] text-[#FCA5A5] hover:text-white text-[10px] font-bold flex items-center space-x-1 transition"
          >
            <Navigation className="w-3 h-3" />
            <span>CENTER MAP</span>
          </button>

          <button
            onClick={() => triggerEmergencyRtl(primaryBreach.drone_id)}
            className="px-3 py-1.5 rounded bg-[#EF4444] hover:bg-[#DC2626] text-white font-extrabold text-[11px] flex items-center space-x-1.5 shadow-[0_0_12px_rgba(239,68,68,0.5)] transition active:scale-95 animate-bounce"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>EMERGENCY RTL UAV</span>
          </button>
        </div>
      </div>
    </div>
  );
});
