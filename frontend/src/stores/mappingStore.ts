/**
 * Smart Horizon GCS — Real-Time 2D Autonomous Mapping Store
 * Subsystem: 2D World Model & Multi-Drone SLAM (Subsystem D)
 * 
 * Manages the incremental 2D grid world model, semantic classifications,
 * exploration metrics (m² / km²), and projected AI survivor/hazard targets.
 */

import { create } from 'zustand';
import { commandManager } from '../communication/CommandManager';

export interface SemanticBreakdown {
  FREE?: number;
  BUILDING?: number;
  ROAD?: number;
  WATER_FLOOD?: number;
  OBSTACLE?: number;
  LANDING_ZONE?: number;
  SURVIVOR?: number;
  OCCUPIED?: number;
  UNKNOWN?: number;
  [key: string]: number | undefined;
}

export interface SurvivorPin {
  cell_id: string;
  latitude: number;
  longitude: number;
  confidence: number;
  observed_by: string[];
  last_observed: number;
  metadata?: any;
}

export interface MappingMetrics {
  total_cells: number;
  total_area_m2: number;
  total_area_km2: number;
  resolution_m: number;
  semantic_breakdown: SemanticBreakdown;
  survivors_located: number;
  last_update: number;
}

export interface MappingStoreState {
  // World Grid GeoJSON FeatureCollection
  gridGeoJson: GeoJSON.FeatureCollection;
  
  // High-level Metrics
  totalCells: number;
  exploredAreaM2: number;
  exploredAreaKm2: number;
  resolutionM: number;
  semanticBreakdown: SemanticBreakdown;
  survivorsLocated: number;
  survivorPins: SurvivorPin[];
  lastUpdate: number;
  isMappingActive: boolean;

  // Layer Toggles
  visibleSemantics: Record<string, boolean>;

  // Actions
  handleGridDelta: (delta: GeoJSON.FeatureCollection, metrics?: Partial<MappingMetrics>) => void;
  handleSnapshot: (snapshot: GeoJSON.FeatureCollection, metrics?: Partial<MappingMetrics>) => void;
  toggleSemanticVisibility: (semanticType: string) => void;
  setMappingActive: (active: boolean) => void;
  resetLocalMap: () => void;
  requestServerReset: () => void;
  fetchSnapshot: () => void;
}

