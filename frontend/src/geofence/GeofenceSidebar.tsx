/**
 * Smart Horizon GCS — Master Geofence Sidebar & Multi-Zone Batch Operations Center
 * Subsystem: Tactical Airspace Management (Enterprise Deployment Level)
 */

import React, { useRef, useState, memo } from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useAppStore } from '../stores/appStore';
import { commandManager } from '../communication/CommandManager';
import { Geofence, ZoneType } from '../types/geofence';
import { GeofenceFormatService } from './GeofenceFormatService';
import {
  Shield,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Search,
  Download,
  Upload,
  Power,
  PowerOff,
  SlidersHorizontal,
  Edit3,
  CheckSquare,
  Square,
  Check,
  X,
  Layers,
} from 'lucide-react';

export const GeofenceSidebar: React.FC = memo(() => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBatchOps, setShowBatchOps] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchAltMin, setBatchAltMin] = useState<number>(0);
  const [batchAltMax, setBatchAltMax] = useState<number>(120);

  const geofences = useGeofenceStore((s) => s.geofences);
  const searchQuery = useGeofenceStore((s) => s.searchQuery);
  const filterType = useGeofenceStore((s) => s.filterType);
  const statusFilter = useGeofenceStore((s) => s.statusFilter);
  const setSearchQuery = useGeofenceStore((s) => s.setSearchQuery);
  const setFilterType = useGeofenceStore((s) => s.setFilterType);
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

  const filtered = geofences.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || g.zone_type === filterType;
    let matchesStatus = true;
    if (statusFilter === 'ENABLED') matchesStatus = g.enabled;
    else if (statusFilter === 'DISABLED') matchesStatus = !g.enabled;
    else if (statusFilter === 'VISIBLE') matchesStatus = g.visible !== false;
    else if (statusFilter === 'HIDDEN') matchesStatus = g.visible === false;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSelect = (g: Geofence) => {
    selectGeofence(g.id);
    commandManager.sendCommand('GEOFENCE_SELECT', { geofence_id: g.id });
  };

  const handleEdit = (e: React.MouseEvent, g: Geofence) => {
    e.stopPropagation();
    selectGeofence(g.id);
    useAppStore.getState().setInspectorOpen(true);
    commandManager.sendCommand('GEOFENCE_SELECT', { geofence_id: g.id });
  };

  const handleToggleVisible = (e: React.MouseEvent, g: Geofence) => {
    e.stopPropagation();
    toggleGeofenceVisible(g.id);
  };

  const handleToggleEnabled = (e: React.MouseEvent, g: Geofence) => {
    e.stopPropagation();
    toggleGeofenceEnabled(g.id);
  };

  const handleDuplicate = (e: React.MouseEvent, g: Geofence) => {
    e.stopPropagation();
    duplicateGeofence(g.id);
  };

  const handleDelete = (e: React.MouseEvent, g: Geofence) => {
    e.stopPropagation();
    if (confirm(`Delete geofence "${g.name}"?`)) {
      deleteGeofence(g.id);
      commandManager.sendCommand('geofence.delete', { geofence_id: g.id });
      if (selectedId === g.id) clearSelection();
      setSelectedIds((prev) => prev.filter((id) => id !== g.id));
    }
  };

  // ── Multi-Select Checkbox Handlers ──────────────────────────────────────────
  const toggleCheckbox = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((g) => g.id));
    }
  };

  // ── Multi-Zone Batch Operations ─────────────────────────────────────────────
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

  const handleBatchExport = () => {
    const selectedGfs = geofences.filter((g) => selectedIds.includes(g.id));
    if (selectedGfs.length === 0) return;
    const jsonStr = GeofenceFormatService.exportToGeoJSON(selectedGfs);
    const blob = new Blob([jsonStr], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected_geofences_${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = () => {
    if (geofences.length === 0) return;
    if (confirm(`Are you sure you want to delete ALL ${geofences.length} geofence(s)?`)) {
      clearAllGeofences();
      clearSelection();
      setSelectedIds([]);
    }
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

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importGeoJSON(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg overflow-hidden flex flex-col font-mono text-xs select-none">
      {/* Header & Filter Search */}
      <div className="p-2.5 border-b border-[#2B3743] space-y-2 bg-[#151D26]">
        <div className="flex items-center justify-between font-bold text-[#E7EBEF]">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleSelectAll}
              className="text-[#707C88] hover:text-[#5B8FB9] transition"
              title={isAllSelected ? 'Deselect All' : 'Select All'}
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-[#5B8FB9]" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <Shield className="w-3.5 h-3.5 text-[#5B8FB9]" />
            <span>GEOFENCES ({geofences.length})</span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowBatchOps(!showBatchOps)}
              className={`p-1 rounded border transition ${
                showBatchOps || selectedIds.length > 0
                  ? 'bg-[#1B2530] border-[#5B8FB9] text-[#5B8FB9]'
                  : 'bg-[#11171E] border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF]'
              }`}
              title="Toggle Batch Multi-Zone Operations"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
            <button
              onClick={handleExport}
              className="p-1 rounded bg-[#11171E] border border-[#2B3743] hover:border-[#5B8FB9] text-[#A9B3BD] hover:text-[#E7EBEF] transition"
              title="Export Geofences as GeoJSON"
            >
              <Download className="w-3 h-3 text-[#5B8FB9]" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded bg-[#11171E] border border-[#2B3743] hover:border-[#5B8FB9] text-[#A9B3BD] hover:text-[#E7EBEF] transition"
              title="Import Geofences from GeoJSON"
            >
              <Upload className="w-3 h-3 text-[#10B981]" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        </div>

        {/* ── MULTI-GEOFENCE BATCH OPERATIONS BAR ── */}
        {(showBatchOps || selectedIds.length > 0) && (
          <div className="p-2 rounded bg-[#0B0F14] border border-[#5B8FB9]/50 space-y-2 text-[10px] shadow-inner">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#5B8FB9]">
                MULTI-ZONE EDITING: {selectedIds.length > 0 ? `${selectedIds.length} SELECTED` : 'ALL ZONES'}
              </span>
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-[#707C88] hover:text-[#E7EBEF] text-[9px]"
                >
                  CLEAR SELECTION
                </button>
              )}
            </div>

            {/* Batch Zone Type Buttons */}
            <div className="space-y-1">
              <div className="text-[9px] text-[#707C88]">SET ZONE TYPE FOR SELECTED:</div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => handleBatchZoneType('SAFE')}
                  className="py-1 px-1 rounded bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border border-[#10B981]/40 font-bold text-center transition"
                  title="Turn selected zones into SAFE (Emerald Green)"
                >
                  ● SAFE (GREEN)
                </button>
                <button
                  onClick={() => handleBatchZoneType('WARNING')}
                  className="py-1 px-1 rounded bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#F59E0B] border border-[#F59E0B]/40 font-bold text-center transition"
                  title="Turn selected zones into WARNING (Amber)"
                >
                  ● WARNING (AMBER)
                </button>
                <button
                  onClick={() => handleBatchZoneType('NO_FLY')}
                  className="py-1 px-1 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40 font-bold text-center transition"
                  title="Turn selected zones into NO FLY (Red)"
                >
                  ● NO FLY (RED)
                </button>
              </div>
            </div>

            {/* Batch Altitude Envelope */}
            <div className="space-y-1 pt-1 border-t border-[#2B3743]">
              <div className="text-[9px] text-[#707C88]">SET ALTITUDE (AGL):</div>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  value={batchAltMin}
                  onChange={(e) => setBatchAltMin(Number(e.target.value))}
                  placeholder="Min"
                  className="w-16 bg-[#151D26] border border-[#2B3743] rounded px-1.5 py-0.5 text-center text-[#E7EBEF]"
                />
                <span className="text-[#707C88]">to</span>
                <input
                  type="number"
                  value={batchAltMax}
                  onChange={(e) => setBatchAltMax(Number(e.target.value))}
                  placeholder="Max"
                  className="w-16 bg-[#151D26] border border-[#2B3743] rounded px-1.5 py-0.5 text-center text-[#E7EBEF]"
                />
                <button
                  onClick={handleBatchAltitude}
                  className="flex-1 py-0.5 px-2 rounded bg-[#1B2530] border border-[#5B8FB9] text-[#5B8FB9] font-bold hover:bg-[#223040] transition"
                >
                  APPLY ALT
                </button>
              </div>
            </div>

            {/* Batch Toggle Actions */}
            <div className="grid grid-cols-4 gap-1 pt-1 border-t border-[#2B3743]">
              <button
                onClick={() => (selectedIds.length > 0 ? handleBatchEnabled(true) : setAllGeofencesEnabled(true))}
                className="py-1 px-1 rounded bg-[#151D26] hover:bg-[#1B2530] text-[#10B981] border border-[#2B3743] font-bold text-center transition"
              >
                ENABLE
              </button>
              <button
                onClick={() => (selectedIds.length > 0 ? handleBatchEnabled(false) : setAllGeofencesEnabled(false))}
                className="py-1 px-1 rounded bg-[#151D26] hover:bg-[#1B2530] text-[#EF4444] border border-[#2B3743] font-bold text-center transition"
              >
                DISABLE
              </button>
              <button
                onClick={() => (selectedIds.length > 0 ? handleBatchVisible(true) : setAllGeofencesVisible(true))}
                className="py-1 px-1 rounded bg-[#151D26] hover:bg-[#1B2530] text-[#5B8FB9] border border-[#2B3743] font-bold text-center transition"
              >
                SHOW
              </button>
              <button
                onClick={() => (selectedIds.length > 0 ? handleBatchVisible(false) : setAllGeofencesVisible(false))}
                className="py-1 px-1 rounded bg-[#151D26] hover:bg-[#1B2530] text-[#707C88] border border-[#2B3743] font-bold text-center transition"
              >
                HIDE
              </button>
            </div>

            {/* Batch Delete & Batch Export */}
            <div className="grid grid-cols-2 gap-1 pt-1">
              <button
                onClick={selectedIds.length > 0 ? handleBatchExport : handleExport}
                className="py-1 px-1 rounded bg-[#151D26] hover:bg-[#1B2530] text-[#5B8FB9] border border-[#5B8FB9]/40 font-bold text-center transition"
              >
                EXPORT {selectedIds.length > 0 ? `(${selectedIds.length})` : 'ALL'}
              </button>
              <button
                onClick={selectedIds.length > 0 ? handleBatchDelete : handleClearAll}
                className="py-1 px-1 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40 font-bold text-center transition"
              >
                DELETE {selectedIds.length > 0 ? `(${selectedIds.length})` : 'ALL'}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-2 text-[#707C88]" />
          <input
            type="text"
            placeholder="Search zones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B0F14] border border-[#2B3743] rounded pl-7 pr-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none placeholder-[#707C88]"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex gap-1 overflow-x-auto text-[10px]">
          {(['ALL', 'NO_FLY', 'WARNING', 'SAFE', 'INCLUSION', 'EXCLUSION'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t as any)}
              className={`px-1.5 py-0.5 rounded border whitespace-nowrap transition ${
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

      {/* Geofence List */}
      <div className="divide-y divide-[#2B3743]/60 max-h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-[#707C88] text-xs">No geofences match filters.</div>
        ) : (
          filtered.map((g) => {
            const isSelected = selectedType === 'GEOFENCE' && selectedId === g.id;
            const isChecked = selectedIds.includes(g.id);

            const badgeColor =
              g.zone_type === 'NO_FLY'
                ? 'text-[#EF4444] border-[#EF4444]/40 bg-[#1B2530]'
                : g.zone_type === 'WARNING'
                ? 'text-[#F59E0B] border-[#F59E0B]/40 bg-[#1B2530]'
                : g.zone_type === 'INCLUSION'
                ? 'text-[#3B82F6] border-[#3B82F6]/40 bg-[#1B2530]'
                : 'text-[#10B981] border-[#10B981]/40 bg-[#1B2530]';

            const accentBorder =
              g.zone_type === 'SAFE'
                ? 'border-l-[#10B981]'
                : g.zone_type === 'WARNING'
                ? 'border-l-[#F59E0B]'
                : g.zone_type === 'INCLUSION'
                ? 'border-l-[#3B82F6]'
                : 'border-l-[#EF4444]';

            return (
              <div
                key={g.id}
                onClick={() => handleSelect(g)}
                className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                  isSelected
                    ? `bg-[#1B2530] border-l-4 ${accentBorder} text-[#E7EBEF]`
                    : isChecked
                    ? 'bg-[#151D26] border-l-4 border-l-[#5B8FB9] text-[#E7EBEF]'
                    : 'hover:bg-[#151D26] text-[#A9B3BD]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {/* Multi-select Checkbox */}
                  <button
                    onClick={(e) => toggleCheckbox(e, g.id)}
                    className="text-[#707C88] hover:text-[#5B8FB9] transition"
                    title={isChecked ? 'Uncheck zone' : 'Check zone for batch editing'}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-[#5B8FB9]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <div>
                    <div className="font-bold text-xs flex items-center space-x-1.5">
                      <span className={!g.enabled ? 'line-through text-[#707C88]' : ''}>{g.name}</span>
                      <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono ${badgeColor}`}>
                        {g.zone_type}
                      </span>
                      {!g.enabled && (
                        <span className="text-[9px] px-1 rounded bg-[#EF4444]/20 text-[#EF4444] font-bold">
                          OFF
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#707C88] mt-0.5 tabular-nums">
                      ALT: {g.altitude_min}–{g.altitude_max}m · {g.geometry_type}
                      {g.priority ? ` · P${g.priority}` : ''}
                      {g.area_sqm ? ` · ${(g.area_sqm / 10000).toFixed(1)} ha` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {/* Edit Geofence / Open Edit Bar */}
                  <button
                    onClick={(e) => handleEdit(e, g)}
                    className="p-1 hover:text-[#5B8FB9] transition text-[#707C88] hover:bg-[#1B2530] rounded"
                    title="Open Edit Bar for Geofence"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#5B8FB9]" />
                  </button>

                  {/* Enable / Disable */}
                  <button
                    onClick={(e) => handleToggleEnabled(e, g)}
                    className="p-1 transition"
                    title={g.enabled ? 'Disable Geofence' : 'Enable Geofence'}
                  >
                    {g.enabled ? (
                      <Power className="w-3.5 h-3.5 text-[#10B981]" />
                    ) : (
                      <PowerOff className="w-3.5 h-3.5 text-[#EF4444]" />
                    )}
                  </button>

                  {/* Show / Hide */}
                  <button
                    onClick={(e) => handleToggleVisible(e, g)}
                    className="p-1 hover:text-[#5B8FB9] transition text-[#707C88]"
                    title={g.visible !== false ? 'Hide Geofence' : 'Show Geofence'}
                  >
                    {g.visible !== false ? (
                      <Eye className="w-3.5 h-3.5 text-[#10B981]" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-[#707C88]" />
                    )}
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={(e) => handleDuplicate(e, g)}
                    className="p-1 hover:text-[#E7EBEF] transition text-[#707C88]"
                    title="Duplicate Geofence"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => handleDelete(e, g)}
                    className="p-1 hover:text-[#EF4444] transition text-[#707C88]"
                    title="Delete Geofence"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
