/**
 * Smart Horizon GCS — Dedicated Geofence Management & Creation Sidebar Section
 * Subsystem: Tactical Airspace Management (Enterprise Deployment Level)
 */

import React, { useRef, useState, memo } from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useMapStore } from '../stores/mapStore';
import { useAppStore } from '../stores/appStore';
import { useFleetStore } from '../stores/fleetStore';
import { commandManager } from '../communication/CommandManager';
import { mapController } from '../map/MapController';
import { Geofence, ZoneType, GeometryType } from '../types/geofence';
import { AIRSPACE_PRESETS } from './GeofencePresets';
import { GeofenceFormatService } from './GeofenceFormatService';
import { evaluateDroneGeofenceProximity } from './GeofenceBreachEngine';
import { useGeofenceNotificationStore } from './GeofenceNotificationStore';
import { GeofenceNotificationBanner } from './GeofenceNotificationBanner';
import { GeofenceNotifications } from './GeofenceNotifications';
import {
  Shield,
  Hexagon,
  Circle,
  Route,
  Check,
  X,
  Undo2,
  SlidersHorizontal,
  Search,
  Download,
  Upload,
  Power,
  PowerOff,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Edit3,
  CheckSquare,
  Square,
  Sparkles,
  Radio,
  AlertOctagon,
  Plus,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const GeofenceSidebarSection: React.FC = memo(() => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store Subscriptions
  const geofences = useGeofenceStore((s) => s.geofences);
  const drawingMode = useGeofenceStore((s) => s.drawing_mode);
  const activeZoneType = useGeofenceStore((s) => s.active_zone_type);
  const activeGeometryType = useGeofenceStore((s) => s.active_geometry_type);
  const drawingPoints = useGeofenceStore((s) => s.drawing_points);
  const startDrawing = useGeofenceStore((s) => s.startDrawing);
  const undoDrawingPoint = useGeofenceStore((s) => s.undoDrawingPoint);
  const cancelDrawing = useGeofenceStore((s) => s.cancelDrawing);
  const deleteGeofence = useGeofenceStore((s) => s.deleteGeofence);
  const duplicateGeofence = useGeofenceStore((s) => s.duplicateGeofence);
  const toggleGeofenceVisible = useGeofenceStore((s) => s.toggleGeofenceVisible);
  const toggleGeofenceEnabled = useGeofenceStore((s) => s.toggleGeofenceEnabled);
  const batchUpdateGeofences = useGeofenceStore((s) => s.batchUpdateGeofences);
  const batchDeleteGeofences = useGeofenceStore((s) => s.batchDeleteGeofences);
  const setAllGeofencesEnabled = useGeofenceStore((s) => s.setAllGeofencesEnabled);
  const setAllGeofencesVisible = useGeofenceStore((s) => s.setAllGeofencesVisible);
  const clearAllGeofences = useGeofenceStore((s) => s.clearAllGeofences);
  const importGeoJSON = useGeofenceStore((s) => s.importGeoJSON);
  const exportGeoJSON = useGeofenceStore((s) => s.exportGeoJSON);

  const selectedType = useSelectionStore((s) => s.selected_type);
  const selectedId = useSelectionStore((s) => s.selected_id);
  const selectGeofence = useSelectionStore((s) => s.selectGeofence);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const setInteractionMode = useMapStore((s) => s.setInteractionMode);
  const drones = useFleetStore((s) => s.drones);
  const notifications = useGeofenceNotificationStore((s) => s.notifications);

  // Local UI States
  const [activeTab, setActiveTab] = useState<'MANAGE' | 'CREATE' | 'PRESETS' | 'RADAR' | 'NOTIFICATIONS'>('MANAGE');
  const [zoneName, setZoneName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | ZoneType>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchOps, setShowBatchOps] = useState(false);
  const [batchAltMin, setBatchAltMin] = useState<number>(0);
  const [batchAltMax, setBatchAltMax] = useState<number>(120);

  const activeRedZoneCount = notifications.filter(
    (n) => n.severity === 'CRITICAL_RED_ZONE' && !n.acknowledged
  ).length;

  // Compute fleet centroid for preset insertion
  const droneList = Object.values(drones);
  const centerLat = droneList.length > 0
    ? droneList.reduce((acc, d) => acc + d.latitude, 0) / droneList.length
    : 37.7749;
  const centerLon = droneList.length > 0
    ? droneList.reduce((acc, d) => acc + d.longitude, 0) / droneList.length
    : -122.4194;

  const noFlyCount = geofences.filter((g) => g.zone_type === 'NO_FLY' || g.zone_type === 'EXCLUSION').length;
  const warningCount = geofences.filter((g) => g.zone_type === 'WARNING').length;
  const safeCount = geofences.filter((g) => g.zone_type === 'SAFE' || g.zone_type === 'INCLUSION').length;

  const filtered = geofences.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || g.zone_type === filterType;
    return matchesSearch && matchesType;
  });

  // ── Drawing Workflow Handlers ───────────────────────────────────────────────
  const handleStartDrawing = (zoneType: ZoneType, geometryType: GeometryType) => {
    const count = geofences.length + 1;
    const defaultName =
      zoneType === 'SAFE'
        ? `Safe Area ${count}`
        : zoneType === 'WARNING'
        ? `Warning Sector ${count}`
        : `Restricted Zone ${count}`;
    setZoneName(defaultName);

    startDrawing(zoneType, geometryType);
    setInteractionMode('DRAW_GEOFENCE');
    commandManager.sendCommand('geofence.start_drawing', {
      zone_type: zoneType,
      geometry_type: geometryType,
    });
  };

  const handleFinishDrawing = () => {
    const minPts = activeGeometryType === 'CIRCLE' ? 1 : activeGeometryType === 'CORRIDOR' ? 2 : 3;
    if (drawingPoints.length < minPts) return;

    const count = geofences.length + 1;
    const name = zoneName.trim() || `${activeZoneType} Zone #${count}`;
    const tempId = `gf-optimistic-${Date.now()}`;

    let center: [number, number] | null = null;
    let radius = 200;
    if (activeGeometryType === 'CIRCLE' && drawingPoints.length >= 1) {
      center = drawingPoints[0];
      if (drawingPoints.length >= 2) {
        radius = Math.max(10, GeofenceFormatService ? 200 : 200);
      }
    }

    const optimisticGf = {
      id: tempId,
      name,
      zone_type: activeZoneType,
      geometry_type: activeGeometryType,
      coordinates: [...drawingPoints] as [number, number][],
      center,
      radius,
      corridor_width: 50,
      altitude_min: 0,
      altitude_max: 120,
      priority: activeZoneType === 'NO_FLY' ? 5 : 3,
      enabled: true,
      visible: true,
    };

    useGeofenceStore.setState((s) => ({ geofences: [...s.geofences, optimisticGf] }));

    commandManager.sendCommand('geofence.finish_drawing', {
      name,
      zone_type: activeZoneType,
      geometry_type: activeGeometryType,
      coordinates: drawingPoints,
      center,
      radius,
      corridor_width: 50,
      altitude_min: 0,
      altitude_max: 120,
    });

    // Exit drawing mode without lingering dots on the box!
    useGeofenceStore.setState({ drawing_mode: false, drawing_points: [], preview_point: null });
    clearSelection();
    mapController.geofenceLayer.clearHandles();
    setInteractionMode('SELECT');
    setActiveTab('MANAGE');
  };

  const handleCancelDrawing = () => {
    cancelDrawing();
    clearSelection();
    mapController.geofenceLayer.clearHandles();
    setInteractionMode('SELECT');
    commandManager.sendCommand('geofence.cancel_drawing', {});
  };

  // ── Preset Workflow Handlers ────────────────────────────────────────────────
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

    clearSelection();
    mapController.geofenceLayer.clearHandles();
    setActiveTab('MANAGE');
  };

  // ── Batch Checkbox & Operations ─────────────────────────────────────────────
  const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds([]);
    else setSelectedIds(filtered.map((g) => g.id));
  };

  const toggleCheckbox = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleBatchZoneType = (zone_type: ZoneType) => {
    if (selectedIds.length === 0) return;
    batchUpdateGeofences(selectedIds, { zone_type });
  };

  const handleBatchEnabled = (enabled: boolean) => {
    if (selectedIds.length === 0) return;
    batchUpdateGeofences(selectedIds, { enabled });
  };

  const handleBatchVisible = (visible: boolean) => {
    if (selectedIds.length === 0) return;
    batchUpdateGeofences(selectedIds, { visible });
  };

  const handleBatchAltitude = () => {
    if (selectedIds.length === 0) return;
    batchUpdateGeofences(selectedIds, {
      altitude_min: Number(batchAltMin),
      altitude_max: Number(batchAltMax),
    });
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} selected geofence(s)?`)) {
      batchDeleteGeofences(selectedIds);
      setSelectedIds([]);
      clearSelection();
    }
  };

  const handleSelectZone = (g: Geofence) => {
    selectGeofence(g.id);
    useAppStore.getState().setInspectorOpen(true);
    commandManager.sendCommand('GEOFENCE_SELECT', { geofence_id: g.id });
  };

  const handleExport = () => {
    const jsonStr = exportGeoJSON();
    const blob = new Blob([jsonStr], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_horizon_geofences_${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const minPtsRequired = activeGeometryType === 'CIRCLE' ? 1 : activeGeometryType === 'CORRIDOR' ? 2 : 3;

  return (
    <div className="w-80 md:w-96 h-full bg-[#0B0F14] border-r border-[#2B3743] flex flex-col font-mono text-xs select-none shadow-2xl z-20 overflow-hidden">
      {/* 1. Header Bar with Airspace Metrics */}
      <div className="p-3 border-b border-[#2B3743] bg-[#11171E] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded bg-[#1B2530] border border-[#5B8FB9]/50 text-[#5B8FB9]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-[#E7EBEF] tracking-wide">GEOFENCE AIRSPACE</div>
              <div className="text-[10px] text-[#707C88]">{geofences.length} Total Zones Configured</div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handleExport}
              className="p-1 rounded bg-[#151D26] border border-[#2B3743] hover:border-[#5B8FB9] text-[#A9B3BD] hover:text-[#E7EBEF] transition"
              title="Export GeoJSON"
            >
              <Download className="w-3.5 h-3.5 text-[#5B8FB9]" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded bg-[#151D26] border border-[#2B3743] hover:border-[#5B8FB9] text-[#A9B3BD] hover:text-[#E7EBEF] transition"
              title="Import GeoJSON"
            >
              <Upload className="w-3.5 h-3.5 text-[#10B981]" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  if (ev.target?.result) importGeoJSON(ev.target.result as string);
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
              className="hidden"
            />
          </div>
        </div>

        {/* Airspace Stats Badges */}
        <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-1 border-t border-[#2B3743]">
          <div className="p-1 rounded bg-[#151D26] border border-[#EF4444]/40 text-[#EF4444] font-bold">
            NO FLY: {noFlyCount}
          </div>
          <div className="p-1 rounded bg-[#151D26] border border-[#F59E0B]/40 text-[#F59E0B] font-bold">
            WARN: {warningCount}
          </div>
          <div className="p-1 rounded bg-[#151D26] border border-[#10B981]/40 text-[#10B981] font-bold">
            SAFE: {safeCount}
          </div>
        </div>
      </div>

      {/* 2. Dynamic Rising Red Zone Breach Banner */}
      <div className="px-2 pt-2">
        <GeofenceNotificationBanner onViewAllNotifications={() => setActiveTab('NOTIFICATIONS')} />
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex p-1.5 bg-[#151D26] border-b border-[#2B3743] space-x-1">
        {[
          { id: 'MANAGE', label: 'MANAGE', icon: Layers },
          { id: 'NOTIFICATIONS', label: 'ALERTS', icon: AlertOctagon, badge: activeRedZoneCount },
          { id: 'CREATE', label: '+ MAKE', icon: Plus },
          { id: 'PRESETS', label: 'PRESETS', icon: Sparkles },
          { id: 'RADAR', label: 'RADAR', icon: Radio },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badge = (tab as any).badge;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1.5 rounded flex items-center justify-center space-x-1 font-bold text-[10px] transition relative ${
                isActive
                  ? 'bg-[#1B2530] border border-[#5B8FB9] text-[#5B8FB9] shadow'
                  : 'text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#11171E]'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
              {typeof badge === 'number' && badge > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping ml-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Contents */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {/* ── NOTIFICATIONS SECTION ── */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="h-full flex flex-col">
            <GeofenceNotifications />
          </div>
        )}
        {/* ── A. CREATE NEW GEOFENCE SECTION ── */}
        {activeTab === 'CREATE' && (
          <div className="space-y-3">
            {!drawingMode ? (
              <div className="space-y-3">
                <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 space-y-2">
                  <div className="font-bold text-xs text-[#E7EBEF] flex items-center space-x-1.5">
                    <Plus className="w-4 h-4 text-[#5B8FB9]" />
                    <span>CHOOSE AIRSPACE TYPE TO DRAW</span>
                  </div>
                  <div className="text-[11px] text-[#707C88]">
                    Click any tool below, then place vertices directly on the map.
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleStartDrawing('SAFE', 'POLYGON')}
                    className="w-full p-2.5 rounded-lg border border-[#10B981]/50 bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] font-bold text-left transition flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-[#10B981]" />
                      <div>
                        <div>+ SAFE OPERATING ZONE (GREEN)</div>
                        <div className="text-[9px] text-[#10B981]/80 font-normal">Authorized multi-drone flight area</div>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#10B981]/40 bg-[#11171E]">DRAW</span>
                  </button>

                  <button
                    onClick={() => handleStartDrawing('NO_FLY', 'POLYGON')}
                    className="w-full p-2.5 rounded-lg border border-[#EF4444]/50 bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] font-bold text-left transition flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Hexagon className="w-4 h-4 text-[#EF4444]" />
                      <div>
                        <div>+ NO FLY EXCLUSION (RED)</div>
                        <div className="text-[9px] text-[#EF4444]/80 font-normal">Strict breach trigger &amp; auto-RTL</div>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#EF4444]/40 bg-[#11171E]">DRAW</span>
                  </button>

                  <button
                    onClick={() => handleStartDrawing('WARNING', 'POLYGON')}
                    className="w-full p-2.5 rounded-lg border border-[#F59E0B]/50 bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] font-bold text-left transition flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Hexagon className="w-4 h-4 text-[#F59E0B]" />
                      <div>
                        <div>+ WARNING BUFFER (AMBER)</div>
                        <div className="text-[9px] text-[#F59E0B]/80 font-normal">Advisory caution perimeter</div>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#F59E0B]/40 bg-[#11171E]">DRAW</span>
                  </button>

                  <button
                    onClick={() => handleStartDrawing('NO_FLY', 'CIRCLE')}
                    className="w-full p-2.5 rounded-lg border border-[#2B3743] bg-[#11171E] hover:bg-[#151D26] text-[#E7EBEF] font-bold text-left transition flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Circle className="w-4 h-4 text-[#5B8FB9]" />
                      <div>
                        <div>+ CIRCULAR RADIAL ZONE</div>
                        <div className="text-[9px] text-[#707C88] font-normal">Center point &amp; radius in meters</div>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#2B3743] bg-[#151D26]">DRAW</span>
                  </button>

                  <button
                    onClick={() => handleStartDrawing('SAFE', 'CORRIDOR')}
                    className="w-full p-2.5 rounded-lg border border-[#2B3743] bg-[#11171E] hover:bg-[#151D26] text-[#E7EBEF] font-bold text-left transition flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Route className="w-4 h-4 text-[#5B8FB9]" />
                      <div>
                        <div>+ FLIGHT PATH CORRIDOR</div>
                        <div className="text-[9px] text-[#707C88] font-normal">Buffered transit lane with custom width</div>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#2B3743] bg-[#151D26]">DRAW</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Active Drawing Session Controls */
              <div className="bg-[#11171E] border border-[#5B8FB9] rounded-lg p-3 space-y-3 shadow-xl animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
                  <div className="flex items-center space-x-1.5 font-bold text-[#E7EBEF]">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        activeZoneType === 'SAFE'
                          ? 'bg-[#10B981]'
                          : activeZoneType === 'WARNING'
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#EF4444]'
                      }`}
                    />
                    <span>DRAWING {activeZoneType} {activeGeometryType}</span>
                  </div>
                  <span className="text-[10px] text-[#5B8FB9]">{drawingPoints.length} PTS PLACED</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#707C88] block">ZONE NAME:</label>
                  <input
                    type="text"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    placeholder="Enter zone name..."
                    className="w-full bg-[#0B0F14] border border-[#5B8FB9]/80 rounded p-2 text-xs text-[#E7EBEF] font-bold focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="text-[11px] text-[#A9B3BD] bg-[#151D26] p-2 rounded border border-[#2B3743]">
                  💡 Click on the map to place vertices. The shape renders live in real-time.
                </div>

                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={undoDrawingPoint}
                    disabled={drawingPoints.length === 0}
                    className="flex-1 py-1.5 rounded border border-[#2B3743] bg-[#151D26] hover:bg-[#1B2530] text-[#A9B3BD] disabled:opacity-40 transition flex items-center justify-center space-x-1"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>UNDO</span>
                  </button>

                  <button
                    onClick={handleFinishDrawing}
                    disabled={drawingPoints.length < minPtsRequired}
                    className="flex-1 py-1.5 rounded border border-[#10B981] bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] font-bold disabled:opacity-40 transition flex items-center justify-center space-x-1 shadow"
                    title="Finish and save without leaving lingering dots"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>FINISH (DONE)</span>
                  </button>

                  <button
                    onClick={handleCancelDrawing}
                    className="p-1.5 rounded border border-[#EF4444]/50 bg-[#151D26] hover:bg-[#1B2530] text-[#EF4444] transition flex items-center justify-center"
                    title="Cancel Drawing"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── B. MANAGE GEOFENCES & BATCH OPERATIONS ── */}
        {activeTab === 'MANAGE' && (
          <div className="space-y-2.5">
            {/* Search & Multi-Select Filter Header */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-[#707C88]" />
                <input
                  type="text"
                  placeholder="Search geofences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#11171E] border border-[#2B3743] rounded pl-7 pr-2 py-1.5 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none placeholder-[#707C88]"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex gap-1 overflow-x-auto text-[9px] pb-0.5">
                {(['ALL', 'SAFE', 'WARNING', 'NO_FLY', 'INCLUSION', 'EXCLUSION'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t as any)}
                    className={`px-2 py-0.5 rounded border whitespace-nowrap transition ${
                      filterType === t
                        ? 'bg-[#1B2530] border-[#5B8FB9] text-[#5B8FB9] font-bold'
                        : 'bg-[#11171E] border-[#2B3743] text-[#707C88] hover:text-[#A9B3BD]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-Select Action Bar */}
            <div className="flex items-center justify-between p-2 rounded bg-[#11171E] border border-[#2B3743]">
              <button
                onClick={toggleSelectAll}
                className="flex items-center space-x-1.5 text-[#A9B3BD] hover:text-[#E7EBEF] transition"
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-[#5B8FB9]" />
                ) : (
                  <Square className="w-4 h-4 text-[#707C88]" />
                )}
                <span className="font-bold text-[10px]">
                  {selectedIds.length > 0 ? `${selectedIds.length} SELECTED` : 'SELECT ALL'}
                </span>
              </button>

              <button
                onClick={() => setShowBatchOps(!showBatchOps)}
                className={`px-2 py-0.5 rounded border transition flex items-center space-x-1 text-[10px] ${
                  showBatchOps || selectedIds.length > 0
                    ? 'bg-[#1B2530] border-[#5B8FB9] text-[#5B8FB9] font-bold'
                    : 'bg-[#151D26] border-[#2B3743] text-[#707C88]'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>BATCH EDIT</span>
              </button>
            </div>

            {/* ── BATCH OPERATIONS DRAWER ── */}
            {(showBatchOps || selectedIds.length > 0) && (
              <div className="p-2.5 rounded-lg bg-[#11171E] border border-[#5B8FB9]/60 space-y-2 text-[10px] shadow-lg animate-in slide-in-from-top duration-200">
                <div className="flex items-center justify-between font-bold text-[#5B8FB9] border-b border-[#2B3743] pb-1">
                  <span>BATCH APPLY TO {selectedIds.length > 0 ? `${selectedIds.length} ZONES` : 'ALL ZONES'}</span>
                  {selectedIds.length > 0 && (
                    <button onClick={() => setSelectedIds([])} className="text-[#707C88] hover:text-[#E7EBEF] text-[9px]">
                      CLEAR
                    </button>
                  )}
                </div>

                {/* Batch Zone Type Change */}
                <div className="space-y-1">
                  <span className="text-[9px] text-[#707C88]">SET ZONE TYPE:</span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => handleBatchZoneType('SAFE')}
                      className="py-1 px-1 rounded bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border border-[#10B981]/40 font-bold text-center transition"
                    >
                      ● SAFE
                    </button>
                    <button
                      onClick={() => handleBatchZoneType('WARNING')}
                      className="py-1 px-1 rounded bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#F59E0B] border border-[#F59E0B]/40 font-bold text-center transition"
                    >
                      ● WARNING
                    </button>
                    <button
                      onClick={() => handleBatchZoneType('NO_FLY')}
                      className="py-1 px-1 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40 font-bold text-center transition"
                    >
                      ● NO FLY
                    </button>
                  </div>
                </div>

                {/* Batch Altitude */}
                <div className="space-y-1 pt-1 border-t border-[#2B3743]">
                  <span className="text-[9px] text-[#707C88]">SET ALTITUDE (AGL):</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={batchAltMin}
                      onChange={(e) => setBatchAltMin(Number(e.target.value))}
                      className="w-14 bg-[#151D26] border border-[#2B3743] rounded px-1 text-center text-[#E7EBEF]"
                    />
                    <span className="text-[#707C88]">-</span>
                    <input
                      type="number"
                      value={batchAltMax}
                      onChange={(e) => setBatchAltMax(Number(e.target.value))}
                      className="w-14 bg-[#151D26] border border-[#2B3743] rounded px-1 text-center text-[#E7EBEF]"
                    />
                    <button
                      onClick={handleBatchAltitude}
                      className="flex-1 py-1 px-1 rounded bg-[#1B2530] border border-[#5B8FB9] text-[#5B8FB9] font-bold"
                    >
                      APPLY
                    </button>
                  </div>
                </div>

                {/* Batch Toggles & Delete */}
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#2B3743]">
                  <button
                    onClick={() => (selectedIds.length > 0 ? handleBatchEnabled(true) : setAllGeofencesEnabled(true))}
                    className="py-1 px-1 rounded bg-[#151D26] hover:bg-[#1B2530] text-[#10B981] border border-[#2B3743] font-bold"
                  >
                    ENABLE
                  </button>
                  <button
                    onClick={() => (selectedIds.length > 0 ? handleBatchEnabled(false) : setAllGeofencesEnabled(false))}
                    className="py-1 px-1 rounded bg-[#151D26] hover:bg-[#1B2530] text-[#EF4444] border border-[#2B3743] font-bold"
                  >
                    DISABLE
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="py-1 px-1 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40 font-bold"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            )}

            {/* Geofence Cards List */}
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-0.5">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-[#707C88] text-xs">No geofences found.</div>
              ) : (
                filtered.map((g) => {
                  const isSelected = selectedType === 'GEOFENCE' && selectedId === g.id;
                  const isChecked = selectedIds.includes(g.id);

                  const badgeColor =
                    g.zone_type === 'SAFE'
                      ? 'text-[#10B981] bg-[#10B981]/20 border-[#10B981]/40'
                      : g.zone_type === 'WARNING'
                      ? 'text-[#F59E0B] bg-[#F59E0B]/20 border-[#F59E0B]/40'
                      : 'text-[#EF4444] bg-[#EF4444]/20 border-[#EF4444]/40';

                  const accentBorder =
                    g.zone_type === 'SAFE'
                      ? 'border-l-[#10B981]'
                      : g.zone_type === 'WARNING'
                      ? 'border-l-[#F59E0B]'
                      : 'border-l-[#EF4444]';

                  return (
                    <div
                      key={g.id}
                      onClick={() => handleSelectZone(g)}
                      className={`p-2.5 rounded-lg border flex flex-col space-y-1.5 cursor-pointer transition ${
                        isSelected
                          ? `bg-[#1B2530] border-l-4 ${accentBorder} border-[#5B8FB9] text-[#E7EBEF] shadow`
                          : isChecked
                          ? 'bg-[#151D26] border-l-4 border-l-[#5B8FB9] border-[#2B3743] text-[#E7EBEF]'
                          : 'bg-[#11171E] border-[#2B3743] hover:bg-[#151D26] text-[#A9B3BD]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => toggleCheckbox(e, g.id)}
                            className="text-[#707C88] hover:text-[#5B8FB9] transition"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[#5B8FB9]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <span className={`font-bold text-xs ${!g.enabled ? 'line-through text-[#707C88]' : 'text-[#E7EBEF]'}`}>
                            {g.name}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${badgeColor}`}>
                            {g.zone_type}
                          </span>
                          {!g.enabled && (
                            <span className="text-[9px] px-1 rounded bg-[#EF4444]/20 text-[#EF4444] font-bold">
                              OFF
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#707C88] pt-1 border-t border-[#2B3743]/50">
                        <div>
                          ALT: {g.altitude_min}–{g.altitude_max}m · {g.geometry_type}
                        </div>

                        {/* Quick Controls */}
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectZone(g);
                            }}
                            className="p-1 hover:text-[#5B8FB9] text-[#707C88] transition"
                            title="Edit Zone"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#5B8FB9]" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGeofenceEnabled(g.id);
                            }}
                            className="p-1 transition"
                            title={g.enabled ? 'Disable' : 'Enable'}
                          >
                            {g.enabled ? (
                              <Power className="w-3.5 h-3.5 text-[#10B981]" />
                            ) : (
                              <PowerOff className="w-3.5 h-3.5 text-[#EF4444]" />
                            )}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGeofenceVisible(g.id);
                            }}
                            className="p-1 hover:text-[#5B8FB9] text-[#707C88] transition"
                            title={g.visible !== false ? 'Hide' : 'Show'}
                          >
                            {g.visible !== false ? (
                              <Eye className="w-3.5 h-3.5 text-[#10B981]" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-[#707C88]" />
                            )}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${g.name}"?`)) {
                                deleteGeofence(g.id);
                                commandManager.sendCommand('geofence.delete', { geofence_id: g.id });
                                if (selectedId === g.id) clearSelection();
                              }
                            }}
                            className="p-1 hover:text-[#EF4444] text-[#707C88] transition"
                            title="Delete Zone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── C. TACTICAL PRESETS ── */}
        {activeTab === 'PRESETS' && (
          <div className="space-y-2.5">
            <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-2.5 space-y-1">
              <div className="font-bold text-xs text-[#E7EBEF] flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-[#C49A4A]" />
                <span>1-CLICK AIRSPACE TEMPLATES</span>
              </div>
              <div className="text-[10px] text-[#707C88]">
                Auto-centered on fleet GPS: {centerLat.toFixed(4)}°, {centerLon.toFixed(4)}°
              </div>
            </div>

            <div className="space-y-2">
              {AIRSPACE_PRESETS.map((preset) => {
                const borderCol =
                  preset.zone_type === 'SAFE'
                    ? 'border-[#10B981]/40 hover:border-[#10B981]'
                    : preset.zone_type === 'WARNING'
                    ? 'border-[#F59E0B]/40 hover:border-[#F59E0B]'
                    : 'border-[#EF4444]/40 hover:border-[#EF4444]';

                return (
                  <div
                    key={preset.id}
                    className={`bg-[#11171E] border ${borderCol} rounded-lg p-2.5 space-y-2 transition`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-[#E7EBEF]">{preset.title}</div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded border font-bold">
                        {preset.zone_type}
                      </span>
                    </div>

                    <div className="text-[10px] text-[#707C88]">{preset.description}</div>

                    <button
                      onClick={() => handleApplyPreset(preset.id)}
                      className="w-full py-1.5 rounded bg-[#1B2530] border border-[#5B8FB9]/60 hover:bg-[#223040] hover:border-[#5B8FB9] text-[#E7EBEF] font-bold text-xs transition flex items-center justify-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#5B8FB9]" />
                      <span>INSERT AT FLEET POSITION</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── D. LIVE AIRSPACE RADAR ── */}
        {activeTab === 'RADAR' && (
          <div className="space-y-2.5">
            <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 font-bold text-[#E7EBEF]">
                <Radio className="w-4 h-4 text-[#5B8FB9]" />
                <span>SWARM AIRSPACE PROXIMITY</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] font-bold">
                10 HZ LIVE
              </span>
            </div>

            <div className="space-y-2">
              {droneList.length === 0 ? (
                <div className="p-4 text-center text-[#707C88] text-xs">No active drones connected.</div>
              ) : (
                droneList.map((drone) => {
                  const closestGf = geofences[0];
                  if (!closestGf) return null;
                  const prox = evaluateDroneGeofenceProximity(
                    {
                      id: drone.drone_id,
                      name: drone.callsign || `UAV-${drone.drone_id.slice(-4)}`,
                      latitude: drone.latitude,
                      longitude: drone.longitude,
                      altitude: drone.altitude,
                      speed: drone.speed,
                      heading: drone.heading,
                    },
                    closestGf
                  );

                  return (
                    <div
                      key={drone.drone_id}
                      className="bg-[#11171E] border border-[#2B3743] rounded-lg p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-[#E7EBEF]">{drone.callsign || drone.drone_id}</div>
                        <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${
                          prox.severity === 'CRITICAL_BREACH' ? 'text-[#EF4444] bg-[#EF4444]/20 border-[#EF4444]' : 'text-[#10B981] bg-[#10B981]/20 border-[#10B981]'
                        }`}>
                          {prox.severity.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[10px] text-[#707C88]">
                        <div>DIST: <span className="text-[#E7EBEF] font-bold">{prox.distance_to_boundary_m.toFixed(1)}m</span></div>
                        <div>ALT: <span className="text-[#E7EBEF] font-bold">{drone.altitude.toFixed(0)}m AGL</span></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
