/**
 * Smart Horizon GCS — Master Geofence Notifications & Red Zone Breach Audit Center
 * Subsystem: Tactical Airspace Containment & Incident Management
 */

import React, { useState, memo, useMemo } from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useGeofenceNotificationStore, GeofenceBreachNotification } from './GeofenceNotificationStore';
import { evaluateDroneGeofenceProximity } from './GeofenceBreachEngine';
import { mapController } from '../map/MapController';
import {
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Trash2,
  Download,
  Search,
  Filter,
  Volume2,
  VolumeX,
  Navigation,
  Activity,
  Plane,
  Layers,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const GeofenceNotifications: React.FC = memo(() => {
  const drones = useFleetStore((s) => s.drones);
  const geofences = useGeofenceStore((s) => s.geofences);
  const {
    notifications,
    isAudioMuted,
    filterSeverity,
    filterDroneId,
    searchQuery,
    acknowledgeNotification,
    acknowledgeAll,
    clearNotifications,
    toggleAudioMute,
    setFilterSeverity,
    setFilterDroneId,
    setSearchQuery,
    triggerEmergencyRtl,
    triggerAutoDeflect,
  } = useGeofenceNotificationStore();

  const [copiedStatus, setCopiedStatus] = useState(false);

  const activeGeofences = useMemo(() => geofences.filter((g) => g.enabled), [geofences]);
  const droneList = useMemo(() => Object.values(drones), [drones]);

  // Real-time live evaluation for instant incident sync
  React.useEffect(() => {
    const list: any[] = [];
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

        if (prox.severity === 'CRITICAL_BREACH') {
          list.push({
            drone_id: drone.drone_id,
            drone_name: drone.callsign || `UAV-${drone.drone_id.slice(-4).toUpperCase()}`,
            geofence_id: gf.id,
            geofence_name: gf.name,
            zone_type: gf.zone_type,
            severity: 'CRITICAL_RED_ZONE',
            message: `🔴 RED ZONE INTRUSION: ${drone.callsign || drone.drone_id} is inside '${gf.name}' (NO-FLY EXCLUSION ZONE)!`,
            latitude: drone.latitude,
            longitude: drone.longitude,
            altitude: drone.altitude,
            speed: drone.speed,
            heading: drone.heading,
            distance_to_boundary_m: prox.distance_to_boundary_m,
            time_to_breach_s: prox.time_to_breach_s,
            is_inside: prox.is_inside,
          });
        } else if (prox.severity === 'WARNING' || prox.severity === 'CAUTION') {
          list.push({
            drone_id: drone.drone_id,
            drone_name: drone.callsign || `UAV-${drone.drone_id.slice(-4).toUpperCase()}`,
            geofence_id: gf.id,
            geofence_name: gf.name,
            zone_type: gf.zone_type,
            severity: 'PROXIMITY_WARNING',
            message: `⚠️ PROXIMITY CAUTION: ${drone.callsign || drone.drone_id} is ${prox.distance_to_boundary_m.toFixed(1)}m from '${gf.name}'`,
            latitude: drone.latitude,
            longitude: drone.longitude,
            altitude: drone.altitude,
            speed: drone.speed,
            heading: drone.heading,
            distance_to_boundary_m: prox.distance_to_boundary_m,
            time_to_breach_s: prox.time_to_breach_s,
            is_inside: prox.is_inside,
          });
        }
      });
    });

    if (list.length > 0) {
      useGeofenceNotificationStore.getState().ingestProximityEvaluation(list);
    }
  }, [droneList, activeGeofences]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filterSeverity !== 'ALL' && n.severity !== filterSeverity) return false;
      if (filterDroneId !== 'ALL' && n.drone_id !== filterDroneId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = n.drone_name.toLowerCase().includes(q);
        const matchesGf = n.geofence_name.toLowerCase().includes(q);
        const matchesMsg = n.message.toLowerCase().includes(q);
        if (!matchesName && !matchesGf && !matchesMsg) return false;
      }
      return true;
    });
  }, [notifications, filterSeverity, filterDroneId, searchQuery]);

  const activeRedZoneCount = notifications.filter((n) => n.severity === 'CRITICAL_RED_ZONE' && !n.acknowledged).length;
  const activeWarningCount = notifications.filter((n) => n.severity === 'PROXIMITY_WARNING' && !n.acknowledged).length;
  const acknowledgedCount = notifications.filter((n) => n.acknowledged).length;

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notifications, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `sutra_geofence_notifications_${Date.now()}.json`);
    dlAnchor.click();
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  return (
    <div className="space-y-3 font-mono text-xs select-none flex flex-col min-h-0 flex-1">
      {/* 1. Metrics & Incident Status Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#707C88] font-bold">TOTAL INCIDENTS</div>
            <div className="font-extrabold text-base text-[#E7EBEF]">{notifications.length}</div>
          </div>
          <div className="p-2 rounded bg-[#151D26] text-[#5B8FB9] border border-[#2B3743]">
            <Bell className="w-4 h-4" />
          </div>
        </div>

        <div className={`rounded-lg p-2.5 flex items-center justify-between border transition ${
          activeRedZoneCount > 0
            ? 'bg-[#1C0F13] border-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse'
            : 'bg-[#11171E] border-[#2B3743]'
        }`}>
          <div>
            <div className="text-[10px] text-[#EF4444] font-bold">RED ZONE INTRUSIONS</div>
            <div className="font-extrabold text-base text-[#EF4444]">{activeRedZoneCount} ACTIVE</div>
          </div>
          <div className="p-2 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]">
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#F59E0B] font-bold">PROXIMITY WARNINGS</div>
            <div className="font-extrabold text-base text-[#F59E0B]">{activeWarningCount} ACTIVE</div>
          </div>
          <div className="p-2 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#10B981] font-bold">ACKNOWLEDGED / SAFE</div>
            <div className="font-extrabold text-base text-[#10B981]">{acknowledgedCount} LOGGED</div>
          </div>
          <div className="p-2 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2. Tactical Controls & Filter Toolbar */}
      <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#707C88] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by drone or zone..."
              className="w-full bg-[#151D26] border border-[#2B3743] rounded pl-8 pr-2 py-1 text-xs text-[#E7EBEF] placeholder-[#707C88] focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="bg-[#151D26] border border-[#2B3743] rounded px-2.5 py-1 text-xs text-[#E7EBEF] focus:border-[#5B8FB9] focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL_RED_ZONE">🔴 Critical Red Zone Only</option>
            <option value="PROXIMITY_WARNING">🟡 Proximity Warnings Only</option>
          </select>

          {/* Drone Filter */}
          <select
            value={filterDroneId}
            onChange={(e) => setFilterDroneId(e.target.value)}
            className="bg-[#151D26] border border-[#2B3743] rounded px-2.5 py-1 text-xs text-[#E7EBEF] focus:border-[#5B8FB9] focus:outline-none"
          >
            <option value="ALL">All Drones</option>
            {droneList.map((d) => (
              <option key={d.drone_id} value={d.drone_id}>
                {d.callsign || d.drone_id}
              </option>
            ))}
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={toggleAudioMute}
            className={`px-2 py-1 rounded border text-xs font-bold flex items-center space-x-1 transition ${
              isAudioMuted
                ? 'bg-[#151D26] border-[#2B3743] text-[#707C88]'
                : 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]'
            }`}
            title={isAudioMuted ? 'Unmute Audio Siren' : 'Mute Audio Siren'}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isAudioMuted ? 'MUTED' : 'ALARM'}</span>
          </button>

          <button
            onClick={acknowledgeAll}
            disabled={notifications.length === 0}
            className="px-2.5 py-1 rounded bg-[#151D26] border border-[#2B3743] hover:border-[#10B981] hover:text-[#10B981] text-[#A9B3BD] text-xs font-bold transition disabled:opacity-40"
          >
            ACKNOWLEDGE ALL
          </button>

          <button
            onClick={handleExportJson}
            disabled={notifications.length === 0}
            className="p-1 rounded bg-[#151D26] border border-[#2B3743] hover:border-[#5B8FB9] text-[#A9B3BD] hover:text-[#5B8FB9] transition disabled:opacity-40"
            title="Export Incidents (JSON)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={clearNotifications}
            disabled={notifications.length === 0}
            className="p-1 rounded bg-[#151D26] border border-[#2B3743] hover:border-[#EF4444] text-[#707C88] hover:text-[#EF4444] transition disabled:opacity-40"
            title="Clear Notification History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Notification Cards Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
        {filteredNotifications.length === 0 ? (
          <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-8 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#151D26] border border-[#10B981]/40 flex items-center justify-center text-[#10B981]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-[#E7EBEF]">NO ACTIVE RED ZONE BREACHES</div>
            <div className="text-[11px] text-[#707C88] max-w-sm mx-auto">
              All multi-UAV swarm flight corridors and 3D containment envelopes are currently clear.
            </div>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isRedZone = notif.severity === 'CRITICAL_RED_ZONE';
            const isWarning = notif.severity === 'PROXIMITY_WARNING';

            const cardBorder = isRedZone
              ? notif.acknowledged
                ? 'border-[#EF4444]/40 bg-[#1C0F13]/60'
                : 'border-[#EF4444] bg-[#1C0F13] shadow-[0_0_15px_rgba(239,68,68,0.25)]'
              : notif.acknowledged
              ? 'border-[#2B3743] bg-[#11171E]'
              : 'border-[#F59E0B] bg-[#1C160F]';

            const badgeBg = isRedZone
              ? 'bg-[#EF4444] text-white'
              : 'bg-[#F59E0B] text-black font-bold';

            return (
              <div
                key={notif.id}
                className={`p-3 rounded-lg border transition space-y-2 ${cardBorder}`}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2B3743]/50 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center space-x-1 ${badgeBg}`}>
                      {isRedZone ? <AlertOctagon className="w-3 h-3 animate-pulse" /> : <AlertTriangle className="w-3 h-3" />}
                      <span>{isRedZone ? 'RED ZONE INTRUSION' : 'PROXIMITY WARNING'}</span>
                    </span>

                    <span className="font-extrabold text-sm text-white">
                      {notif.drone_name}
                    </span>

                    <span className="text-[#707C88]">in</span>

                    <span className="font-bold text-[#5B8FB9] underline decoration-1">
                      {notif.geofence_name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] text-[#707C88]">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(notif.timestamp).toLocaleTimeString()}</span>
                    </div>

                    {notif.acknowledged ? (
                      <span className="px-1.5 py-0.2 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 font-bold">
                        ACKNOWLEDGED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 font-bold animate-pulse">
                        UNACKNOWLEDGED
                      </span>
                    )}
                  </div>
                </div>

                {/* Telemetry Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-[#11171E] p-2 rounded border border-[#2B3743]/40">
                  <div>
                    <span className="text-[#707C88] block text-[9px]">COORDINATES</span>
                    <span className="font-bold text-[#E7EBEF] tabular-nums">
                      {notif.latitude.toFixed(5)}°, {notif.longitude.toFixed(5)}°
                    </span>
                  </div>

                  <div>
                    <span className="text-[#707C88] block text-[9px]">ALTITUDE AGL</span>
                    <span className="font-bold text-[#EF4444] tabular-nums">
                      {notif.altitude.toFixed(1)} m
                    </span>
                  </div>

                  <div>
                    <span className="text-[#707C88] block text-[9px]">SPEED &amp; HEADING</span>
                    <span className="font-bold text-[#E7EBEF] tabular-nums">
                      {notif.speed.toFixed(1)} m/s @ {notif.heading.toFixed(0)}°
                    </span>
                  </div>

                  <div>
                    <span className="text-[#707C88] block text-[9px]">BOUNDARY STATUS</span>
                    <span className={`font-bold tabular-nums ${notif.distance_to_boundary_m < 10 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                      {notif.is_inside ? 'INSIDE ZONE' : `${notif.distance_to_boundary_m.toFixed(1)}m TO EDGE`}
                    </span>
                  </div>
                </div>

                {/* Actions & Resolution Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-[10px] text-[#A9B3BD] italic flex-1">
                    {notif.action_taken ? (
                      <span className="text-[#10B981] font-bold">Action Executed: {notif.action_taken}</span>
                    ) : (
                      <span>Recommended: Execute immediate autonomous return-to-launch or evasive lateral deflection.</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => mapController.centerOnCoordinates(notif.latitude, notif.longitude)}
                      className="px-2 py-1 rounded bg-[#151D26] border border-[#2B3743] hover:border-[#5B8FB9] text-[#5B8FB9] hover:text-white text-[10px] font-bold flex items-center space-x-1 transition"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>CENTER</span>
                    </button>

                    <button
                      onClick={() => triggerAutoDeflect(notif.drone_id, notif.id)}
                      className="px-2 py-1 rounded bg-[#151D26] border border-[#5B8FB9] hover:bg-[#5B8FB9]/20 text-[#5B8FB9] text-[10px] font-bold transition"
                    >
                      AUTO-DEFLECT
                    </button>

                    <button
                      onClick={() => triggerEmergencyRtl(notif.drone_id, notif.id)}
                      className="px-2.5 py-1 rounded bg-[#EF4444] hover:bg-[#DC2626] text-white text-[10px] font-extrabold flex items-center space-x-1 transition shadow"
                    >
                      <ShieldAlert className="w-3 h-3" />
                      <span>EMERGENCY RTL</span>
                    </button>

                    {!notif.acknowledged && (
                      <button
                        onClick={() => acknowledgeNotification(notif.id)}
                        className="px-2.5 py-1 rounded bg-[#10B981]/20 border border-[#10B981] hover:bg-[#10B981]/30 text-[#10B981] text-[10px] font-bold transition"
                      >
                        ACKNOWLEDGE
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
