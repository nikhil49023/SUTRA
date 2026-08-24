import { create } from 'zustand';
import { ElevationSample, GISState, LOSVector } from '../types/gis';

interface GISStoreState extends GISState {
  toggleOverlay: (key: keyof GISState) => void;
  setElevationSamples: (samples: ElevationSample[]) => void;
  setLosVectors: (vectors: LOSVector[]) => void;
  clearAnalysis: () => void;
  hydrateFromSnapshot: (state: Partial<GISState>) => void;
  updateFromEvent: (topic: string, payload: any) => void;
}

export const useGISStore = create<GISStoreState>((set) => ({
  terrain_enabled: true,
  elevation_enabled: true,
  slope_enabled: false,
  los_enabled: true,
  rf_enabled: false,
  weather_enabled: true,
  grid_enabled: false,
  measurement_enabled: false,
  selected_analysis: null,
  analysis_status: 'IDLE',
  analysis_progress: 0,
  selected_source: 'DEM_SRTM',
  elevation_samples: [
    { dist: 0, elev: 12.5, lat: 37.7749, lon: -122.4194 },
    { dist: 100, elev: 15.2, lat: 37.7755, lon: -122.4188 },
    { dist: 250, elev: 28.4, lat: 37.7765, lon: -122.4178 },
    { dist: 400, elev: 35.1, lat: 37.7775, lon: -122.4168 },
    { dist: 600, elev: 18.0, lat: 37.7788, lon: -122.4158 },
  ],
  los_vectors: [
    {
      obs_lat: 37.774929,
      obs_lon: -122.419416,
      target_lat: 37.778,
      target_lon: -122.4165,
      visible: true,
      min_clearance: 8.4,
    },
  ],
  rf_grid_points: [],
  search_grid_cells: [],
  search_path_points: [],

  toggleOverlay: (key) => set((s) => ({ [key]: !s[key] })),
  setElevationSamples: (elevation_samples) => set({ elevation_samples }),
  setLosVectors: (los_vectors) => set({ los_vectors }),
  clearAnalysis: () =>
    set({
      elevation_samples: [],
      los_vectors: [],
      search_path_points: [],
    }),
  hydrateFromSnapshot: (state) => set((s) => ({ ...s, ...state })),
  updateFromEvent: (topic, payload) => set((s) => ({ ...s, ...payload })),
}));
