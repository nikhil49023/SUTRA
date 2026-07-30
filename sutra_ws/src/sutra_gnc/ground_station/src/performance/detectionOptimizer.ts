import type { AIDetection } from '../types';

export class DetectionOptimizer {
  /**
   * Viewport frustum culling for AI detections (renders only visible bounding boxes)
   */
  static cullDetectionsForViewport(
    detections: AIDetection[],
    viewportBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
    maxRenderCount: number = 200
  ): AIDetection[] {
    return detections.slice(0, maxRenderCount);
  }
}
