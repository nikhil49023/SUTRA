import { YOLOModelAdapter } from './modelAdapter';
import { TrackingEngine } from './trackingEngine';
import { AlertEngine } from './alertEngine';
import { PredictionEngine } from './predictionEngine';
import { ThreatAnalyzer } from './threatAnalyzer';
import { RecommendationEngine } from './recommendationEngine';
import { MissionAssistant } from './missionAssistant';
import type { InferenceResult } from './types';

export class MissionAIEngine {
  private static yoloAdapter: YOLOModelAdapter = new YOLOModelAdapter();
  private static trackingEngine: TrackingEngine = new TrackingEngine();
  private static alertEngine: AlertEngine = new AlertEngine();

  public static async runInferencePipeline(): Promise<InferenceResult[]> {
    const rawDetections = await this.yoloAdapter.predict(null);
    return this.trackingEngine.updateTracks(rawDetections);
  }

  public static evaluateThreats(detections: InferenceResult[]) {
    return ThreatAnalyzer.analyzeThreats(detections);
  }

  public static getRecommendations(detections: InferenceResult[]) {
    return RecommendationEngine.generateRecommendations(detections);
  }

  public static predictBattery(batteryPercent: number, volts: number, amps: number) {
    return PredictionEngine.predictBatteryDepletion(batteryPercent, volts, amps);
  }

  public static processQuery(query: string) {
    return MissionAssistant.processNaturalLanguageQuery(query);
  }

  public static generateDebrief(missionId?: string) {
    return MissionAssistant.generateMissionDebrief(missionId);
  }
}
