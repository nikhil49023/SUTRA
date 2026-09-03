/**
 * Smart Horizon GCS — Master Geofence Operations Center
 * Subsystem: Tactical Airspace Management & Containment (Enterprise Deployment Level)
 */

import React, { useState, memo, useMemo } from 'react';
import { GeofenceToolbar } from './GeofenceToolbar';
import { GeofenceSidebar } from './GeofenceSidebar';
import { GeofenceEditor } from './GeofenceEditor';
import { GeofenceProperties } from './GeofenceProperties';
import { GeofenceBreachRadar } from './GeofenceBreachRadar';
import { GeofenceNotifications } from './GeofenceNotifications';
import { GeofenceNotificationBanner } from './GeofenceNotificationBanner';
import { AIRSPACE_PRESETS } from './GeofencePresets';
import { GeofenceFormatService } from './GeofenceFormatService';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useGeofenceNotificationStore } from './GeofenceNotificationStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useFleetStore } from '../stores/fleetStore';
import { commandManager } from '../communication/CommandManager';
import { evaluateDroneGeofenceProximity } from './GeofenceBreachEngine';
import {
  Shield,
  Radio,
  Sliders,
  Sparkles,
  Download,
  Upload,
  Copy,
  Check,
  Plus,
  Plane,
  Hexagon,
  Route,
  AlertTriangle,
  AlertOctagon,
  Bell,
  FileCode,
  Layers,
} from 'lucide-react';

