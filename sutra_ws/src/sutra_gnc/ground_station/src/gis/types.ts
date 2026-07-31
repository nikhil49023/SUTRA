export type GISLayerType = 
  | 'TERRAIN_ELEVATION'
  | 'LINE_OF_SIGHT'
  | 'RF_COVERAGE'
  | 'NO_FLY_ZONES'
  | 'DYNAMIC_GEOFENCE'
  | 'POPULATION_DENSITY'
  | 'WEATHER_WIND_VECTORS'
  | 'INFRASTRUCTURE'
  | 'EMERGENCY_LANDING_ZONES'
  | 'AI_SEARCH_GRIDS'
  | 'THERMAL_HEATMAP';

export interface GISLayerConfig {
  id: string;
  name: string;
  type: GISLayerType;
  visible: boolean;
  opacity: number; // 0 to 1
  color: string;
}

export interface TerrainElevationPoint {
  lat: number;
  lng: number;
  elevationM: number;
  distanceFromStartKm: number;
}

export interface LineOfSightResult {
  hasClearLOS: boolean;
  obstructionPoint?: { lat: number; lng: number; elevationM: number };
  maxFresnelZoneClearanceM: number;
}

export interface RFSignalPrediction {
  rssiDbm: number;
  signalQualityPercent: number;
  isLinkEstablished: boolean;
  estimatedMarginDb: number;
}

export interface SearchGridCell {
  id: string;
  bounds: [number, number][]; // 4 corner coordinates
  center: [number, number];
  scanned: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}
