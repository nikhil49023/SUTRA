export interface ElevationSample {
  dist: number;
  elev: number;
  lat: number;
  lon: number;
}

export interface LOSVector {
  obs_lat: number;
  obs_lon: number;
  target_lat: number;
  target_lon: number;
  visible: boolean;
  min_clearance: number;
}

export interface RFGridPoint {
  lat: number;
  lon: number;
  dist: number;
  rx_power: number;
  status: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'NO_COVERAGE' | string;
}

export interface GISState {
  terrain_enabled: boolean;
  elevation_enabled: boolean;
  slope_enabled: boolean;
  los_enabled: boolean;
  rf_enabled: boolean;
  weather_enabled: boolean;
  grid_enabled: boolean;
  measurement_enabled: boolean;

  selected_analysis: 'ELEVATION' | 'LOS' | 'RF' | 'WEATHER' | 'SEARCH' | 'MEASUREMENT' | null;
  analysis_status: 'IDLE' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  analysis_progress: number;
  analysis_result?: Record<string, any> | null;
  analysis_error?: string | null;
  selected_source: string;

  measurement_start?: [number, number] | null;
  measurement_end?: [number, number] | null;
  measurement_polygon?: [number, number][];

  elevation_samples: ElevationSample[];
  los_vectors: LOSVector[];
  rf_grid_points: RFGridPoint[];
  search_grid_cells: Record<string, any>[];
  search_path_points: [number, number][];
}
