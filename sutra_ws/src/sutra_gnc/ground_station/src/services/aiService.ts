export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AIDetectionItem {
  id: string;
  class: string;
  category: 'VEHICLE' | 'PERSONNEL' | 'STRUCTURE' | 'AIRCRAFT' | 'THERMAL_HOTSPOT';
  confidence: number; // e.g. 96.4
  threatLevel: ThreatLevel;
  coordinates: { lat: number; lng: number };
  bbox: { x: number; y: number; width: number; height: number };
  timestamp: string;
  status: 'ACTIVE' | 'TRACKED' | 'DISMISSED';
  sensorSource: 'EO_OPTICAL' | 'IR_THERMAL';
}

export interface AISearchZone {
  id: string;
  name: string;
  sector: string;
  coveragePercent: number;
  targetsFoundCount: number;
  polygon: [number, number][];
}

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'TACTICAL' | 'SAFETY' | 'NAVIGATION' | 'BATTERY';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  actionCommand?: string;
  timestamp: string;
}

export interface AIMessage {
  id: string;
  sender: 'USER' | 'AI_ASSISTANT';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
}

export class AIService {
  private apiEndpoint: string;

  constructor(apiEndpoint: string = 'http://localhost:8000/api/v1/ai') {
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Process Natural Language Command (Ready for FastAPI + LLM backend)
   */
  public async processNaturalLanguageQuery(query: string): Promise<AIMessage> {
    const lower = query.toLowerCase();
    let reply = `I have received your command: "${query}". Analyzing telemetry and mission coordinates...`;
    let actions: string[] = [];

    if (lower.includes('search') || lower.includes('sector')) {
      reply = `Search pattern initiated for Sector 4-B. AI visual sensors are actively scanning for thermal signatures and armored vehicles.`;
      actions = ['Expand Search Radius', 'Switch Sensor to IR Thermal', 'Set Altitude 500m AGL'];
    } else if (lower.includes('battery') || lower.includes('rth') || lower.includes('return')) {
      reply = `Battery status is 84% (24.4V). Estimated flight time remaining is 42 minutes. Return to Launch (RTH) window is nominal.`;
      actions = ['Trigger RTH Now', 'Set Economy Speed 45km/h'];
    } else if (lower.includes('track') || lower.includes('target')) {
      reply = `Target locking engaged on DET-001 (Armored Convoy Vehicle). Gimbal optical tracker locked at 96.4% confidence.`;
      actions = ['Overlay AI Bounding Box', 'Stream HD Video to Command'];
    } else {
      reply = `Understood. Processing tactical query against current mission flight plan and GIS spatial overlays. No threats detected in immediate 2km radius.`;
      actions = ['Run Sector Scan', 'Check System Diagnostics'];
    }

    return {
      id: `MSG-${Date.now()}`,
      sender: 'AI_ASSISTANT',
      text: reply,
      timestamp: new Date().toTimeString().split(' ')[0],
      suggestedActions: actions
    };
  }
}
