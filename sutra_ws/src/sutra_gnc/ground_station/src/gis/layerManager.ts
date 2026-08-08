import type { GISLayerConfig, GISLayerType } from './types';

export class GISLayerManager {
  private static layers: Map<GISLayerType, GISLayerConfig> = new Map([
    ['TERRAIN_ELEVATION', { id: 'layer-terrain', name: 'Terrain DEM', type: 'TERRAIN_ELEVATION', visible: true, opacity: 0.75, color: '#38bdf8' }],
    ['LINE_OF_SIGHT', { id: 'layer-los', name: 'Line of Sight (LOS)', type: 'LINE_OF_SIGHT', visible: true, opacity: 0.8, color: '#10b981' }],
    ['RF_COVERAGE', { id: 'layer-rf', name: 'RF Signal Coverage', type: 'RF_COVERAGE', visible: true, opacity: 0.65, color: '#6366f1' }],
    ['NO_FLY_ZONES', { id: 'layer-nofly', name: 'No-Fly Geofences', type: 'NO_FLY_ZONES', visible: true, opacity: 0.85, color: '#ef4444' }],
    ['WEATHER_WIND_VECTORS', { id: 'layer-weather', name: 'Weather Wind Vectors', type: 'WEATHER_WIND_VECTORS', visible: false, opacity: 0.7, color: '#f59e0b' }],
    ['EMERGENCY_LANDING_ZONES', { id: 'layer-[#0b1428]', name: 'Emergency Landing Zones', type: 'EMERGENCY_LANDING_ZONES', visible: true, opacity: 0.9, color: '#ec4899' }],
    ['AI_SEARCH_GRIDS', { id: 'layer-search', name: 'AI Search Grid', type: 'AI_SEARCH_GRIDS', visible: false, opacity: 0.8, color: '#06b6d4' }],
    ['THERMAL_HEATMAP', { id: 'layer-thermal', name: 'Thermal Heatmap', type: 'THERMAL_HEATMAP', visible: false, opacity: 0.6, color: '#f97316' }]
  ]);

  public static getLayers(): GISLayerConfig[] {
    return Array.from(this.layers.values());
  }

  public static toggleLayer(type: GISLayerType, visible?: boolean): void {
    const layer = this.layers.get(type);
    if (layer) {
      layer.visible = visible !== undefined ? visible : !layer.visible;
    }
  }

  public static setLayerOpacity(type: GISLayerType, opacity: number): void {
    const layer = this.layers.get(type);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
    }
  }
}
