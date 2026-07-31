import type { IInferenceModel, InferenceResult, BoundingBox } from './types';
import { GPSMapper } from './gpsMapper';

export class YOLOModelAdapter implements IInferenceModel {
  public modelName: string = 'YOLOv8-Tactical-ONNX';
  public modelVersion: string = 'v8.4.2-CUDA';
  private isModelLoaded: boolean = false;

  public async loadModel(): Promise<boolean> {
    // Simulated model loading
    this.isModelLoaded = true;
    return true;
  }

  public async predict(frameData: any): Promise<InferenceResult[]> {
    if (!this.isModelLoaded) await this.loadModel();
    return this.generateMockInference();
  }

  private generateMockInference(): InferenceResult[] {
    const dronePos = { lat: 34.5225, lng: 45.1082, altitude: 450 };
    const now = new Date();

    const mockDetections: { trackId: number; class: any; label: string; confidence: number; threat: any; bbox: BoundingBox; sensor: any }[] = [
      {
        trackId: 101,
        class: 'FIRE',
        label: 'Active Wildfire Hotspot',
        confidence: 97.8,
        threat: 'CRITICAL',
        bbox: { x: 30, y: 35, width: 22, height: 28 },
        sensor: 'IR_THERMAL'
      },
      {
        trackId: 102,
        class: 'VEHICLE',
        label: 'Armored Convoy Unit',
        confidence: 95.4,
        threat: 'HIGH',
        bbox: { x: 62, y: 48, width: 18, height: 24 },
        sensor: 'EO_OPTICAL'
      },
      {
        trackId: 103,
        class: 'HUMAN',
        label: 'Thermal Personnel Signature',
        confidence: 91.2,
        threat: 'MEDIUM',
        bbox: { x: 15, y: 60, width: 10, height: 14 },
        sensor: 'IR_THERMAL'
      }
    ];

    return mockDetections.map((d) => ({
      id: `INF-${d.trackId}-${now.getTime()}`,
      trackId: d.trackId,
      class: d.class,
      label: d.label,
      confidence: d.confidence,
      threatLevel: d.threat,
      bbox: d.bbox,
      gpsCoordinates: GPSMapper.projectPixelToGPS(d.bbox, dronePos),
      velocityVector: { vx: 0, vy: 0, speedKmh: 0 },
      timestamp: now.toTimeString().split(' ')[0],
      sensorType: d.sensor
    }));
  }
}
