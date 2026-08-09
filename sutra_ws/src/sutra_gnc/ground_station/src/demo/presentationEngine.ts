import { eventBus } from '../services/eventBus';

export interface PresentationStep {
  stepIndex: number;
  title: string;
  subtitle: string;
  targetNavTab: 'DASHBOARD' | 'LIVE_OPERATIONS' | 'AI_INTELLIGENCE' | 'ANALYTICS';
  description: string;
}

export class PresentationEngine {
  private static instance: PresentationEngine;
  private currentStepIdx: number = 0;
  private isPresentationActive: boolean = false;

  private steps: PresentationStep[] = [
    {
      stepIndex: 1,
      title: '1. GIS MAP & SPATIAL MISSION PLANNING',
      subtitle: '60% Screen Centerpiece Map',
      targetNavTab: 'DASHBOARD',
      description: 'Features interactive 3D map tile rendering, Turf.js spatial distance/area measurement, geofence polygons, and MAVLink .plan export.'
    },
    {
      stepIndex: 2,
      title: '2. LIVE OPERATIONS CENTER & PFD HUD',
      subtitle: 'Real-Time MAVLink Telemetry Stream',
      targetNavTab: 'LIVE_OPERATIONS',
      description: 'Primary Flight Display artificial horizon, air data matrix, 6S LiPo power harness, and flight mode command selector.'
    },
    {
      stepIndex: 3,
      title: '3. AI INTELLIGENCE & THREAT TRACKING',
      subtitle: 'YOLOv8 Target Detection & LLM Assistant',
      targetNavTab: 'AI_INTELLIGENCE',
      description: 'Computer vision target classification (Wildfire, Armored Convoy, Personnel), 2D-to-3D GPS projection, and Natural Language Assistant.'
    },
    {
      stepIndex: 4,
      title: '4. ANALYTICS & TELEMETRY REPLAY',
      subtitle: 'Flight Archive & Telemetry Scrubber',
      targetNavTab: 'ANALYTICS',
      description: 'Recharts degradation graphs, CSV log exporter, side-by-side mission comparisons, and frame-by-frame replay scrubber.'
    }
  ];

  private constructor() {}

  public static getInstance(): PresentationEngine {
    if (!PresentationEngine.instance) {
      PresentationEngine.instance = new PresentationEngine();
    }
    return PresentationEngine.instance;
  }

  public startPresentation(): PresentationStep {
    this.isPresentationActive = true;
    this.currentStepIdx = 0;
    this.emitStepEvent();
    return this.steps[0];
  }

  public nextStep(): PresentationStep | null {
    if (this.currentStepIdx < this.steps.length - 1) {
      this.currentStepIdx++;
      this.emitStepEvent();
      return this.steps[this.currentStepIdx];
    }
    return null;
  }

  public previousStep(): PresentationStep | null {
    if (this.currentStepIdx > 0) {
      this.currentStepIdx--;
      this.emitStepEvent();
      return this.steps[this.currentStepIdx];
    }
    return null;
  }

  public stopPresentation(): void {
    this.isPresentationActive = false;
  }

  private emitStepEvent() {
    const currentStep = this.steps[this.currentStepIdx];
    eventBus.emit('SYSTEM_ALERT', {
      title: currentStep.title,
      message: currentStep.description
    });
  }

  public getCurrentStep(): PresentationStep {
    return this.steps[this.currentStepIdx];
  }

  public isActive(): boolean {
    return this.isPresentationActive;
  }
}

export const presentationEngine = PresentationEngine.getInstance();