export const GeofencePanel: React.FC = memo(() => {
  const [activeTab, setActiveTab] = useState<'RADAR' | 'MANAGER' | 'PRESETS' | 'EXCHANGE' | 'NOTIFICATIONS'>('MANAGER');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const geofences = useGeofenceStore((s) => s.geofences);
  const selectedType = useSelectionStore((s) => s.selected_type);
  const selectedId = useSelectionStore((s) => s.selected_id);
  const selectGeofence = useSelectionStore((s) => s.selectGeofence);
  const drones = useFleetStore((s) => s.drones);
  const notifications = useGeofenceNotificationStore((s) => s.notifications);

  const noFlyCount = geofences.filter((g) => g.zone_type === 'NO_FLY' || g.zone_type === 'EXCLUSION').length;
  const warningCount = geofences.filter((g) => g.zone_type === 'WARNING').length;
  const safeCount = geofences.filter((g) => g.zone_type === 'SAFE' || g.zone_type === 'INCLUSION').length;
  const activeCount = geofences.filter((g) => g.enabled).length;

  const activeRedZoneNotifCount = notifications.filter(
    (n) => n.severity === 'CRITICAL_RED_ZONE' && !n.acknowledged
  ).length;

  const selectedGf =
    selectedType === 'GEOFENCE' ? geofences.find((g) => g.id === selectedId) : null;

  // Compute fleet centroid for preset placement
  const droneList = useMemo(() => Object.values(drones), [drones]);
  const centerLat = droneList.length > 0
    ? droneList.reduce((acc, d) => acc + d.latitude, 0) / droneList.length
    : 37.7749;
  const centerLon = droneList.length > 0
    ? droneList.reduce((acc, d) => acc + d.longitude, 0) / droneList.length
    : -122.4194;

  const handleApplyPreset = (presetId: string) => {
    const preset = AIRSPACE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const data = preset.generator(centerLat, centerLon);
    const newGf = {
      id: `gf-preset-${Date.now()}`,
      name: data.name || preset.title,
      zone_type: data.zone_type || preset.zone_type,
      geometry_type: data.geometry_type || preset.geometry_type,
      coordinates: (data.coordinates as [number, number][]) || [],
      center: (data.center as [number, number]) || null,
      radius: data.radius ?? 200,
      corridor_width: data.corridor_width ?? 50,
      altitude_min: data.altitude_min ?? preset.default_alt_min,
      altitude_max: data.altitude_max ?? preset.default_alt_max,
      priority: data.priority ?? 4,
      enabled: true,
      visible: true,
    };

    useGeofenceStore.setState((s) => ({
      geofences: [...s.geofences, newGf],
      selected_geofence_id: newGf.id,
    }));

    commandManager.sendCommand('geofence.create', {
      name: newGf.name,
      zone_type: newGf.zone_type,
      geometry_type: newGf.geometry_type,
      coordinates: newGf.coordinates,
      center: newGf.center,
      radius: newGf.radius,
      corridor_width: newGf.corridor_width,
      altitude_min: newGf.altitude_min,
      altitude_max: newGf.altitude_max,
      priority: newGf.priority,
      enabled: true,
      visible: true,
    });

    selectGeofence(newGf.id);
    setActiveTab('MANAGER');
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const result = GeofenceFormatService.parseGeoJSON(importText);
    if (result.valid && result.geofences.length > 0) {
      result.geofences.forEach((g) => {
        const fullGf = {
          id: g.id || `gf-imp-${Date.now()}`,
          name: g.name || 'Imported Zone',
          zone_type: g.zone_type || 'NO_FLY',
          geometry_type: g.geometry_type || 'POLYGON',
          coordinates: g.coordinates || [],
          center: g.center || null,
          radius: g.radius ?? 200,
          corridor_width: g.corridor_width ?? 50,
          altitude_min: g.altitude_min ?? 0,
          altitude_max: g.altitude_max ?? 120,
          priority: g.priority ?? 3,
          enabled: true,
          visible: true,
        };
        useGeofenceStore.setState((s) => ({ geofences: [...s.geofences, fullGf] }));
        commandManager.sendCommand('geofence.create', fullGf);
      });
      setImportStatus(`Successfully imported ${result.geofences.length} geofence(s)!`);
      setImportText('');
    } else {
      setImportStatus(`Import error: ${result.errors.join('; ')}`);
    }
  };

  const handleCopyFormat = (format: 'GeoJSON' | 'KML' | 'WKT') => {
    let content = '';
    if (format === 'GeoJSON') content = GeofenceFormatService.exportToGeoJSON(geofences);
    else if (format === 'KML') content = GeofenceFormatService.exportToKML(geofences);
    else if (format === 'WKT') content = GeofenceFormatService.exportToWKT(geofences);

    navigator.clipboard.writeText(content);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleDownloadFile = (format: 'geojson' | 'kml' | 'wkt') => {
    let content = '';
    let mime = 'text/plain';
    if (format === 'geojson') {
      content = GeofenceFormatService.exportToGeoJSON(geofences);
      mime = 'application/geo+json';
    } else if (format === 'kml') {
      content = GeofenceFormatService.exportToKML(geofences);
      mime = 'application/vnd.google-earth.kml+xml';
    } else if (format === 'wkt') {
      content = GeofenceFormatService.exportToWKT(geofences);
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_horizon_airspace_${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col space-y-3 p-3 overflow-y-auto font-mono text-xs select-none custom-scrollbar">
      {/* 1. Header Metrics & Airspace Status Bar */}
      <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded bg-[#1B2530] border border-[#5B8FB9]/40 text-[#5B8FB9]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-[#E7EBEF] tracking-wide flex items-center space-x-2">
              <span>TACTICAL GEOFENCE OPERATIONS CENTER</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                ACTIVE 3D
              </span>
            </div>
            <div className="text-[11px] text-[#707C88] mt-0.5">
              Authoritative multi-drone containment, 3D altitude envelopes, and automated failsafe boundaries
            </div>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#151D26] border border-[#2B3743]">
            <Layers className="w-3.5 h-3.5 text-[#5B8FB9]" />
            <span className="text-[#707C88]">TOTAL:</span>
            <span className="font-bold text-[#E7EBEF]">{geofences.length}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#151D26] border border-[#EF4444]/40">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            <span className="text-[#707C88]">NO FLY:</span>
            <span className="font-bold text-[#EF4444]">{noFlyCount}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#151D26] border border-[#F59E0B]/40">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <span className="text-[#707C88]">WARNING:</span>
            <span className="font-bold text-[#F59E0B]">{warningCount}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#151D26] border border-[#10B981]/40">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="text-[#707C88]">SAFE:</span>
            <span className="font-bold text-[#10B981]">{safeCount}</span>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC RISING RED ZONE BREACH ALERT BANNER (Rises on any tab when breach occurs!) */}
      <GeofenceNotificationBanner onViewAllNotifications={() => setActiveTab('NOTIFICATIONS')} />

      {/* 3. Navigation Tabs */}
      <div className="flex space-x-1 bg-[#11171E] p-1 rounded-lg border border-[#2B3743]">
        {[
          { id: 'MANAGER', label: 'ZONE MANAGER & EDITOR', icon: Sliders },
          { id: 'NOTIFICATIONS', label: 'RED ZONE NOTIFICATIONS', icon: AlertOctagon, badge: activeRedZoneNotifCount },
          { id: 'RADAR', label: 'AIRSPACE RADAR & BREACHES', icon: Radio },
          { id: 'PRESETS', label: 'TACTICAL PRESETS', icon: Sparkles },
          { id: 'EXCHANGE', label: 'SPATIAL EXCHANGE (GEOJSON/KML)', icon: FileCode },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badgeCount = (tab as any).badge;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 rounded flex items-center justify-center space-x-2 transition font-bold text-xs relative ${
                isActive
                  ? 'bg-[#1B2530] border border-[#5B8FB9] text-[#5B8FB9] shadow-[0_0_12px_rgba(91,143,185,0.2)]'
                  : 'text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof badgeCount === 'number' && badgeCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#EF4444] text-white text-[9px] font-extrabold animate-pulse">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Content Bodies */}
      {activeTab === 'MANAGER' && (
        <div className="space-y-3 flex-1 flex flex-col min-h-0">
          <GeofenceToolbar />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
            <div className="space-y-3 flex flex-col">
              <GeofenceSidebar />
            </div>
            <div className="space-y-3 flex flex-col">
              {selectedGf ? (
                <>
                  <GeofenceEditor />
                  <GeofenceProperties />
                </>
              ) : (
                <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-6 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#1B2530] border border-[#5B8FB9]/40 flex items-center justify-center text-[#5B8FB9]">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[#E7EBEF]">NO GEOFENCE SELECTED FOR EDITING</div>
                    <div className="text-[11px] text-[#707C88] mt-1 max-w-sm mx-auto">
                      Click any geofence zone in the list on the left or select a zone on the map to modify its boundaries and properties.
                    </div>
                  </div>
                  {geofences.length > 0 && (
                    <button
                      onClick={() => selectGeofence(geofences[0].id)}
                      className="px-3 py-1.5 rounded bg-[#1B2530] border border-[#5B8FB9] hover:bg-[#223040] text-[#5B8FB9] font-bold transition text-xs inline-flex items-center space-x-1.5"
                    >
                      <span>EDIT FIRST ZONE ({geofences[0].name})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'NOTIFICATIONS' && (
        <div className="space-y-3 flex-1 flex flex-col min-h-0">
          <GeofenceNotifications />
        </div>
      )}

      {activeTab === 'RADAR' && (
        <div className="space-y-3 flex-1">
          <GeofenceBreachRadar />
        </div>
      )}

      {activeTab === 'PRESETS' && (
        <div className="space-y-3 flex-1">
          <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#C49A4A]" />
              <span className="font-bold text-[#E7EBEF]">1-CLICK TACTICAL AIRSPACE PRESETS</span>
            </div>
            <div className="text-[10px] text-[#707C88]">
              Centered on Fleet GPS: {centerLat.toFixed(5)}°, {centerLon.toFixed(5)}°
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {AIRSPACE_PRESETS.map((preset) => {
              const borderCol =
                preset.zone_type === 'SAFE'
                  ? 'border-[#10B981]/40 hover:border-[#10B981]'
                  : preset.zone_type === 'WARNING'
                  ? 'border-[#F59E0B]/40 hover:border-[#F59E0B]'
                  : 'border-[#EF4444]/40 hover:border-[#EF4444]';

              const badgeCol =
                preset.zone_type === 'SAFE'
                  ? 'text-[#10B981] bg-[#10B981]/20 border-[#10B981]'
                  : preset.zone_type === 'WARNING'
                  ? 'text-[#F59E0B] bg-[#F59E0B]/20 border-[#F59E0B]'
                  : 'text-[#EF4444] bg-[#EF4444]/20 border-[#EF4444]';

              return (
                <div
                  key={preset.id}
                  className={`bg-[#11171E] border ${borderCol} rounded-lg p-3 flex flex-col justify-between space-y-3 transition hover:shadow-lg`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-[#E7EBEF]">{preset.title}</div>
                      <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${badgeCol}`}>
                        {preset.zone_type}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#707C88]">{preset.description}</div>
                    <div className="text-[10px] text-[#5B8FB9]">
                      Alt: {preset.default_alt_min}–{preset.default_alt_max}m AGL · {preset.geometry_type}
                    </div>
                  </div>

                  <button
                    onClick={() => handleApplyPreset(preset.id)}
                    className="w-full py-1.5 rounded bg-[#1B2530] border border-[#5B8FB9]/60 hover:bg-[#223040] hover:border-[#5B8FB9] text-[#E7EBEF] font-bold transition flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#5B8FB9]" />
                    <span>GENERATE ZONE HERE</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'EXCHANGE' && (
        <div className="space-y-3 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Export Center */}
          <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
                <div className="flex items-center space-x-1.5 font-bold text-[#5B8FB9]">
                  <Download className="w-4 h-4" />
                  <span>EXPORT AIRSPACE DATA</span>
                </div>
                <span className="text-[10px] text-[#707C88]">{geofences.length} Active Zones</span>
              </div>

              <div className="space-y-2 text-[11px] text-[#A9B3BD]">
                Export authoritative geofence definitions for GIS, Google Earth, and Autopilot integration:
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDownloadFile('geojson')}
                  className="p-2 rounded bg-[#151D26] border border-[#5B8FB9]/60 hover:bg-[#1B2530] text-[#E7EBEF] font-bold text-center transition"
                >
                  <div className="text-xs text-[#5B8FB9]">GeoJSON</div>
                  <div className="text-[9px] text-[#707C88]">RFC 7946 Standard</div>
                </button>

                <button
                  onClick={() => handleDownloadFile('kml')}
                  className="p-2 rounded bg-[#151D26] border border-[#10B981]/60 hover:bg-[#1B2530] text-[#E7EBEF] font-bold text-center transition"
                >
                  <div className="text-xs text-[#10B981]">KML File</div>
                  <div className="text-[9px] text-[#707C88]">Google Earth / DJI</div>
                </button>

                <button
                  onClick={() => handleDownloadFile('wkt')}
                  className="p-2 rounded bg-[#151D26] border border-[#C49A4A]/60 hover:bg-[#1B2530] text-[#E7EBEF] font-bold text-center transition"
                >
                  <div className="text-xs text-[#C49A4A]">WKT Strings</div>
                  <div className="text-[9px] text-[#707C88]">Spatial DB (PostGIS)</div>
                </button>
              </div>

              {/* Copy to Clipboard Buttons */}
              <div className="pt-2 border-t border-[#2B3743] flex gap-2">
                {(['GeoJSON', 'KML', 'WKT'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleCopyFormat(fmt)}
                    className="flex-1 py-1 px-2 rounded bg-[#151D26] border border-[#2B3743] hover:border-[#5B8FB9] text-[10px] text-[#A9B3BD] flex items-center justify-center space-x-1 transition"
                  >
                    {copiedFormat === fmt ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFormat === fmt ? 'COPIED!' : `COPY ${fmt}`}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Import Center */}
          <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
                <div className="flex items-center space-x-1.5 font-bold text-[#10B981]">
                  <Upload className="w-4 h-4" />
                  <span>IMPORT GEOFENCE GEOJSON</span>
                </div>
              </div>

              <div className="text-[11px] text-[#707C88]">
                Paste GeoJSON FeatureCollection or single Polygon/Point feature:
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='{"type": "FeatureCollection", "features": [...]}'
                rows={5}
                className="w-full bg-[#0B0F14] border border-[#2B3743] rounded p-2 text-[10px] text-[#E7EBEF] font-mono focus:border-[#5B8FB9] focus:outline-none"
              />

              {importStatus && (
                <div className={`p-1.5 rounded text-[10px] ${importStatus.includes('error') ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#10B981]/20 text-[#10B981]'}`}>
                  {importStatus}
                </div>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="w-full py-1.5 rounded bg-[#10B981]/20 border border-[#10B981] hover:bg-[#10B981]/30 text-[#10B981] font-bold transition flex items-center justify-center space-x-1.5 disabled:opacity-40"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>PARSE &amp; IMPORT GEOFENCES</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
