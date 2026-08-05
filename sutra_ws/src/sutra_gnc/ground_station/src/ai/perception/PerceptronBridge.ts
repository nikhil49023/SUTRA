import { GpsRaycaster, type ProjectedTargetWGS84, type BoundingBox2D } from './GpsRaycaster';
import { aiStream } from '../../communication/streams/AIStream';
import { eventBus } from '../../services/eventBus';

type DetectionListener = (targets: ProjectedTargetWGS84[]) => void;

export class PerceptronBridge {
  private static instance: PerceptronBridge;
  private activeTargets: Map<string, ProjectedTargetWGS84> = new Map();
  private listeners: Set<DetectionListener> = new Set();
  private isStreamActive: boolean = false;
  private timer: number | null = null;

  private constructor() {
    this.initStream();
  }

  public static getInstance(): PerceptronBridge {
    if (!PerceptronBridge.instance) {
      PerceptronBridge.instance = new PerceptronBridge();
    }
    return PerceptronBridge.instance;
  }

  private initStream(): void {
    aiStream.subscribe((payload) => {
      if (Array.isArray(payload)) {
        this.processRawDetections(payload);
      }
    });

    // Start Subsystem C YOLOv8 Perception Simulation Stream at 5Hz
    this.startPerceptionSimulation();
  }

  public startPerceptionSimulation(): void {
    if (this.timer !== null) return;
    this.isStreamActive = true;

    this.timer = window.setInterval(() => {
      // Mock 2D AI Camera Bounding Boxes
      const sampleBoxes: BoundingBox2D[] = [
        { x: 0.52, y: 0.48, width: 0.08, height: 0.12, label: 'SURVIVOR (HUMAN)', confidence: 0.94 },
        { x: 0.35, y: 0.60, width: 0.15, height: 0.18, label: 'VEHICLE (TRUCK)', confidence: 0.88 },
        { x: 0.70, y: 0.30, width: 0.10, height: 0.10, label: 'HAZARD (FIRE)', confidence: 0.91 }
      ];

      const dronePos = { lat: 45.1082, lng: 34.5225, alt: 100, heading: 45 };

      const projected = sampleBoxes.map((box) => GpsRaycaster.raycastToWgs84(box, dronePos));

      projected.forEach((target) => {
        this.activeTargets.set(target.targetId, target);
      });

      this.notify();
      eventBus.emit('AI_TARGETS_UPDATED' as any, this.getActiveTargets());
    }, 2000);
  }

  public processRawDetections(boxes: BoundingBox2D[], dronePos = { lat: 45.1082, lng: 34.5225, alt: 100, heading: 45 }): ProjectedTargetWGS84[] {
    const projected = boxes.map((box) => GpsRaycaster.raycastToWgs84(box, dronePos));
    projected.forEach((target) => {
      this.activeTargets.set(target.targetId, target);
    });
    this.notify();
    return projected;
  }

  public getActiveTargets(): ProjectedTargetWGS84[] {
    return Array.from(this.activeTargets.values());
  }

  public subscribe(listener: DetectionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const list = this.getActiveTargets();
    this.listeners.forEach((l) => l(list));
  }
}

export const perceptronBridge = PerceptronBridge.getInstance();
