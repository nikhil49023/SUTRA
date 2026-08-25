/**
 * Geofence Debug Panel — Developer Diagnostic Overlay
 * Shows stored count, visible count, rendered count, sources, layers, selected, sync status.
 * Toggle visibility with Ctrl+Shift+G.
 */
import React, { useEffect, useState } from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { mapPersistence } from '../map/MapPersistence';

export const GeofenceDebugPanel: React.FC = () => {
  const { geofences, selected_geofence_id } = useGeofenceStore();
  const { selected_type, selected_id } = useSelectionStore();
  const [visible, setVisible] = useState(false);
  const [layerInfo, setLayerInfo] = useState({ sources: 0, layers: 0, styleLoaded: false });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'G') setVisible((v) => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const map = mapPersistence.getMap();
    if (!map) return;
    const sources = map.getStyle()?.sources ?? {};
    const layers = map.getStyle()?.layers ?? [];
    const gfLayers = layers.filter(
      (l: any) => l.id?.startsWith('geofence') || l.id?.startsWith('geofences')
    );
    setLayerInfo({
      sources: Object.keys(sources).filter((k) => k.startsWith('geofence')).length,
      layers: gfLayers.length,
      styleLoaded: !!map.isStyleLoaded(),
    });

  }, [visible, geofences]);

  if (!visible) {
    return (
      <div className="absolute bottom-2 right-2 z-50">
        <button
          onClick={() => setVisible(true)}
          className="text-[9px] font-mono text-[#3A4856] hover:text-[#5B8FB9] transition px-1"
          title="Ctrl+Shift+G — Geofence Debug Panel"
        >
          GF-DBG
        </button>
      </div>
    );
  }

  const visibleCount = geofences.filter((g) => g.visible !== false).length;
  const renderedCount = geofences.filter(
    (g) => g.visible !== false && g.coordinates && g.coordinates.length >= 3
  ).length;
  const selectedGf =
    selected_type === 'GEOFENCE' ? geofences.find((g) => g.id === selected_id) : null;

  const synced = visibleCount === renderedCount;

  return (
    <div className="absolute bottom-2 right-2 z-50 bg-[#0B0F14]/95 border border-[#2B3743] rounded p-2 font-mono text-[10px] text-[#A9B3BD] min-w-[180px] shadow-xl">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-bold text-[#5B8FB9]">GEOFENCE DEBUG</span>
        <button onClick={() => setVisible(false)} className="text-[#6B7A8D] hover:text-[#E7EBEF] ml-2">×</button>
      </div>
      <div className="space-y-0.5">
        <Row label="Stored" value={geofences.length} />
        <Row label="Visible" value={visibleCount} />
        <Row label="Renderable" value={renderedCount} color={renderedCount === 0 ? '#C75A5A' : '#4F9A72'} />
        <Row label="Sources" value={layerInfo.sources} />
        <Row label="Layers" value={layerInfo.layers} color={layerInfo.layers >= 3 ? '#4F9A72' : '#C75A5A'} />
        <Row label="Selected" value={selectedGf ? selectedGf.name.slice(0, 16) : 'none'} />
        <Row label="Map style" value={layerInfo.styleLoaded ? 'loaded' : 'loading'} color={layerInfo.styleLoaded ? '#4F9A72' : '#C49A4A'} />
        <Row
          label="Status"
          value={synced ? 'SYNCED' : 'MISMATCH'}
          color={synced ? '#4F9A72' : '#C75A5A'}
        />
      </div>
      <div className="mt-2 text-[9px] text-[#3A4856]">Ctrl+Shift+G to toggle</div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: any; color?: string }> = ({ label, value, color }) => (
  <div className="flex justify-between">
    <span className="text-[#6B7A8D]">{label}:</span>
    <span className="font-bold" style={color ? { color } : undefined}>{String(value)}</span>
  </div>
);
