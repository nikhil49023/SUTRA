import type { GISLayerConfig, GISLayerType } from './types';

export class LayerManager {
  private layers: Map<GISLayerType, GISLayerConfig> = new Map();

  constructor() {
    this.initDefaultLayers();
  }

  private initDefaultLayers() {
    const defaults: GISLayerConfig[] = [
      { id: 'LAY-01', name: 'Terrain Elevation DEM', type: 'TERRAIN_ELEVATION', visible: true, opacity: 0.8, color: '#38bdf8' },
      { id: 'LAY-02', name: 'Line-of-Sight Coverage', type: 'LINE_OF_SIGHT', visible: true, opacity: 0.7, color: '#00e676' },
      { id: 'LAY-03', name: 'RF Signal Coverage Heatmap', type: 'RF_COVERAGE', visible: true, opacity: 0.6, color: '#00f0ff' },
      { id: 'LAY-04', name: 'No-Fly Zones (NFZ)', type: 'NO_FLY_ZONES', visible: true, opacity: 0.8, color: '#ff3b30' },
      { id: 'LAY-05', name: 'Dynamic Geofence Perimeter', type: 'DYNAMIC_GEOFENCE', visible: true, opacity: 0.9, color: '#ffb700' },
      { id: 'LAY-06', name: 'Population Density Matrix', type: 'POPULATION_DENSITY', visible: false, opacity: 0.5, color: '#a855f7' },
      { id: 'LAY-07', name: 'Wind Vector Field Overlay', type: 'WEATHER_WIND_VECTORS', visible: true, opacity: 0.75, color: '#60a5fa' },
      { id: 'LAY-08', name: 'Emergency Landing Zones', type: 'EMERGENCY_LANDING_ZONES', visible: true, opacity: 0.9, color: '#10b981' },
      { id: 'LAY-09', name: 'AI Search Grid (SAR)', type: 'AI_SEARCH_GRIDS', visible: true, opacity: 0.85, color: '#c084fc' }
    ];

    defaults.forEach((l) => this.layers.set(l.type, l));
  }

  public getLayers(): GISLayerConfig[] {
    return Array.from(this.layers.values());
  }

  public toggleLayer(type: GISLayerType): boolean {
    const layer = this.layers.get(type);
    if (layer) {
      layer.visible = !layer.visible;
      return layer.visible;
    }
    return false;
  }

  public setOpacity(type: GISLayerType, opacity: number) {
    const layer = this.layers.get(type);
    if (layer) layer.opacity = Math.max(0, Math.min(1, opacity));
  }
}
