import React, { useRef, useState, memo } from 'react';
import { useGeofenceStore, GeofenceStatusFilter } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { commandManager } from '../communication/CommandManager';
import { Geofence } from '../types/geofence';
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
} from 'lucide-react';

export const GeofenceSidebar: React.FC = memo(() => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBatchOps, setShowBatchOps] = useState(false);

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
    }
  };

  const handleClearAll = () => {
    if (geofences.length === 0) return;
    if (confirm(`Are you sure you want to delete ALL ${geofences.length} geofence(s)?`)) {
      clearAllGeofences();
      clearSelection();
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
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-[#5B8FB9]" />
            <span>ACTIVE GEOFENCES ({geofences.length})</span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowBatchOps(!showBatchOps)}
              className={`p-1 rounded border transition ${
                showBatchOps
                  ? 'bg-[#1B2530] border-[#5B8FB9] text-[#5B8FB9]'
                  : 'bg-[#11171E] border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF]'
              }`}
              title="Toggle Batch Management Operations"
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
              <Upload className="w-3 h-3 text-[#4F9A72]" />
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

        {/* Batch Operations Bar */}
        {showBatchOps && (
          <div className="p-1.5 rounded bg-[#0B0F14] border border-[#2B3743] grid grid-cols-3 gap-1 text-[10px]">
            <button
              onClick={() => setAllGeofencesEnabled(true)}
              className="py-1 px-1 rounded bg-[#151D26] hover:bg-[#1B2530] text-[#4F9A72] border border-[#2B3743] font-bold text-center transition"
            >
              ENABLE ALL
            </button>
            <button
              onClick={() => setAllGeofencesEnabled(false)}
              className="py-1 px-1 rounded bg-[#151D26] hover:bg-[#1B2530] text-[#C75A5A] border border-[#2B3743] font-bold text-center transition"
            >
              DISABLE ALL
            </button>
            <button
              onClick={() => setAllGeofencesVisible(true)}
              className="py-1 px-1 rounded bg-[#151D26] hover:bg-[#1B2530] text-[#5B8FB9] border border-[#2B3743] font-bold text-center transition"
            >
              SHOW ALL
            </button>
            <button
              onClick={() => setAllGeofencesVisible(false)}
              className="py-1 px-1 rounded bg-[#151D26] hover:bg-[#1B2530] text-[#707C88] border border-[#2B3743] font-bold text-center transition"
            >
              HIDE ALL
            </button>
            <button
              onClick={handleClearAll}
              className="col-span-2 py-1 px-1 rounded bg-[#C75A5A]/20 hover:bg-[#C75A5A]/30 text-[#C75A5A] border border-[#C75A5A]/40 font-bold text-center transition"
            >
              CLEAR ALL GEOFENCES
            </button>
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

        {/* Type Filter Pills */}
        <div className="flex flex-wrap gap-1">
          {(['ALL', 'NO_FLY', 'WARNING', 'SAFE'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                filterType === f
                  ? 'bg-[#1B2530] border-[#5B8FB9] text-[#5B8FB9]'
                  : 'bg-[#0B0F14] border-[#2B3743] text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26]'
              }`}
            >
              {f.replace('_', ' ')}
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

            const badgeColor =
              g.zone_type === 'NO_FLY'
                ? 'text-[#C75A5A] border-[#C75A5A]/40 bg-[#1B2530]'
                : g.zone_type === 'WARNING'
                ? 'text-[#C49A4A] border-[#C49A4A]/40 bg-[#1B2530]'
                : 'text-[#4F9A72] border-[#4F9A72]/40 bg-[#1B2530]';

            return (
              <div
                key={g.id}
                onClick={() => handleSelect(g)}
                className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                  isSelected
                    ? 'bg-[#1B2530] border-l-4 border-l-[#5B8FB9] text-[#E7EBEF]'
                    : 'hover:bg-[#151D26] text-[#A9B3BD]'
                }`}
              >
                <div>
                  <div className="font-bold text-xs flex items-center space-x-1.5">
                    <span className={!g.enabled ? 'line-through text-[#707C88]' : ''}>{g.name}</span>
                    <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono ${badgeColor}`}>
                      {g.zone_type}
                    </span>
                    {!g.enabled && (
                      <span className="text-[9px] px-1 rounded bg-[#C75A5A]/20 text-[#C75A5A] font-bold">
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

                <div className="flex items-center space-x-1">
                  {/* Enable / Disable */}
                  <button
                    onClick={(e) => handleToggleEnabled(e, g)}
                    className="p-1 transition"
                    title={g.enabled ? 'Disable Geofence' : 'Enable Geofence'}
                  >
                    {g.enabled ? (
                      <Power className="w-3.5 h-3.5 text-[#4F9A72]" />
                    ) : (
                      <PowerOff className="w-3.5 h-3.5 text-[#C75A5A]" />
                    )}
                  </button>

                  {/* Show / Hide */}
                  <button
                    onClick={(e) => handleToggleVisible(e, g)}
                    className="p-1 hover:text-[#5B8FB9] transition text-[#707C88]"
                    title={g.visible !== false ? 'Hide Geofence' : 'Show Geofence'}
                  >
                    {g.visible !== false ? <Eye className="w-3.5 h-3.5 text-[#5B8FB9]" /> : <EyeOff className="w-3.5 h-3.5 text-[#707C88]" />}
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={(e) => handleDuplicate(e, g)}
                    className="p-1 hover:text-[#5B8FB9] transition text-[#707C88]"
                    title="Duplicate Geofence"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => handleDelete(e, g)}
                    className="p-1 hover:text-[#C75A5A] transition text-[#707C88]"
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
