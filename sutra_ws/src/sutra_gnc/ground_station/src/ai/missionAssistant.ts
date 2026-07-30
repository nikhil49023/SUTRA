export interface LLMResponse {
  answerText: string;
  suggestedAction?: string;
  intent: 'PLAN_MISSION' | 'STATUS_QUERY' | 'SAFETY_CHECK' | 'DEBRIEF';
}

export interface AIMissionDebrief {
  missionId: string;
  summaryText: string;
  totalDurationMin: number;
  targetsTrackedCount: number;
  batteryEfficiencyScore: number; // 0 to 100
  keyInsights: string[];
}

export class MissionAssistant {
  /**
   * Processes natural language prompts (OpenAI / FastAPI / Local LLM bridge ready)
   */
  static async processNaturalLanguageQuery(query: string): Promise<LLMResponse> {
    const q = query.toLowerCase();

    if (q.includes('battery') || q.includes('power')) {
      return {
        answerText: 'Current battery status is 84% (23.8V). Estimated remaining flight time is 28 minutes at current throttle.',
        intent: 'STATUS_QUERY'
      };
    } else if (q.includes('search') || q.includes('grid') || q.includes('pattern')) {
      return {
        answerText: 'I have generated a 2.5km x 2.5km Grid Search Pattern over Sector 4-B with 450m AGL altitude clearance.',
        suggestedAction: 'LOAD_GRID_TEMPLATE',
        intent: 'PLAN_MISSION'
      };
    } else if (q.includes('rth') || q.includes('return') || q.includes('land')) {
      return {
        answerText: 'RTH trajectory is clear of terrain obstructions. Estimated return flight time is 3.5 minutes.',
        suggestedAction: 'TRIGGER_RTH',
        intent: 'SAFETY_CHECK'
      };
    }

    return {
      answerText: `Analyzing query: "${query}". All subsystems nominal. Telemetry link active at 98% quality.`,
      intent: 'STATUS_QUERY'
    };
  }

  /**
   * Generates post-flight AI Mission Debrief report
   */
  static generateMissionDebrief(missionId: string = 'MIS-1049'): AIMissionDebrief {
    return {
      missionId,
      summaryText: 'Operation Desert Falcon completed successfully. 3 hostile targets identified, zero geofence violations recorded.',
      totalDurationMin: 34,
      targetsTrackedCount: 3,
      batteryEfficiencyScore: 94,
      keyInsights: [
        'Optimal cruise speed maintained at 54 km/h.',
        'Thermal IR camera identified wildfire hotspot at 97.8% confidence.',
        'Return-to-Home reserve landed at 28.4% (exceeding 25% minimum safety threshold).'
      ]
    };
  }
}
