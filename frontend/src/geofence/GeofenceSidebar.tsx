import React from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { commandManager } from '../communication/CommandManager';
import { Geofence } from '../types/geofence';
import { Shield, Eye, EyeOff, Trash2, Search, Filter } from 'lucide-react';
import { formatDistance } from '../utils/formatting';

export const GeofenceSidebar: React.FC = () => {
  const { geofences, searchQuery, filterType, setSearchQuery, setFilterType, updateGeofence, deleteGeofence } =
    useGeofenceStore();
  const { selected_type, selected_id, selectGeofence } = useSelectionStore();

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
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg overflow-hidden flex flex-col font-mono text-xs select-none">
      {/* Header & Filter Search */}
      <div className="p-2.5 border-b border-slate-800 space-y-2 bg-slate-900/80">
        <div className="flex items-center justify-between font-bold text-slate-200">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>ACTIVE GEOFENCES ({geofences.length})</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
          <input
            type="text"
            placeholder="Search zones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded pl-7 pr-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-400"
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
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Geofence List */}
      <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">No geofences match filters.</div>
        ) : (
          filtered.map((g) => {
            const isSelected = selected_type === 'GEOFENCE' && selected_id === g.id;

            const badgeColor =
              g.zone_type === 'NO_FLY'
                ? 'text-rose-400 border-rose-500/40 bg-rose-950/40'
                : g.zone_type === 'WARNING'
                ? 'text-amber-400 border-amber-500/40 bg-amber-950/40'
                : 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';

            return (
              <div
                key={g.id}
                onClick={() => handleSelect(g)}
                className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                  isSelected
                    ? 'bg-cyan-950/60 border-l-4 border-l-cyan-400 text-cyan-200'
                    : 'hover:bg-slate-800/40 text-slate-300'
                }`}
              >
                <div>
                  <div className="font-bold text-xs flex items-center space-x-1.5">
                    <span>{g.name}</span>
                    <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono ${badgeColor}`}>
                      {g.zone_type}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                    ALT: {g.altitude_min}–{g.altitude_max}m · {g.geometry_type}
                    {g.area_sqm ? ` · ${(g.area_sqm / 10000).toFixed(1)} ha` : ''}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => handleToggleVisible(e, g)}
                    className="p-1 hover:text-cyan-400 transition text-slate-400"
                    title={g.visible ? 'Hide Geofence' : 'Show Geofence'}
                  >
                    {g.visible ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, g)}
                    className="p-1 hover:text-rose-400 transition text-slate-400"
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
};
