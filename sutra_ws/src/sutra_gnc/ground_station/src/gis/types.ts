/* ============================================================
   GIS Intelligence Engine Types & Data Schemas
   ============================================================ */

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

/* ============================================================
   Terrain Engine Schemas
   ============================================================ */

export interface DEMPoint {
  lat: number;
  lng: number;
  elevationM: number;
}

export interface TerrainProfilePoint {
  lat: number;
  lng: number;
  elevationM: number;
  distanceFromStartKm: number;
  droneAltMSLM: number;
  clearanceM: number;
  slopeDegrees: number;
}

export interface TerrainAnalysisSummary {
  minElevationM: number;
  maxElevationM: number;
  highestPoint: DEMPoint;
  lowestPoint: DEMPoint;
  avgSlopeDegrees: number;
  maxSlopeDegrees: number;
  terrainDifficultyIndex: 'EASY' | 'MODERATE' | 'CHALLENGING' | 'EXTREME';
}

/* ============================================================
   Line of Sight (LOS) Schemas
   ============================================================ */

export interface LineOfSightResult {
  hasClearLOS: boolean;
  distanceKm: number;
  obstructionPoint?: DEMPoint;
  maxFresnelZoneClearanceM: number;
  radioHorizonKm: number;
}

export interface VisibilityMapPoint {
  lat: number;
  lng: number;
  isVisible: boolean;
  elevationM: number;
}

/* ============================================================
   RF Coverage Schemas
   ============================================================ */

export interface RFSignalPrediction {
  rssiDbm: number; // e.g. -65 dBm
  signalQualityPercent: number; // 0-100%
  isLinkEstablished: boolean;
  estimatedMarginDb: number;
  isDeadZone: boolean;
}

export interface RFHeatmapCell {
  lat: number;
  lng: number;
  rssiDbm: number;
  qualityPercent: number;
  isDeadZone: boolean;
}

/* ============================================================
   Weather Engine Schemas
   ============================================================ */

export interface WeatherData {
  windSpeedMps: number;
  windDirectionDegrees: number;
  gustMps: number;
  temperatureC: number;
  rainProbabilityPercent: number;
  visibilityKm: number;
  cloudBaseM: number;
  updatedAt: string;
}

export interface WeatherSuitability {
  isSuitable: boolean;
  suitabilityScore: number; // 0 to 100
  alerts: string[];
  maxWindLimitMps: number;
}

/* ============================================================
   Search Grid Generator Schemas
   ============================================================ */

export type SearchPatternType =
  | 'GRID'
  | 'SPIRAL'
  | 'SECTOR'
  | 'LAWN_MOWER'
  | 'CORRIDOR'
  | 'EXPANDING_SQUARE';

export interface SearchGridCell {
  id: string;
  bounds: [number, number][]; // 4 corner coordinates
  center: [number, number];
  scanned: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface GeneratedSearchGrid {
  patternType: SearchPatternType;
  cells: SearchGridCell[];
  pathWaypoints: { lat: number; lng: number; alt: number }[];
  totalAreaKm2: number;
  estimatedSearchTimeMin: number;
}

/* ============================================================
   Spatial Analysis Schemas
   ============================================================ */

export interface EmergencyLandingZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevationM: number;
  distanceFromDroneKm: number;
  surfaceType: 'GRASS' | 'TARMAC' | 'OPEN_FIELD' | 'ROOFTOP';
  suitabilityScore: number; // 0-100
  isClear: boolean;
}

export interface SpatialMetrics {
  distanceKm: number;
  bearingDegrees: number;
  polygonAreaKm2: number;
  polygonAreaHa: number;
  routeLengthKm: number;
  populationDensityIndex: 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'URBAN_DENSE';
  nearestELZ?: EmergencyLandingZone;
}
