import type { InferenceResult, ThreatLevel } from './types';

export interface ThreatAnalysisResult {
  overallThreatScore: number; // 0 to 100
  highestThreatLevel: ThreatLevel;
  activeThreatCount: number;
  threatDetails: { id: string; label: string; score: number; location: string }[];
}

export class ThreatAnalyzer {
  /**
   * Analyzes computer vision detections and calculates overall sector threat index
   */
  static analyzeThreats(detections: InferenceResult[]): ThreatAnalysisResult {
    let maxScore = 0;
    let highestThreatLevel: ThreatLevel = 'LOW';
    const threatDetails: { id: string; label: string; score: number; location: string }[] = [];

    detections.forEach((d) => {
      const score = d.class === 'FIRE' ? 95 : d.class === 'VEHICLE' && d.threatLevel === 'HIGH' ? 88 : 45;
      if (score > maxScore) {
        maxScore = score;
        highestThreatLevel = d.threatLevel;
      }
      threatDetails.push({
        id: d.id,
        label: d.label,
        score,
        location: `${d.gpsCoordinates.lat} N, ${d.gpsCoordinates.lng} E`
      });
    });

    return {
      overallThreatScore: maxScore,
      highestThreatLevel,
      activeThreatCount: detections.length,
      threatDetails
    };
  }
}
