import type { AIDetection } from '../../types';
import { TargetTracker } from './TargetTracker';
import type { TrackedTarget } from '../types';

export class DetectionManager {
  public static processFrame(detections: AIDetection[]): TrackedTarget[] {
    return TargetTracker.processDetections(detections);
  }
}
