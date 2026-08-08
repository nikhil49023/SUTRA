import { DEMEngine } from './terrain/demEngine';
import { TerrainProfileEngine } from './terrain/terrainProfile';
import { SlopeAnalyzer } from './terrain/slopeAnalyzer';
import { GroundClearanceEngine } from './terrain/groundClearance';
import { LineOfSightEngine } from './los/lineOfSightEngine';
import { RadioHorizonEngine } from './los/radioHorizon';
import { RFCoveragePredictor } from './rf/rfCoveragePredictor';
import { CoverageHeatmapEngine } from './rf/coverageHeatmap';
import { WeatherEngine } from './weather/weatherEngine';
import { WeatherAlertsEngine } from './weather/weatherAlerts';
import { SearchGridGenerator } from './search/searchGridGenerator';
import { SpatialAnalyticsEngine } from './spatial/spatialAnalytics';
import { ELZDetectorEngine } from './spatial/elzDetector';
import { PopulationDensityEngine } from './spatial/populationDensity';

import type { 
  TerrainAnalysisSummary, 
  TerrainProfilePoint, 
  LineOfSightResult, 
  RFSignalPrediction, 
  WeatherData, 
  WeatherSuitability,
  GeneratedSearchGrid,
  SearchPatternType,
  EmergencyLandingZone
} from './types';

export class GISIntelligenceService {
  /**
   * Complete Environmental & Tactical GIS Spatial Audit.
   */
  public static runFullSpatialAudit(
    dronePos: { lat: number; lng: number; altAGLM: number },
    gcsPos: { lat: number; lng: number; altAGLM?: number },
    waypoints: { lat: number; lng: number; alt: number }[]
  ) {
    const terrainProfile = TerrainProfileEngine.generateProfile(waypoints);
    const terrainSummary = TerrainProfileEngine.analyzeSummary(terrainProfile);
    const clearance = GroundClearanceEngine.evaluateClearance(dronePos.lat, dronePos.lng, dronePos.altAGLM);

    const los = LineOfSightEngine.calculateLOS(
      { lat: gcsPos.lat, lng: gcsPos.lng, altMSLM: DEMEngine.getElevation(gcsPos.lat, gcsPos.lng) + (gcsPos.altAGLM || 10) },
      { lat: dronePos.lat, lng: dronePos.lng, altMSLM: DEMEngine.getElevation(dronePos.lat, dronePos.lng) + dronePos.altAGLM }
    );

    const rf = RFCoveragePredictor.predictSignal(gcsPos, dronePos);
    const weather = WeatherEngine.getCurrentWeather();
    const weatherSuitability = WeatherAlertsEngine.evaluateSuitability(weather);
    const nearestELZ = ELZDetectorEngine.findNearestELZ(dronePos.lat, dronePos.lng);
    const routeLengthKm = SpatialAnalyticsEngine.calculateRouteLengthKm(waypoints);
    const popDensity = PopulationDensityEngine.evaluateDensity(dronePos.lat, dronePos.lng);

    return {
      terrainSummary,
      terrainProfile,
      clearance,
      los,
      rf,
      weather,
      weatherSuitability,
      nearestELZ,
      routeLengthKm,
      popDensity
    };
  }
}
