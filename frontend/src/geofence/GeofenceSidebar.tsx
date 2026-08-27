import React, { memo } from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { commandManager } from '../communication/CommandManager';
import { Geofence } from '../types/geofence';
import { Shield, Eye, EyeOff, Trash2, Search } from 'lucide-react';

export const GeofenceSidebar: React.FC = memo(() => {
  const geofences = useGeofenceStore((s) => s.geofences);
  const searchQuery = useGeofenceStore((s) => s.searchQuery);
  const filterType = useGeofenceStore((s) => s.filterType);
  const setSearchQuery = useGeofenceStore((s) => s.setSearchQuery);
  const setFilterType = useGeofenceStore((s) => s.setFilterType);
  const updateGeofence = useGeofenceStore((s) => s.updateGeofence);
  const deleteGeofence = useGeofenceStore((s) => s.deleteGeofence);

  const selectedType = useSelectionStore((s) => s.selected_type);
  const selectedId = useSelectionStore((s) => s.selected_id);
  const selectGeofence = useSelectionStore((s) => s.selectGeofence);

  const filtered = geofences.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'ALL' || g.zone_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleSelect = (g: Geofence) => {
    selectGeofence(g.id);
    commandManager.sendCommand('GEOFENCE_SELECT', { geofence_id: g.id });
  };

  const handleToggleVisible = (e: React.MouseEvent, g: Geofence) => {
    e.stopPropagation();
    const newVisible = !g.visible;
    updateGeofence(g.id, { visible: newVisible });
    commandManager.sendCommand('geofence.update', { geofence_id: g.id, visible: newVisible });
  };

  const handleDelete = (e: React.MouseEvent, g: Geofence) => {
    e.stopPropagation();
    deleteGeofence(g.id);
    commandManager.sendCommand('geofence.delete', { geofence_id: g.id });
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
        </div>

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

        {/* Filter Pills */}
        <div className="flex space-x-1">
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
                    <span>{g.name}</span>
                    <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono ${badgeColor}`}>
                      {g.zone_type}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#707C88] mt-0.5 tabular-nums">
                    ALT: {g.altitude_min}–{g.altitude_max}m · {g.geometry_type}
                    {g.area_sqm ? ` · ${(g.area_sqm / 10000).toFixed(1)} ha` : ''}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => handleToggleVisible(e, g)}
                    className="p-1 hover:text-[#5B8FB9] transition text-[#707C88]"
                    title={g.visible ? 'Hide Geofence' : 'Show Geofence'}
                  >
                    {g.visible ? <Eye className="w-3.5 h-3.5 text-[#5B8FB9]" /> : <EyeOff className="w-3.5 h-3.5 text-[#707C88]" />}
                  </button>
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