export const useMappingStore = create<MappingStoreState>((set, get) => ({
  gridGeoJson: { type: 'FeatureCollection', features: [] },
  totalCells: 0,
  exploredAreaM2: 0,
  exploredAreaKm2: 0,
  resolutionM: 2.0,
  semanticBreakdown: {},
  survivorsLocated: 0,
  survivorPins: [],
  lastUpdate: Date.now() / 1000,
  isMappingActive: true,

  visibleSemantics: {
    FREE: true,
    BUILDING: true,
    ROAD: true,
    WATER_FLOOD: true,
    OBSTACLE: true,
    LANDING_ZONE: true,
    SURVIVOR: true,
    OCCUPIED: true,
  },

  handleGridDelta: (delta, metrics) => {
    if (!delta || !Array.isArray(delta.features) || delta.features.length === 0) {
      if (metrics) {
        set({
          totalCells: metrics.total_cells ?? get().totalCells,
          exploredAreaM2: metrics.total_area_m2 ?? get().exploredAreaM2,
          exploredAreaKm2: metrics.total_area_km2 ?? get().exploredAreaKm2,
          semanticBreakdown: metrics.semantic_breakdown ?? get().semanticBreakdown,
          survivorsLocated: metrics.survivors_located ?? get().survivorsLocated,
          lastUpdate: metrics.last_update ?? Date.now() / 1000,
        });
      }
      return;
    }

    const currentFeatures = [...get().gridGeoJson.features];
    const featureMap = new Map<string, GeoJSON.Feature>();

    // Index existing features by cell_id
    currentFeatures.forEach((f) => {
      const cellId = f.properties?.cell_id;
      if (cellId) featureMap.set(cellId, f);
    });

    // Merge in delta features
    delta.features.forEach((f) => {
      const cellId = f.properties?.cell_id;
      if (cellId) {
        featureMap.set(cellId, f);
      } else {
        featureMap.set(`gen_${Math.random()}`, f);
      }
    });

    const mergedFeatures = Array.from(featureMap.values());

    // Extract survivor pins
    const survivors: SurvivorPin[] = [];
    mergedFeatures.forEach((f) => {
      if (f.properties && f.properties.semantic_type === 'SURVIVOR') {
        const coords = (f.geometry as any)?.coordinates?.[0];
        if (coords && coords.length >= 4) {
          // Center of cell polygon
          const centerLon = (coords[0][0] + coords[2][0]) / 2;
          const centerLat = (coords[0][1] + coords[2][1]) / 2;
          survivors.push({
            cell_id: f.properties.cell_id || `cell_${centerLat}_${centerLon}`,
            latitude: centerLat,
            longitude: centerLon,
            confidence: f.properties.confidence || 0.9,
            observed_by: f.properties.observed_by || [],
            last_observed: f.properties.last_observed || Date.now() / 1000,
            metadata: f.properties.survivor_data,
          });
        }
      }
    });

    // Calculate updated breakdown if metrics not provided
    const breakdown: SemanticBreakdown = metrics?.semantic_breakdown || {};
    if (!metrics?.semantic_breakdown) {
      mergedFeatures.forEach((f) => {
        const st = f.properties?.semantic_type || 'FREE';
        breakdown[st] = (breakdown[st] || 0) + 1;
      });
    }

    const resM = metrics?.resolution_m || get().resolutionM;
    const totalC = mergedFeatures.length;
    const areaM2 = metrics?.total_area_m2 ?? totalC * (resM * resM);

    set({
      gridGeoJson: { type: 'FeatureCollection', features: mergedFeatures },
      totalCells: totalC,
      exploredAreaM2: areaM2,
      exploredAreaKm2: metrics?.total_area_km2 ?? +(areaM2 / 1000000).toFixed(4),
      resolutionM: resM,
      semanticBreakdown: breakdown,
      survivorsLocated: survivors.length,
      survivorPins: survivors,
      lastUpdate: metrics?.last_update ?? Date.now() / 1000,
    });
  },

  handleSnapshot: (snapshot, metrics) => {
    if (!snapshot || !Array.isArray(snapshot.features)) return;

    const survivors: SurvivorPin[] = [];
    const breakdown: SemanticBreakdown = metrics?.semantic_breakdown || {};

    snapshot.features.forEach((f) => {
      const st = f.properties?.semantic_type || 'FREE';
      if (!metrics?.semantic_breakdown) {
        breakdown[st] = (breakdown[st] || 0) + 1;
      }
      if (st === 'SURVIVOR' && f.properties) {
        const coords = (f.geometry as any)?.coordinates?.[0];
        if (coords && coords.length >= 4) {
          const centerLon = (coords[0][0] + coords[2][0]) / 2;
          const centerLat = (coords[0][1] + coords[2][1]) / 2;
          survivors.push({
            cell_id: f.properties.cell_id || `cell_${centerLat}_${centerLon}`,
            latitude: centerLat,
            longitude: centerLon,
            confidence: f.properties.confidence || 0.9,
            observed_by: f.properties.observed_by || [],
            last_observed: f.properties.last_observed || Date.now() / 1000,
          });
        }
      }
    });

    const resM = metrics?.resolution_m || (snapshot as any)?.properties?.resolution_m || 2.0;
    const totalC = snapshot.features.length;
    const areaM2 = metrics?.total_area_m2 ?? totalC * (resM * resM);

    set({
      gridGeoJson: snapshot,
      totalCells: totalC,
      exploredAreaM2: areaM2,
      exploredAreaKm2: metrics?.total_area_km2 ?? +(areaM2 / 1000000).toFixed(4),
      resolutionM: resM,
      semanticBreakdown: breakdown,
      survivorsLocated: survivors.length,
      survivorPins: survivors,
      lastUpdate: metrics?.last_update ?? Date.now() / 1000,
    });
  },

  toggleSemanticVisibility: (semanticType: string) => {
    const current = get().visibleSemantics;
    set({
      visibleSemantics: {
        ...current,
        [semanticType]: !current[semanticType],
      },
    });
  },

  setMappingActive: (active: boolean) => set({ isMappingActive: active }),

  resetLocalMap: () => {
    set({
      gridGeoJson: { type: 'FeatureCollection', features: [] },
      totalCells: 0,
      exploredAreaM2: 0,
      exploredAreaKm2: 0,
      semanticBreakdown: {},
      survivorsLocated: 0,
      survivorPins: [],
      lastUpdate: Date.now() / 1000,
    });
  },

  requestServerReset: () => {
    get().resetLocalMap();
    commandManager.sendCommand('mapping.reset', {});
  },

  fetchSnapshot: () => {
    commandManager.sendCommand('mapping.get_snapshot', {}, {
      onAck: (ack) => {
        if (ack.result?.snapshot) {
          get().handleSnapshot(ack.result.snapshot, ack.result.metrics);
        }
      },
    });
  },
}));
