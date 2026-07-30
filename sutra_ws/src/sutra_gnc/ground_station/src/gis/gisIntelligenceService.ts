import { TerrainService } from './terrainService';
import { SpatialAnalysisEngine } from './spatialAnalysisEngine';
import { LayerManager } from './layerManager';
import { OverlayManager } from './overlayManager';
import type { TerrainElevationPoint, LineOfSightResult, RFSignalPrediction, SearchGridCell } from './types';

export class GISIntelligenceService {
  private static layerManager: LayerManager = new LayerManager();

  public static getLayerManager(): LayerManager {
    return this.layerManager;
  }

  public static getTerrainProfile(start: [number, number], end: [number, number]): TerrainElevationPoint[] {
    return TerrainService.getTerrainProfile(start, end);
  }

  public static calculateLineOfSight(gcsPos: any, dronePos: any): LineOfSightResult {
    return SpatialAnalysisEngine.calculateLineOfSight(gcsPos, dronePos);
  }

  public static predictRFSignal(distanceKm: number): RFSignalPrediction {
    return SpatialAnalysisEngine.predictRFSignal(distanceKm);
  }

  public static generateAISearchGrid(lat: number, lng: number): SearchGridCell[] {
    return SpatialAnalysisEngine.generateAISearchGrid(lat, lng);
  }

  public static getEmergencyLandingZones() {
    return OverlayManager.getEmergencyLandingZones();
  }

  public static getWindVectorField() {
    return OverlayManager.getWindVectorField();
  }
}
